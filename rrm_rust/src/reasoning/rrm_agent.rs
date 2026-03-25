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
        self.pruner.clear_all();
        let mut train_states: Vec<(EntityManifold, EntityManifold)> = Vec::new();

        // 1. Perceive All Training Pairs
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

        // 2. RESONATE (Topological Alignment / Generator Hipotesis Awal)
        // Kita biarkan Aligner mengekstrak Hebbian Consensus dari SEMUA Training Pair
        // Ini menciptakan Seed Hypothesis
        for (_idx, (man_in, man_out)) in train_states.iter().enumerate() {
            let matches = TopologicalAligner::align(man_in, man_out);

            for m in matches {
                // Masukkan ke MCTS Oracle dengan Energy Awal 0.0 (Sebelum Evaluasi)
                self.pruner.inject_hypothesis(
                    &m.axiom_type,
                    m.condition_tensor.clone(),
                    &m.delta_spatial,
                    &m.delta_semantic,
                    m.delta_x,
                    m.delta_y,
                    0.0,
                    0,
                    m.physics_tier,
                );
            }
        }

        // 3. EVOLVE (MCTS Oracle / Free Energy Minimization)
        // Sekarang, untuk setiap hipotesis, kita terapkan ke SEMUA Training In
        // dan kita ukur seberapa hancur/berantakan alam semestanya (Free Energy) dibandingkan Training Out.
        for hyp in &mut self.pruner.hypotheses {
            let mut total_free_energy = 0.0;

            for (idx, (man_in, _)) in train_states.iter().enumerate() {
                // Kloning Universe awal (O(1) Copy)
                let mut trial_manifold: EntityManifold = man_in.clone();
                let expected_grid = &train_out[idx];

                // Terapkan Hypothesis/Axiom (Physics Sandbox)
                // Di True Swarm, kita mengandalkan MultiverseSandbox karena ia mem-bind Semantic/Color Tensors
                // secara aman, di samping melakukan scalar momentum translations.
                MultiverseSandbox::apply_axiom(
                    &mut trial_manifold,
                    &hyp.condition_tensor,
                    &hyp.tensor_spatial,
                    &hyp.tensor_semantic,
                    hyp.delta_x,
                    hyp.delta_y,
                    hyp.physics_tier,
                );

                // Kolaps (Hologram Decoder)
                // ARC biasanya mengubah ukuran grid (misal Cropping/Scaling).
                // Di PoC MCTS sederhana ini, kita asumsikan grid konstan ukurannya dengan target.
                let width = expected_grid[0].len();
                let height = expected_grid.len();

                let collapsed_grid = self.decoder.collapse_to_grid(&trial_manifold, width, height, 0.50);

                // Ukur Energi Karl Friston (Kesalahan Prediksi)
                let energy = HamiltonianPruner::calculate_free_energy(&collapsed_grid, expected_grid);
                total_free_energy += energy;
            }

            // Simpan skor
            hyp.free_energy = total_free_energy;
        }

        // Sortir & Dissipasi (Hanya sisakan yang paling mendekati Free Energy 0.0)
        self.pruner.enforce_dissipation();

        // 4. COLLAPSE (Test Phase)
        let mut stream_test = HashMap::new();
        self.encode_grid(test_in, &mut stream_test);
        let mut test_manifold = EntityManifold::new();
        EntitySegmenter::segment_stream(&stream_test, &mut test_manifold, 0.85, &self.perceiver);

        // Ekstrak Hukum Paling Akurat (Ground State)
        let best_rule = self.pruner.extract_ground_state();

        if let Some(rule) = best_rule {
            println!("   [Rust MCTS] Ground State Ditemukan: {} (Free Energy: {})", rule.description, rule.free_energy);

            MultiverseSandbox::apply_axiom(
                &mut test_manifold,
                &rule.condition_tensor,
                &rule.tensor_spatial,
                &rule.tensor_semantic,
                rule.delta_x,
                rule.delta_y,
                rule.physics_tier,
            );
        } else {
            println!("[Rust MCTS] WARNING: Tidak ada Hipotesis yang selamat!");
        }

        let test_width = test_in[0].len();
        let test_height = test_in.len();

        // Threshold 0.5 untuk True Swarm (menghindari blob noise)
        self.decoder.collapse_to_grid(&test_manifold, test_width, test_height, 0.50)
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

                let rel_x = x as f32;
                let rel_y = y as f32;

                let global_spatial = self.perceiver.build_global_spatial_tensor(rel_x, rel_y);
                let semantic = self.perceiver.build_semantic_tensor(token);

                stream.insert(format!("{},{}_t{}", x, y, token), (global_spatial, semantic));
            }
        }
    }
}
