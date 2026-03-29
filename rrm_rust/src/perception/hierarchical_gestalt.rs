use std::cell::RefCell;
use crate::core::config::MAX_ENTITIES;
use crate::core::entity_manifold::EntityManifold;

/// Thread-local buffer pool untuk SIMD/Cache-friendly operations
thread_local! {
    static SIMD_BUFFER_POOL: RefCell<Vec<Vec<(f32, f32)>>> = RefCell::new(Vec::new());
    static GESTALT_BUFFER: RefCell<Vec<GestaltAtom>> = RefCell::new(Vec::with_capacity(256));
}

/// Level 1: Gestalt Atoms (Primitive shapes dari swarm)
#[derive(Clone, Debug, PartialEq)]
pub struct GestaltAtom {
    pub atom_type: AtomType,
    pub bounding_box: (f32, f32, f32, f32), // (min_x, min_y, max_x, max_y)
    pub center_of_mass: (f32, f32),
    pub pixel_count: usize,
    pub color: i32,
    pub density: f32, // pixel_count / area
    pub aspect_ratio: f32, // width / height
    pub symmetry_score: f32, // 0.0-1.0
    pub hollowness: f32, // 0.0 (solid) - 1.0 (hollow)
}

#[derive(Clone, Debug, PartialEq)]
pub enum AtomType {
    SolidRectangle,      // Kotak solid, density tinggi
    HollowRectangle,     // Kotak berongga (border)
    HorizontalLine,      // Garis horizontal (aspect_ratio > 3.0)
    VerticalLine,        // Garis vertikal (aspect_ratio < 0.33)
    DiagonalLine,        // Garis diagonal
    LShape,              // Bentuk L
    TShape,              // Bentuk T
    CrossShape,          // Bentuk plus/cross
    Scatter,             // Piksel acak (tidak berpola)
    SinglePixel,         // Titik tunggal
}

/// SIMD-optimized/Cache-friendly shape detector
pub struct GestaltEngine;

impl GestaltEngine {
    /// Extract SIMD-friendly features dari manifold
    /// O(n) dengan n = active_entities, cache-friendly
    pub fn extract_atoms(manifold: &EntityManifold) -> Vec<GestaltAtom> {
        let active = manifold.active_count.min(MAX_ENTITIES);
        if active == 0 { return Vec::new(); }

        // Get thread-local buffer
        GESTALT_BUFFER.with(|buf| {
            let mut buffer = buf.borrow_mut();
            buffer.clear();

            // SIMD-accelerated/Cache-friendly: group pixels by connected components
            let mut visited = vec![false; active];

            for seed in 0..active {
                if visited[seed] || manifold.masses[seed] == 0.0 { continue; }

                // Flood fill dengan cache-optimized neighbor search
                let component = Self::flood_fill_simd(manifold, seed, &mut visited);
                if let Some(atom) = Self::classify_component(&component, manifold) {
                    buffer.push(atom);
                }
            }

            buffer.clone()
        })
    }

    /// SIMD-optimized/Cache-friendly flood fill: cari connected component
    fn flood_fill_simd(
        manifold: &EntityManifold,
        seed: usize,
        visited: &mut [bool]
    ) -> Vec<usize> {
        let mut component = Vec::with_capacity(64);
        let mut stack = vec![seed];

        let threshold = 1.5; // Max distance untuk "connected" (mencakup diagonal)

        while let Some(idx) = stack.pop() {
            if visited[idx] { continue; }
            visited[idx] = true;
            component.push(idx);

            let cx = manifold.centers_x[idx];
            let cy = manifold.centers_y[idx];
            let color = manifold.tokens[idx]; // Komponen harus sewarna

            // Batch check: cari neighbors dalam radius
            for n in 0..manifold.active_count {
                if visited[n] || manifold.masses[n] == 0.0 || manifold.tokens[n] != color { continue; }

                let nx = manifold.centers_x[n];
                let ny = manifold.centers_y[n];

                // Chebyshev distance (Manhattan)
                let dist = (cx - nx).abs() + (cy - ny).abs();
                if dist <= threshold && !stack.contains(&n) {
                    stack.push(n);
                }
            }
        }

        component
    }

