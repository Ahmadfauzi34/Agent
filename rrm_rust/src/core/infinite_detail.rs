use std::sync::{Arc, RwLock};
use std::collections::HashMap;
use ndarray::Array1;
use lru::LruCache;
use std::num::NonZeroUsize;

use crate::core::config::{GLOBAL_DIMENSION, MAX_ENTITIES};

/// =============================================================================
/// INFINITE DETAIL FIELD - Hierarkis Fraktal dengan Lazy Evaluation
/// Makro (Coarse) -> Meso (Intermediate) -> Mikro (Fine/Pixel)
/// Zero-Copy: CoW (Copy-on-Write) antar level, minim clone
/// =============================================================================
pub struct InfiniteDetailField {
    /// Level 0: Makro (selalu ada di memori, lightweight)
    pub coarse: MacroLevel,

    /// Level 1 & 2: Detail muncul on-demand (lazy), cached, bounded
    pub detail_cache: RwLock<DetailCache>,

    /// Generator: Bisa membuat detail lebih halus dari coarse
    pub detail_generator: Arc<dyn DetailGenerator>,

    /// Max depth untuk mencegah infinite recursion (safety)
    pub max_depth: u8,

    /// CoW State: Shared ownership antar level (Arc pointer ke data)
    pub shared_base: Arc<CoarseData>,
}

#[derive(Clone)]
pub struct MacroLevel {
    pub regions: Vec<MacroRegion>, // SOA: min_x, max_x, min_y, max_y (f32)
    pub dominant_signatures: Vec<Array1<f32>>,
    pub complexity_map: Vec<f32>,
    pub region_active: Vec<bool>,
}

#[derive(Clone)]
pub struct MacroRegion {
    pub id: u32,
    pub bounds: (f32, f32, f32, f32), // (min_x, max_x, min_y, max_y)
    pub center_of_mass: (f32, f32),
    pub dominant_color: i32,
    pub entity_count: u32,
    pub needs_fine_detail: bool,
}

#[derive(Clone)]
pub struct MesoLevel {
    pub parent_region_id: u32,
    pub sub_regions: Vec<MesoRegion>,
    pub spatial_fields: HashMap<u32, Array1<f32>>,
    pub amplitudes: Vec<f32>,
    pub virtual_to_sparse: HashMap<usize, usize>,
}

#[derive(Clone)]
pub struct MesoRegion {
    pub local_idx: u32,
    pub parent_idx: u32,
    pub relative_bounds: (f32, f32, f32, f32),
    pub refinement_score: f32,
    pub entity_refs: Vec<VirtualEntityRef>,
}

#[derive(Clone)]
pub struct VirtualEntityRef {
    pub macro_parent: u32,
    pub meso_local: Option<u32>,
    pub micro_local: Option<u32>,
    pub amplitude: f32,
    pub phase: f32,
}

#[derive(Clone)]
pub struct MicroLevel {
    pub parent_meso_id: (u32, u32),

    // SOA layout untuk SIMD
    pub pixel_x: Vec<f32>,
    pub pixel_y: Vec<f32>,
    pub pixel_color: Vec<i32>,
    pub pixel_mass: Vec<f32>,

    pub spatial_tensors: HashMap<usize, Array1<f32>>,
    pub semantic_tensors: HashMap<usize, Array1<f32>>,
    pub status_flags: Vec<u8>,
}

pub struct DetailCache {
    pub budget_bytes: usize,
    pub used_bytes: usize,

    pub meso_cache: LruCache<u64, Arc<MesoLevel>>,
    pub micro_cache: LruCache<u64, Arc<MicroLevel>>,
}

impl DetailCache {
    pub fn new(budget_mb: usize) -> Self {
        let budget_bytes = budget_mb * 1024 * 1024;
        let meso_capacity = (budget_bytes / (10 * 1024)).max(100);
        let micro_capacity = (budget_bytes / (50 * 1024)).max(20);

        Self {
            budget_bytes,
            used_bytes: 0,
            meso_cache: LruCache::new(NonZeroUsize::new(meso_capacity).unwrap()),
            micro_cache: LruCache::new(NonZeroUsize::new(micro_capacity).unwrap()),
        }
    }

