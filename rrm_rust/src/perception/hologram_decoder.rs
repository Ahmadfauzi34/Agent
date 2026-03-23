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

            let e_tensor = manifold.get_tensor(e);
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

                    let mut best_color = 0;
                    let mut best_coherence = -999.0;

                    // Sensor Multi-Spektrum
                    for c in 0..10 {
                        let probe_phasor = self.manifold_perceiver.build_pixel_tensor(rel_x, rel_y, c);
                        let mut coherence = 0.0;
                        for d in 0..GLOBAL_DIMENSION {
                            coherence += e_tensor[d] * probe_phasor[d];
                        }

                        // Branchless Max
                        let is_better = if coherence > best_coherence { 1.0 } else { 0.0 };
                        best_coherence = (best_coherence * (1.0 - is_better)) + (coherence * is_better);
                        best_color = (best_color as f32 * (1.0 - is_better) + (c as f32 * is_better)) as i32;
                    }

                    // Kondisi Kolaps
                    let is_visible = if best_coherence > threshold { 1.0 } else { 0.0 };
                    let is_front = if best_coherence > z_buffer[y][x] { 1.0 } else { 0.0 };
                    let should_overwrite = is_visible * is_front;

                    z_buffer[y][x] = (z_buffer[y][x] * (1.0 - should_overwrite)) + (best_coherence * should_overwrite);
                    grid[y][x] = (grid[y][x] as f32 * (1.0 - should_overwrite) + (best_color as f32 * should_overwrite)) as i32;
                }
            }
        }

        grid
    }
}
