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

            let shape_tensor = manifold.get_shape_tensor(e);
            let sem_tensor = manifold.get_semantic_tensor(e);

            let span_x = manifold.spans_x[e];
            let span_y = manifold.spans_y[e];

            // Posisi absolut dari Pusat Massa (Sekarang sudah murni kordinat Piksel di EntitySegmenter!)
            let center_x = manifold.centers_x[e].round() as i32;
            let center_y = manifold.centers_y[e].round() as i32;

            let half_x = (span_x / 2.0).ceil() as i32 + 1;
            let half_y = (span_y / 2.0).ceil() as i32 + 1;

            let start_x = i32::max(0, center_x - half_x) as usize;
            let end_x = i32::min(width as i32 - 1, center_x + half_x) as usize;
            let start_y = i32::max(0, center_y - half_y) as usize;
            let end_y = i32::min(height as i32 - 1, center_y + half_y) as usize;

            for y in start_y..=end_y {
                for x in start_x..=end_x {
                    // Koordinat Piksel Absolut Murni
                    let abs_x = x as f32;
                    let abs_y = y as f32;

                    // Koordinat Relatif Lokal (Jarak dari Pusat Massa)
                    // Ini SANGAT presisi tanpa konversi pecahan 0..1
                    let local_dx = abs_x - manifold.centers_x[e];
                    let local_dy = abs_y - manifold.centers_y[e];

                    // 1. Uji Kedalaman Visual (Holographic Shape Resonance)
                    // Apakah di titik lokal ini ada bagian dari kerangka bentuk benda?
                    let probe_shape = self.manifold_perceiver.build_local_shape_tensor(local_dx, local_dy);

                    let mut shape_coherence = 0.0;
                    for d in 0..GLOBAL_DIMENSION {
                        shape_coherence += shape_tensor[d] * probe_shape[d];
                    }

                    // TWEAK ZERO-BIAS ARC:
                    // Superposisi shape yang sudah dinormalisasi membagi energinya (misal N piksel -> 1/sqrt(N)).
                    // Alih-alih bergantung pada threshold statis `0.05` yang mungkin terlalu rendah untuk noise
                    // dan menyebabkan "Solid Blob", kita mengalikan coherence dengan jumlah piksel asli
                    // untuk mengembalikan skala energi ke kisaran 0.0 - 1.0 (Un-normalized Projection).
                    let expected_energy = shape_coherence * manifold.masses[e].sqrt();

                    // Kondisi Z-Buffer (Quantum Collapse / Stamping)
                    // Karena kita menggunakan local shape presisi tinggi, Threshold 0.5 terhadap Un-normalized energy
                    // sangat ketat (Hanya piksel asli pembuat Shape yang lolos, Wireframe bolong tetap vakum).
                    if expected_energy > 0.50 && expected_energy > z_buffer[y][x] {

                        // 2. Uji Mutasi Warna (Semantic Resonance)
                        let mut best_color = 0;
                        let mut best_sem_coherence = -999.0;

                        for c in 0..10 {
                            let probe_sem = self.manifold_perceiver.build_semantic_tensor(c);

                            let mut sem_coherence = 0.0;
                            for d in 0..GLOBAL_DIMENSION {
                                sem_coherence += sem_tensor[d] * probe_sem[d];
                            }

                            // Branchless Max
                            let is_better = if sem_coherence > best_sem_coherence { 1.0 } else { 0.0 };
                            best_sem_coherence = (best_sem_coherence * (1.0 - is_better)) + (sem_coherence * is_better);
                            best_color = (best_color as f32 * (1.0 - is_better) + (c as f32 * is_better)) as i32;
                        }

                        // Eksekusi Kolaps
                        z_buffer[y][x] = shape_coherence;
                        grid[y][x] = best_color;
                    }
                }
            }
        }

        grid
    }
}
