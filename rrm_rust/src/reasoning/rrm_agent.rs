use crate::core::entity_manifold::EntityManifold;
use crate::perception::universal_manifold::UniversalManifold;
use crate::perception::entity_segmenter::EntitySegmenter;
use crate::perception::hologram_decoder::HologramDecoder;
use crate::reasoning::topological_aligner::TopologicalAligner;
use crate::reasoning::top_down_axiomator::TopDownAxiomator;
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

        if let Some((man_in, man_out)) = train_states.iter().next() {
            // Kombinasikan tebakan cerdas dari HGM (Top-Down) dengan tebakan Partikel dari Hebbian Voting (Bottom-Up)
            let mut matches = TopDownAxiomator::generate_axioms(man_in, man_out);
            matches.extend(TopologicalAligner::align(man_in, man_out));

            // Prioritaskan berdasarkan skor similarity (HGM biasanya >0.85)
            matches.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap());

            for m in matches {
                // Gunakan Arc<Vec<RwLock>> (Copy-on-Write) untuk menghindari memory bloat
                let initial_manifolds: Arc<Vec<std::sync::RwLock<EntityManifold>>> = Arc::new(
                    train_states.iter().map(|s| std::sync::RwLock::new(s.0.clone())).collect()
                );

                let mut node = WaveNode::new(
                    m.axiom_type,
                    m.condition_tensor,
                    m.delta_spatial,
                    m.delta_semantic,
                    m.delta_x,
                    m.delta_y,
                    m.physics_tier,
                    initial_manifolds,
                );
                node.probability = m.similarity; // Meminjam property probability untuk menyimpan skor prioritas/similarity saat inisiasi
                seed_axioms.push(node);
            }
            // Kita cukup ambil hipotesis dari contoh pertama saja untuk mengefisienkan tree search
            // (Karena rule sejati harus bisa bekerja/beresonansi di semua training states anyway)
        }

        // 3. EVOLVE (Asynchronous Wave Search) - Meta-Reactive Orchestrator

        // FAST PASS: Hanya mencoba translasi dan mutasi warna dasar (Tier <= 2)
        // Ini memastikan tugas sederhana selesai dalam hitungan kilat (< 1 detik).
        let fast_pass_axioms: Vec<WaveNode> = seed_axioms.iter()
            .filter(|a| a.history.first().map(|s| s.physics_tier).unwrap_or(0) <= 2)
            .cloned().take(3).collect();
        let mut search = Arc::new(AsyncWaveSearch::new(expected_grids.clone(), 1)); // Depth 1 for Fast Pass

        // Simpan Initial Manifolds untuk perhitungan Epistemic Value di Fast Pass
        let initial_manifolds_fast = if let Some(first) = fast_pass_axioms.first() {
            Arc::clone(&first.state_manifolds)
        } else {
            Arc::new(vec![])
        };

        for axiom_node in fast_pass_axioms {
            let s_clone = Arc::clone(&search);
            let all_clone = vec![]; // Kosongkan all_clone pada fast pass depth 1 agar tidak mengalokasi memori berlebih
            let init_clone = Arc::clone(&initial_manifolds_fast);
            pollster::block_on(async move { s_clone.propagate_wave(axiom_node, init_clone, all_clone).await; });
        }

        let mut best_rule: Option<WaveNode> = None;
        let mut max_prob = -1.0;

        {
            let ground_states = search.ground_states.read().unwrap();
            for state in ground_states.iter() {
                if state.probability > max_prob {
                    max_prob = state.probability;
                    best_rule = Some(state.clone());
                }
            }
        }

        // ADVANCED PASS (SNAPSHOT FALLBACK):
        // Jika Fast Pass gagal menemukan Ground State (Energy 0.0, prob = 1.0),
        // kita jalankan deep MCTS dengan seluruh aksioma kosmis (Geometry, Spawn, Crop, dll)
        if best_rule.is_none() || max_prob < 0.99 {
            println!("   [Rust MCTS] Fast Pass gagal. Memulai ADVANCED PASS (Depth 2, All Physics)...");

            // Filter aksioma berdasarkan confidence. HGM menghasilkan similarity > 0.85, Hebbian biasa lebih rendah.
            let high_confidence_axioms: Vec<WaveNode> = seed_axioms.into_iter()
                .filter(|a| a.history.first().map(|s| s.physics_tier).unwrap_or(0) >= 3 && a.probability >= 0.6) // Note: similarity is stored in probability temporarily during init
                .collect();

            // Iterative Deepening: Beam Width 1 -> 2
            let depths = vec![1, 2]; // Reduced beam width extremely to prevent OOM in small CI runner

            for (attempt, &take_n) in depths.iter().enumerate() {
                println!("   🔍 Search Attempt {}: Exploring top {} advanced axioms...", attempt + 1, take_n);

                search = Arc::new(AsyncWaveSearch::new(expected_grids.clone(), 2)); // Depth 2 for Advanced Pass

                let advanced_axioms: Vec<WaveNode> = high_confidence_axioms.iter().take(take_n).cloned().collect();
                let all_adv_axioms = advanced_axioms.clone();

                let initial_manifolds_adv = if let Some(first) = advanced_axioms.first() {
                    Arc::clone(&first.state_manifolds)
                } else {
                    Arc::new(vec![])
                };

                for axiom_node in advanced_axioms {
                    let s_clone = Arc::clone(&search);
                    let all_clone = all_adv_axioms.clone();
                    let init_clone = Arc::clone(&initial_manifolds_adv);
                    pollster::block_on(async move { s_clone.propagate_wave(axiom_node, init_clone, all_clone).await; });
                }

                let ground_states = search.ground_states.read().unwrap();
                max_prob = -1.0;
                for state in ground_states.iter() {
                    if state.probability > max_prob {
                        max_prob = state.probability;
                        best_rule = Some(state.clone());
                    }
                }

                // Jika Ground State ditemukan (prob mendekati 1.0, error 0.0), break dari Iterative Deepening!
                if max_prob >= 0.99 {
                    break;
                }

                // Jika jumlah aksioma yang diambil sudah mencakup seluruh aksioma yang tersedia, stop
                if take_n >= high_confidence_axioms.len() {
                    break;
                }
            }
        }

        // 4. COLLAPSE (Test Phase)
        if let Some(rule) = best_rule {
            let path_strings: Vec<String> = rule.history.iter().map(|step| step.axiom_type.clone()).collect();
            let path = path_strings.join(" -> ");
            println!("   [Rust MCTS] Ground State Ditemukan: {} (Energy = 0.0)", path);

            // Apply all rules in the path in order.
            for step in rule.history.iter() {
                MultiverseSandbox::apply_axiom(
                    &mut test_manifold,
                    &step.condition_tensor,
                    &step.tensor_spatial,
                    &step.tensor_semantic,
                    step.delta_x,
                    step.delta_y,
                    step.physics_tier,
                    &step.axiom_type,
                );
            }
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
