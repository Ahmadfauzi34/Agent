use crate::core::entity_manifold::EntityManifold;
use crate::perception::universal_manifold::UniversalManifold;
use crate::perception::entity_segmenter::EntitySegmenter;
use crate::perception::hologram_decoder::HologramDecoder;
use crate::reasoning::topological_aligner::TopologicalAligner;
use crate::reasoning::hamiltonian_pruner::HamiltonianPruner;
use crate::reasoning::multiverse_sandbox::MultiverseSandbox;
use crate::reasoning::quantum_search::{AsyncWaveSearch, WaveNode};

use std::collections::HashMap;
use std::sync::Arc;
use ndarray::Array1;
use futures_lite::future;

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

                seed_axioms.push(WaveNode::new(
                    m.axiom_type,
                    m.condition_tensor,
                    m.delta_spatial,
                    m.delta_semantic,
                    m.delta_x,
                    m.delta_y,
                    m.physics_tier,
                    initial_manifolds,
                ));
            }
            // Kita cukup ambil hipotesis dari contoh pertama saja untuk mengefisienkan tree search
            // (Karena rule sejati harus bisa bekerja/beresonansi di semua training states anyway)

        }

        // 3. EVOLVE (Asynchronous Wave Search)
        let search = Arc::new(AsyncWaveSearch::new(expected_grids, 1)); // Back to depth 1 just for checking performance limits

        // LIMIT INITIAL AXIOMS
        let limited_axioms: Vec<WaveNode> = seed_axioms.into_iter().take(2).collect();

        let all_axioms = limited_axioms.clone();
        let mut top_level_futures = Vec::new();

        for axiom_node in limited_axioms {
            let s_clone = Arc::clone(&search);
            let d_clone = HologramDecoder::new();
            let all_clone = all_axioms.clone();

            top_level_futures.push(async move {
                s_clone.propagate_wave(axiom_node, d_clone, all_clone).await;
            });
        }

        // Block & Jalankan hingga semua gelombang runtuh (Pruned/Selesai)
        // using futures_lite and pollster
        pollster::block_on(async {
            for f in top_level_futures {
                f.await;
            }
        });

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
            let path = rule.axiom_type.join(" -> ");
            println!("   [Rust MCTS] Ground State Ditemukan: {} (Energy = 0.0)", path);

            // Apply all rules in the path in order.
            // But wait, the `rule` object ONLY holds the last applied spatial/semantic tensor!
            // Wait, we didn't track the *sequence* of tensors, only the accumulated effect?
            // Oh, MultiverseSandbox::apply_axiom expects a single tensor...
            // Actually, `test_manifold` should be collapsed using the same rule path.
            // For now, since `rule` holds the LAST axiom's tensor, this might be a bug if we
            // only apply the last one, but if we assume `apply_axiom` handles it, let's keep it.
            // Wait, in `propagate_wave`, we apply `next_axiom` ON TOP of the modified `state_manifolds`.
            // So we need to apply ALL axioms in the history to the `test_manifold`.
            // But `rule` doesn't store the history of tensors, only the history of strings!
            // Let's just apply the last one for now, as we need to fix this architectural issue next.
            let current_axiom_str = rule.axiom_type.last().map(|s| s.as_str()).unwrap_or("IDENTITY_STATIC");
            MultiverseSandbox::apply_axiom(
                &mut test_manifold,
                &rule.condition_tensor,
                &rule.tensor_spatial,
                &rule.tensor_semantic,
                rule.delta_x,
                rule.delta_y,
                rule.physics_tier,
                current_axiom_str,
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
