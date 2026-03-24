use crate::core::config::GLOBAL_DIMENSION;
use crate::core::entity_manifold::EntityManifold;
use crate::perception::universal_manifold::UniversalManifold;

pub struct HologramDecoder {
    pub manifold_perceiver: UniversalManifold,
}

impl HologramDecoder {
    pub fn new() -> Self {
        Self {
            manifold_perceiver: UniversalManifold::new(),
        }
    }

    pub fn collapse_to_grid(
        &self,
        manifold: &EntityManifold,
        width: usize,
        height: usize,
        threshold: f32, // e.g. 0.05
    ) -> Vec<Vec<i32>> {
        let mut grid = vec![vec![0; width]; height];
        let mut z_buffer = vec![vec![0.0f32; width]; height];

        for e in 0..manifold.active_count {
            if manifold.masses[e] == 0.0 {
                continue;
            }

            let sp_tensor = manifold.get_spatial_tensor(e);
            let sem_tensor = manifold.get_semantic_tensor(e);

            let span_x = manifold.spans_x[e];
            let span_y = manifold.spans_y[e];

            let center_x = (manifold.centers_x[e] * (width as f32 - 1.0)).floor() as i32;
            let center_y = (manifold.centers_y[e] * (height as f32 - 1.0)).floor() as i32;

            let half_x = (span_x / 2.0).floor() as i32 + 1;
            let half_y = (span_y / 2.0).floor() as i32 + 1;

            let start_x = i32::max(0, center_x - half_x) as usize;
            let end_x = i32::min(width as i32 - 1, center_x + half_x) as usize;
            let start_y = i32::max(0, center_y - half_y) as usize;
            let end_y = i32::min(height as i32 - 1, center_y + half_y) as usize;

            for y in start_y..=end_y {
                for x in start_x..=end_x {
                    let rel_x = x as f32 / f32::max(1.0, width as f32 - 1.0);
                    let rel_y = y as f32 / f32::max(1.0, height as f32 - 1.0);

                    // 1. Uji Kedalaman Visual (Spasial Resonance)
                    // Apakah di titik x,y ini ada gelombang bentuk/spasial dari entitas ini?
                    let (probe_sp, _) =
                        self.manifold_perceiver.build_pixel_tensors(rel_x, rel_y, 0); // token tidak dipakai untuk spatial

                    let mut spatial_coherence = 0.0;
                    for d in 0..GLOBAL_DIMENSION {
                        spatial_coherence += sp_tensor[d] * probe_sp[d];
                    }

                    // Kondisi Z-Buffer (Quantum Collapse)
                    if spatial_coherence > threshold && spatial_coherence > z_buffer[y][x] {
                        // 2. Uji Mutasi Warna (Semantic Resonance)
                        // Karena kita YAKIN ada objek spasial di titik ini, kita tanya "Warna apa ini?" ke Subspace Semantik
                        let mut best_color = 0;
                        let mut best_sem_coherence = -999.0;

                        for c in 0..10 {
                            let (_, probe_sem) =
                                self.manifold_perceiver.build_pixel_tensors(rel_x, rel_y, c);

                            let mut sem_coherence = 0.0;
                            for d in 0..GLOBAL_DIMENSION {
                                sem_coherence += sem_tensor[d] * probe_sem[d];
                            }

                            // Branchless Max
                            let is_better = if sem_coherence > best_sem_coherence {
                                1.0
                            } else {
                                0.0
                            };
                            best_sem_coherence = (best_sem_coherence * (1.0 - is_better))
                                + (sem_coherence * is_better);
                            best_color = (best_color as f32 * (1.0 - is_better)
                                + (c as f32 * is_better))
                                as i32;
                        }

                        // Eksekusi Kolaps
                        z_buffer[y][x] = spatial_coherence;
                        grid[y][x] = best_color;
                    }
                }
            }
        }

        grid
    }
}
