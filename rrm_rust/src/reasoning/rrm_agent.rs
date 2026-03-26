use crate::core::entity_manifold::EntityManifold;
use crate::perception::universal_manifold::UniversalManifold;
use crate::perception::entity_segmenter::EntitySegmenter;
use crate::perception::hologram_decoder::HologramDecoder;
use crate::reasoning::topological_aligner::TopologicalAligner;
use crate::reasoning::hamiltonian_pruner::HamiltonianPruner;
use crate::reasoning::multiverse_sandbox::MultiverseSandbox;
use crate::reasoning::async_runtime::MiniExecutor;
use crate::reasoning::quantum_search::{AsyncWaveSearch, WaveNode};

use std::collections::HashMap;
use std::sync::Arc;
use ndarray::Array1;

pub struct RrmAgent {
    perceiver: UniversalManifold,
    decoder: HologramDecoder,
    pruner: HamiltonianPruner, // Akan di-deprecate karena diganti AsyncWaveSearch, tapi biarkan untuk fallback
}

impl Default for RrmAgent {
    fn default() -> Self {
        Self::new()
    }
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

        // 2. RESONATE
        let mut seed_axioms: Vec<WaveNode> = Vec::new();
        let expected_grids: Vec<Vec<Vec<i32>>> = train_out.clone();

        for (man_in, man_out) in train_states.iter() {
            let matches = TopologicalAligner::align(man_in, man_out);
            for m in matches {
                // Kita ekstrak initial state_manifolds (Sama untuk semua Node awal)
                let initial_manifolds: Vec<EntityManifold> = train_states.iter().map(|s| s.0.clone()).collect();

                seed_axioms.push(WaveNode {
                    axiom_type: m.axiom_type,
                    condition_tensor: m.condition_tensor,
                    tensor_spatial: m.delta_spatial,
                    tensor_semantic: m.delta_semantic,
                    delta_x: m.delta_x,
                    delta_y: m.delta_y,
                    physics_tier: m.physics_tier,
                    state_manifolds: initial_manifolds,
                    probability: 1.0,
                    depth: 0,
                });
            }
            // Kita cukup ambil hipotesis dari contoh pertama saja untuk mengefisienkan tree search
            // (Karena rule sejati harus bisa bekerja/beresonansi di semua training states anyway)

        }

        // 3. EVOLVE (Asynchronous Wave Search)
        let search = Arc::new(AsyncWaveSearch::new(expected_grids, 1));
        let executor = MiniExecutor::new();
        let _decoder_clone = HologramDecoder::new();

        for axiom_node in seed_axioms {
            let s_clone = Arc::clone(&search);
            let d_clone = HologramDecoder::new();
            // Semua Axioms yang memungkinkan tidak diperlukan di loop pertama
            let all_axioms: Vec<WaveNode> = vec![];

            executor.spawn(async move {
                s_clone.propagate_wave(axiom_node, d_clone, all_axioms).await;
            });
        }

        // Block & Jalankan hingga semua gelombang runtuh (Pruned/Selesai)
        executor.run();

        // Ambil Ground State yang selamat
        let ground_states = search.ground_states.read().unwrap();
        let mut best_rule: Option<WaveNode> = None;
        let mut max_prob = -1.0;

        for state in ground_states.iter() {
            if state.probability > max_prob {
                max_prob = state.probability;
                best_rule = Some(state.clone());
            }
        }

        // 4. COLLAPSE (Test Phase)
        if let Some(rule) = best_rule {
            println!("   [Rust MCTS] Ground State Ditemukan: {} (Energy = 0.0)", rule.axiom_type);

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
            println!("   [Rust MCTS] WARNING: Semua gelombang hancur! (Halusinasi/Meleset)");
        }

        let test_width = if test_manifold.global_width > 0.0 { test_manifold.global_width as usize } else { test_in[0].len() };
        let test_height = if test_manifold.global_height > 0.0 { test_manifold.global_height as usize } else { test_in.len() };

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
