use crate::core::entity_manifold::EntityManifold;
use crate::perception::universal_manifold::UniversalManifold;
use crate::perception::entity_segmenter::EntitySegmenter;
use crate::perception::hologram_decoder::HologramDecoder;
use crate::reasoning::topological_aligner::TopologicalAligner;
use crate::reasoning::hamiltonian_pruner::HamiltonianPruner;
use crate::reasoning::multiverse_sandbox::MultiverseSandbox;
use std::collections::HashMap;
use ndarray::Array1;

pub struct RrmAgent {
    perceiver: UniversalManifold,
    decoder: HologramDecoder,
    pruner: HamiltonianPruner,
}

impl RrmAgent {
    pub fn new() -> Self {
        Self {
            perceiver: UniversalManifold::new(),
            decoder: HologramDecoder::new(),
            pruner: HamiltonianPruner::new(),
        }
    }

    pub fn solve_task(&mut self, train_in: &Vec<Vec<Vec<i32>>>, train_out: &Vec<Vec<Vec<i32>>>, test_in: &Vec<Vec<i32>>) -> Vec<Vec<i32>> {
        let mut train_states: Vec<(EntityManifold, EntityManifold)> = Vec::new();

        for (i, o) in train_in.iter().zip(train_out.iter()) {
            let mut stream_in = HashMap::new();
            let mut stream_out = HashMap::new();

            self.encode_grid(i, &mut stream_in);
            self.encode_grid(o, &mut stream_out);

            let mut man_in = EntityManifold::new();
            let mut man_out = EntityManifold::new();

            EntitySegmenter::segment_stream(&stream_in, &mut man_in, 0.85, &self.perceiver);
            EntitySegmenter::segment_stream(&stream_out, &mut man_out, 0.85, &self.perceiver);

            train_states.push((man_in, man_out));
        }

        let mut stream_test = HashMap::new();
        self.encode_grid(test_in, &mut stream_test);
        let mut test_manifold = EntityManifold::new();
        EntitySegmenter::segment_stream(&stream_test, &mut test_manifold, 0.85, &self.perceiver);

        for (man_in, man_out) in &train_states {
            let matches = TopologicalAligner::align(man_in, man_out);

            for m in matches {
                if m.similarity > 0.6 {
                    self.pruner.inject_hypothesis(
                        &m.axiom_type,
                        &m.delta_spatial,
                        m.delta_x,
                        m.delta_y,
                        1.0 - m.similarity,
                        0,
                        m.physics_tier,
                    );

                    MultiverseSandbox::apply_axiom(
                        &mut test_manifold,
                        &m.delta_spatial,
                        &m.delta_semantic,
                        m.delta_x,
                        m.delta_y,
                        m.physics_tier,
                    );
                }
            }
        }

        // Di Rust, kita asumsikan output grid ARC tidak berubah ukuran (10x10)
        // Jika ada Axiom Resize, itu harus diekstrak sebagai Rule.
        let width = test_in[0].len();
        let height = test_in.len();

        // Threshold untuk memotong noise kuantum dari bentuk relatif.
        // Berdasarkan Normalisasi Blueprint Shape Tensor (1 / sqrt(magnitude)), benda besar akan membagi
        // energi probabilitasnya ke seluruh pikselnya (amplitudo individu turun seiring ukuran benda).
        // Untuk mendeteksi 'materi' yang benar di dalam wireframe yang menyebar, Sinar Probe
        // cukup menangkap riak energi di atas nol absolut (Threshold: > 0.05).
        // Titik vakum (lubang tengah) tetap akan mengalami destructive interference sehingga nilainya < 0.0.
        self.decoder.collapse_to_grid(&test_manifold, width, height, 0.05)
    }

    fn encode_grid(&self, grid: &Vec<Vec<i32>>, stream: &mut HashMap<String, (Array1<f32>, Array1<f32>)>) {
        let height = grid.len();
        let width = if height > 0 { grid[0].len() } else { 0 };

        for y in 0..height {
            for x in 0..width {
                let token = grid[y][x];
                if token == 0 {
                    continue;
                }

                // MENGHAPUS SUB-PIXEL MISALIGNMENT (Skala Absolut untuk ARC)
                // ARC bergantung pada grid integer yang pasti (0, 1, 2, 3...)
                // Mengubahnya jadi pecahan berdasarkan width/height (0.5, 0.3) membuat fasa menjadi tidak bisa diprediksi
                // jika grid hasil ukurannya beda atau kita mengekstrak shape lokal.
                // Kita akan gunakan kordinat piksel murni sebagai fasa, asalkan ia tidak terlalu besar.
                // Jika ingin fractional_bind stabil, kita pakai x as f32 secara absolut.
                let rel_x = x as f32;
                let rel_y = y as f32;

                let global_spatial = self.perceiver.build_global_spatial_tensor(rel_x, rel_y);
                let semantic = self.perceiver.build_semantic_tensor(token);

                stream.insert(format!("{},{}_t{}", x, y, token), (global_spatial, semantic));
            }
        }
    }
}