    pub fn get_meso(&mut self, macro_id: u32, generator: &dyn DetailGenerator, coarse: &MacroLevel) -> Option<Arc<MesoLevel>> {
        let key = self.hash_key(macro_id, 1, macro_id);

        if let Some(cached) = self.meso_cache.get(&key) {
            return Some(Arc::clone(cached));
        }

        let meso = generator.generate_meso(coarse, macro_id)?;
        let meso_arc = Arc::new(meso);

        let size = self.estimate_meso_size(&meso_arc);
        if self.used_bytes + size > self.budget_bytes {
            while self.used_bytes + size > self.budget_bytes && self.meso_cache.len() > 0 {
                if let Some((_, v)) = self.meso_cache.pop_lru() {
                    self.used_bytes -= self.estimate_meso_size(&v);
                }
            }
        }

        self.used_bytes += size;
        self.meso_cache.put(key, Arc::clone(&meso_arc));
        Some(meso_arc)
    }

    pub fn hash_key(&self, macro_id: u32, level: u8, local_id: u32) -> u64 {
        ((macro_id as u64) << 32) | ((level as u64) << 24) | (local_id as u64)
    }

    fn estimate_meso_size(&self, meso: &MesoLevel) -> usize {
        meso.sub_regions.len() * std::mem::size_of::<MesoRegion>() +
        meso.amplitudes.len() * 4 +
        1024
    }
}

pub trait DetailGenerator: Send + Sync {
    fn generate_meso(&self, coarse: &MacroLevel, region_id: u32) -> Option<MesoLevel>;
    fn generate_micro(&self, meso: &MesoLevel, sub_region_id: u32) -> Option<MicroLevel>;
    fn estimate_complexity(&self, coarse_data: &Array1<f32>) -> f32;
}

pub struct FractalDetailGenerator;

impl DetailGenerator for FractalDetailGenerator {
    fn generate_meso(&self, coarse: &MacroLevel, region_id: u32) -> Option<MesoLevel> {
        let region = coarse.regions.get(region_id as usize)?;
        if !region.needs_fine_detail {
            return None;
        }

        let mut sub_regions = Vec::with_capacity(4);
        let (min_x, max_x, min_y, max_y) = region.bounds;
        let mid_x = (min_x + max_x) / 2.0;
        let mid_y = (min_y + max_y) / 2.0;

        for (i, (x0, x1, y0, y1)) in [
            (min_x, mid_x, min_y, mid_y),
            (mid_x, max_x, min_y, mid_y),
            (min_x, mid_x, mid_y, max_y),
            (mid_x, max_x, mid_y, max_y),
        ].iter().enumerate() {
            sub_regions.push(MesoRegion {
                local_idx: i as u32,
                parent_idx: region_id,
                relative_bounds: (
                    (x0 - min_x) / (max_x - min_x),
                    (x1 - min_x) / (max_x - min_x),
                    (y0 - min_y) / (max_y - min_y),
                    (y1 - min_y) / (max_y - min_y),
                ),
                refinement_score: coarse.complexity_map[region_id as usize],
                entity_refs: Vec::new(),
            });
        }

        Some(MesoLevel {
            parent_region_id: region_id,
            sub_regions,
            spatial_fields: HashMap::new(),
            amplitudes: vec![1.0; 4],
            virtual_to_sparse: HashMap::new(),
        })
    }

    fn generate_micro(&self, meso: &MesoLevel, sub_region_id: u32) -> Option<MicroLevel> {
        let sub = meso.sub_regions.get(sub_region_id as usize)?;
        if sub.refinement_score < 0.3 {
            return None;
        }

        let resolution = 8usize;
        let n_pixels = resolution * resolution;

        Some(MicroLevel {
            parent_meso_id: (meso.parent_region_id, sub_region_id),
            pixel_x: vec![0.0; n_pixels],
            pixel_y: vec![0.0; n_pixels],
            pixel_color: vec![0; n_pixels],
            pixel_mass: vec![0.0; n_pixels],
            spatial_tensors: HashMap::new(),
            semantic_tensors: HashMap::new(),
            status_flags: vec![0; n_pixels],
        })
    }

    fn estimate_complexity(&self, coarse_data: &Array1<f32>) -> f32 {
        let mean = coarse_data.iter().sum::<f32>() / coarse_data.len() as f32;
        let variance = coarse_data.iter()
            .map(|&x| (x - mean).powi(2))
            .sum::<f32>() / coarse_data.len() as f32;
        variance.min(1.0).sqrt()
    }
}

/// Zero-Copy Arc View (Aman dari Lifetime RwLock Guard)
#[derive(Clone)]
pub enum ZeroCopyView {
    Macro {
        region_id: u32,
        data: Arc<CoarseData>,
    },
    Meso {
        region_id: u32,
        local_idx: usize,
        data: Arc<MesoLevel>,
    },
    Micro {
        region_id: u32,
        local_idx: usize,
        data: Arc<MicroLevel>,
    }
}