    /// Classify component into Gestalt Atom dengan shape analysis
    fn classify_component(
        indices: &[usize],
        manifold: &EntityManifold
    ) -> Option<GestaltAtom> {
        if indices.is_empty() { return None; }

        // Calculate bounding box (SIMD-optimized min/max concept)
        let (mut min_x, mut min_y) = (f32::MAX, f32::MAX);
        let (mut max_x, mut max_y) = (f32::MIN, f32::MIN);
        let (mut sum_x, mut sum_y) = (0.0, 0.0);
        let mut color = 0;
        let mut color_consistent = true;

        for (j, &idx) in indices.iter().enumerate() {
            let x = manifold.centers_x[idx];
            let y = manifold.centers_y[idx];

            min_x = min_x.min(x);
            min_y = min_y.min(y);
            max_x = max_x.max(x);
            max_y = max_y.max(y);
            sum_x += x;
            sum_y += y;

            let c = manifold.tokens[idx];
            if j == 0 { color = c; }
            else if c != color { color_consistent = false; }
        }

        let count = indices.len();
        let center_x = sum_x / count as f32;
        let center_y = sum_y / count as f32;

        let width = max_x - min_x + 1.0;
        let height = max_y - min_y + 1.0;
        let area = width * height;
        let density = count as f32 / area;
        let aspect = width / height.max(0.001);

        // Detect hollow vs solid
        let hollowness = Self::calculate_hollowness(indices, min_x, min_y, max_x, max_y, manifold);

        // Detect symmetry
        let symmetry = Self::calculate_symmetry(indices, center_x, center_y, manifold);

        // Classify atom type
        let atom_type = if count == 1 {
            AtomType::SinglePixel
        } else if aspect > 3.0 && density > 0.7 {
            AtomType::HorizontalLine
        } else if aspect < 0.33 && density > 0.7 {
            AtomType::VerticalLine
        } else if density > 0.85 {
            AtomType::SolidRectangle
        } else if hollowness > 0.3 && density < 0.6 {
            AtomType::HollowRectangle
        } else if Self::is_l_shape(indices, center_x, center_y) {
            AtomType::LShape
        } else if Self::is_t_shape(indices, center_x, center_y) {
            AtomType::TShape
        } else if Self::is_cross_shape(indices, center_x, center_y) {
            AtomType::CrossShape
        } else {
            AtomType::Scatter
        };

        Some(GestaltAtom {
            atom_type,
            bounding_box: (min_x, min_y, max_x, max_y),
            center_of_mass: (center_x, center_y),
            pixel_count: count,
            color: if color_consistent { color } else { -1 },
            density,
            aspect_ratio: aspect,
            symmetry_score: symmetry,
            hollowness,
        })
    }

    /// Cache-friendly hollowness detection
    fn calculate_hollowness(
        indices: &[usize],
        min_x: f32, min_y: f32,
        max_x: f32, max_y: f32,
        manifold: &EntityManifold
    ) -> f32 {
        let width = (max_x - min_x + 1.0) as usize;
        let height = (max_y - min_y + 1.0) as usize;

        if width < 3 || height < 3 { return 0.0; }

        // Create occupancy grid dengan flat array
        let mut grid = vec![false; width * height];

        for &i in indices {
            let x = (manifold.centers_x[i] - min_x) as usize;
            let y = (manifold.centers_y[i] - min_y) as usize;
            if x < width && y < height {
                grid[y * width + x] = true;
            }
        }

        // Count interior pixels yang kosong
        let mut interior_pixels = 0;
        let mut empty_interior = 0;

        for y in 1..height.saturating_sub(1) {
            for x in 1..width.saturating_sub(1) {
                interior_pixels += 1;
                if !grid[y * width + x] {
                    empty_interior += 1;
                }
            }
        }

        if interior_pixels == 0 { return 0.0; }
        empty_interior as f32 / interior_pixels as f32
    }

    /// Cache-friendly symmetry detection
    fn calculate_symmetry(
        indices: &[usize],
        cx: f32, cy: f32,
        manifold: &EntityManifold
    ) -> f32 {
        if indices.len() < 2 { return 1.0; }

        // Use thread-local buffer untuk positions
        SIMD_BUFFER_POOL.with(|pool| {
            let mut pool = pool.borrow_mut();
            let mut rel_pos = pool.pop().unwrap_or_else(|| Vec::with_capacity(indices.len() * 2));

            rel_pos.clear();

            for &i in indices {
                rel_pos.push((
                    manifold.centers_x[i] - cx,
                    manifold.centers_y[i] - cy
                ));
            }

            // Check horizontal symmetry: (x, y) vs (-x, y)
            let mut symmetric_pairs = 0;
            let tolerance = 0.5;

            for i in 0..rel_pos.len() {
                let (x1, y1) = rel_pos[i];
                if x1.abs() < tolerance {
                    symmetric_pairs += 1; // On symmetry axis
                    continue;
                }

                // Look for mirror
                for j in (i+1)..rel_pos.len() {
                    let (x2, y2) = rel_pos[j];
                    if (x1 + x2).abs() < tolerance && (y1 - y2).abs() < tolerance {
                        symmetric_pairs += 2;
                        break;
                    }
                }
            }

            let score = symmetric_pairs as f32 / rel_pos.len() as f32;

            // Return buffer to pool
            if pool.len() < 4 {
                pool.push(rel_pos);
            }

            score.min(1.0)
        })
    }

    fn is_l_shape(_indices: &[usize], _cx: f32, _cy: f32) -> bool {
        // Placeholder untuk deteksi L-Shape
        false
    }

    fn is_t_shape(_indices: &[usize], _cx: f32, _cy: f32) -> bool {
        // Placeholder
        false
    }

    fn is_cross_shape(_indices: &[usize], _cx: f32, _cy: f32) -> bool {
        // Placeholder
        false
    }
}