pub struct CoarseData {
    pub regions: Arc<Vec<MacroRegion>>,
    pub signatures: Arc<Vec<Array1<f32>>>,
}

impl InfiniteDetailField {
    pub fn new(coarse_data: MacroLevel, budget_mb: usize, generator: Arc<dyn DetailGenerator>) -> Self {
        let shared = Arc::new(CoarseData {
            regions: Arc::new(coarse_data.regions.clone()),
            signatures: Arc::new(coarse_data.dominant_signatures.clone()),
        });

        Self {
            coarse: coarse_data,
            detail_cache: RwLock::new(DetailCache::new(budget_mb)),
            detail_generator: generator,
            max_depth: 3,
            shared_base: shared,
        }
    }

    pub fn get_entity(&self, macro_id: u32, zoom_level: u8) -> Option<ZeroCopyView> {
        match zoom_level {
            0 => {
                Some(ZeroCopyView::Macro {
                    region_id: macro_id,
                    data: Arc::clone(&self.shared_base),
                })
            },
            1 => {
                let mut cache = self.detail_cache.write().ok()?;
                let meso = cache.get_meso(macro_id, &*self.detail_generator, &self.coarse)?;

                let sub = meso.sub_regions.first()?; // First active view
                Some(ZeroCopyView::Meso {
                    region_id: macro_id,
                    local_idx: sub.local_idx as usize,
                    data: meso,
                })
            },
            2 => {
                let mut cache = self.detail_cache.write().ok()?;

                let meso = cache.get_meso(macro_id, &*self.detail_generator, &self.coarse)?;

                let key = cache.hash_key(macro_id, 2, 0);
                let micro = if let Some(m) = cache.micro_cache.get(&key) {
                    Arc::clone(m)
                } else {
                    let m = self.detail_generator.generate_micro(&meso, 0)?;
                    let m_arc = Arc::new(m);
                    cache.micro_cache.put(key, Arc::clone(&m_arc));
                    m_arc
                };

                let idx = micro.pixel_mass.iter()
                    .position(|&m| m > 0.0)
                    .unwrap_or(0);

                Some(ZeroCopyView::Micro {
                    region_id: macro_id,
                    local_idx: idx,
                    data: micro,
                })
            },
            _ => None,
        }
    }

    pub fn modify_entity<F>(&self, view: &ZeroCopyView, mutator: F)
    where
        F: FnOnce(&mut Array1<f32>)
    {
        if let ZeroCopyView::Micro { region_id, local_idx, data: _ } = view {
            if let Ok(mut cache) = self.detail_cache.write() {
                let key = cache.hash_key(*region_id, 2, *local_idx as u32);

                // Get the Arc and pop it temporarily to modify if uniquely owned, or clone if shared
                if let Some(mut micro_arc) = cache.micro_cache.pop(&key) {
                    let micro_mut = Arc::make_mut(&mut micro_arc);
                    if let Some(tensor) = micro_mut.spatial_tensors.get_mut(local_idx) {
                        mutator(tensor);
                    }

                    // Put it back
                    cache.micro_cache.put(key, micro_arc);
                }
            }
        }
    }

    pub fn collapse_to_grid(&self, width: usize, height: usize) -> Vec<Vec<i32>> {
        let mut grid = vec![vec![0; width]; height];

        for (i, region) in self.coarse.regions.iter().enumerate() {
            if !self.coarse.region_active.get(i).copied().unwrap_or(false) {
                continue;
            }
            let (min_x, max_x, min_y, max_y) = region.bounds;
            let color = region.dominant_color;

            let x0 = (min_x as usize).min(width);
            let x1 = (max_x as usize).min(width);
            let y0 = (min_y as usize).min(height);
            let y1 = (max_y as usize).min(height);

            for y in y0..y1 {
                for x in x0..x1 {
                    grid[y][x] = color;
                }
            }
        }

        if let Ok(cache) = self.detail_cache.read() {
            for (_, micro) in cache.micro_cache.iter() {
                for i in 0..micro.pixel_x.len() {
                    if micro.pixel_mass[i] > 0.0 {
                        let x = micro.pixel_x[i] as usize;
                        let y = micro.pixel_y[i] as usize;
                        if x < width && y < height {
                            grid[y][x] = micro.pixel_color[i];
                        }
                    }
                }
            }
        }

        grid
    }
}
