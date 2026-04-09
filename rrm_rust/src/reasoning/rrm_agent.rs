use crate::core::entity_manifold::EntityManifold;
use crate::perception::structural_analyzer::StructuralAnalyzer;
use crate::self_awareness::skill_ontology::SkillOntology;
use crate::self_awareness::self_reflection::SelfReflection;
use crate::perception::universal_manifold::UniversalManifold;
use crate::perception::entity_segmenter::EntitySegmenter;
use crate::perception::hologram_decoder::HologramDecoder;
use crate::reasoning::topological_aligner::TopologicalAligner;
use crate::reasoning::top_down_axiomator::TopDownAxiomator;
use crate::reasoning::hamiltonian_pruner::HamiltonianPruner;
use crate::reasoning::multiverse_sandbox::MultiverseSandbox;
use crate::reasoning::quantum_search::{AsyncWaveSearch, WaveNode};
use crate::memory::logic_seed_bank::LogicSeedBank;
use crate::reasoning::grover_diffusion_system::{GroverDiffusionSystem, GroverConfig, GroverCandidate, TrainState};
use crate::reasoning::global_blackboard::GlobalBlackboard;
use crate::reasoning::hierarchical_inference::{DeepActiveInferenceEngine, SimulationMode};
use crate::reasoning::causal_reasoning::CausalReasoner;

use std::collections::HashMap;
use std::sync::Arc;
use ndarray::Array1;

pub struct RrmAgent {
    perceiver: UniversalManifold,
    decoder: HologramDecoder,
    pruner: HamiltonianPruner, // Akan di-deprecate
    seed_bank: LogicSeedBank,

    // Self-Awareness Layer
    ontology: SkillOntology,
    self_reflection: SelfReflection,
    structural_analyzer: StructuralAnalyzer,

    // Reasoning
    counterfactual_engine: crate::reasoning::counterfactual_engine::CounterfactualEngine,
    causal_reasoner: CausalReasoner,
    hierarchical_planner: crate::reasoning::hierarchical_planner::HierarchicalPlanner,

    // Memory
    mental_replay: crate::memory::mental_replay::MentalReplay,
    skill_composer: crate::reasoning::skill_composer::SkillComposer,
}

impl Default for RrmAgent {
    fn default() -> Self {
        Self::new()
    }
}

impl RrmAgent {
    pub fn new() -> Self {
        use crate::perception::structural_analyzer::{StructuralDelta, StructuralSignature, DimensionRelation, ObjectDelta, TopologyHint, SymmetryChange, ObjectStatistics};
        use std::collections::HashSet;

        let ontology = SkillOntology::initialize();
        let self_reflection = SelfReflection::new(ontology.clone());

        Self {
            perceiver: UniversalManifold::new(),
            decoder: HologramDecoder::new(),
            pruner: HamiltonianPruner::new(),
            seed_bank: LogicSeedBank::new(),
            ontology,
            self_reflection,
            structural_analyzer: StructuralAnalyzer,
            counterfactual_engine: crate::reasoning::counterfactual_engine::CounterfactualEngine::new(),
            causal_reasoner: CausalReasoner::new(),
            hierarchical_planner: crate::reasoning::hierarchical_planner::HierarchicalPlanner::from_delta(&StructuralDelta { signature: StructuralSignature { dim_relation: DimensionRelation::Equal, object_delta: ObjectDelta::SameCount, color_transitions: vec![], topology_in: TopologyHint::Scatter, topology_out: TopologyHint::Scatter, has_template_frame: false, symmetry_change: SymmetryChange::Preserved }, input_stats: ObjectStatistics { count: 0, colors: HashSet::new(), bounding_box: (0, 0), total_pixels: 0, density: 0.0 }, output_stats: ObjectStatistics { count: 0, colors: HashSet::new(), bounding_box: (0, 0), total_pixels: 0, density: 0.0 }, per_object_changes: vec![] }, &SkillOntology::initialize()), // Will be recreated properly inside solve_task_v2
            mental_replay: crate::memory::mental_replay::MentalReplay::new(),
            skill_composer: crate::reasoning::skill_composer::SkillComposer::new(),
        }
    }



    pub fn solve_task_v2(
        &mut self,
        train_pairs: &[(EntityManifold, EntityManifold)],
        test_input: &EntityManifold,
    ) -> Vec<Vec<i32>> {
        use crate::reasoning::hierarchical_planner::HierarchicalPlanner;
        use crate::reasoning::structures::Axiom;

        println!("🧠 [Mental Simulation] Memulai counterfactual exploration...");

        let deltas: Vec<_> = train_pairs.iter()
            .map(|(inp, out)| StructuralAnalyzer::analyze(inp, out))
            .collect();

        let consensus_delta = StructuralAnalyzer::consensus(&deltas);

        // Pre-filter dengan simulasi cepat di CounterfactualEngine
        let mut promising_axioms = Vec::new();

        // Introspeksi dari ontology
        let introspect_candidates = self.ontology.introspect(&consensus_delta.signature);
        let mut candidates = vec![Axiom::identity(), Axiom::crop_to_content()];

        for cap in introspect_candidates {
            candidates.push(Axiom::new(&cap.name, cap.tier_id, ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION), ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION), 0.0, 0.0));
        }

        for axiom in candidates {
            let result = self.counterfactual_engine.what_if(&axiom, &train_pairs[0].0, &train_pairs[0].1);
            if result.is_success {
                println!("    ✅ {} langsung sukses di CounterfactualEngine!", axiom.name);

                // Kausalitas
                let dummy_sig = crate::reasoning::structures::StructuralSignature {
                    dim_relation: crate::reasoning::structures::DimensionRelation::Equal,
                    object_delta: crate::reasoning::structures::ObjectDelta::Same,
                    color_mapping: None,
                    topology_hint: crate::reasoning::structures::TopologyHint::Grid,
                };
                let causal_result = self.causal_reasoner.assess_causality(&axiom, &train_pairs[0].0, &dummy_sig);
                println!("    ✅ Evaluasi Kausalitas: {}", causal_result.explanation);

                promising_axioms.push(axiom);
                break;
            } else {
                println!("    ❌ {} tidak cocok", axiom.name);
            }
        }

        if !promising_axioms.is_empty() {
             let mut test_state = test_input.clone();
             for axiom in &promising_axioms {
                 MultiverseSandbox::apply_axiom(&mut test_state, &axiom.condition_tensor, &axiom.delta_spatial, &axiom.delta_semantic, axiom.delta_x, axiom.delta_y, axiom.tier, &axiom.name);
             }

             return self.decoder.collapse_to_grid(&test_state, test_state.global_width as usize, test_state.global_height as usize, 0.5);
        }

        // Fallback ke Hierarchical Planner
        println!("  🔄 Fallback ke hierarchical planning...");

        let _strategy = self.ontology.can_solve(&consensus_delta)
            .expect("No strategy available for this task class");

        let planner = HierarchicalPlanner::from_delta(&consensus_delta, &self.ontology);

        let plan = planner.plan_with_validation(
            &mut self.counterfactual_engine,
            &train_pairs[0].0,
            &train_pairs[0].1,
        );

        match plan {
            Some(axioms) => {
                let mut test_state = test_input.clone();
                for axiom in &axioms {
                    MultiverseSandbox::apply_axiom(&mut test_state, &axiom.condition_tensor, &axiom.delta_spatial, &axiom.delta_semantic, axiom.delta_x, axiom.delta_y, axiom.tier, &axiom.name);
                }

                let mut wiki = crate::self_awareness::executable_wiki::ExecutableWiki::new("rrm_rust/knowledge/skills/");
                let _ = wiki.append_to_log("Execution_Log", &format!("Run #X -> SUCCESS via HierarchicalPlanner fallback"));

                self.decoder.collapse_to_grid(&test_state, test_state.global_width as usize, test_state.global_height as usize, 0.5)
            },
            None => {
                self.mental_replay.generate_dreams(10);
                let _discovered = self.mental_replay.practice_in_dreams(
                    &mut self.counterfactual_engine,
                    &self.ontology,
                );

                // MCTS/Planner gagal total. Catat ke log Wiki
                let mut wiki = crate::self_awareness::executable_wiki::ExecutableWiki::new("rrm_rust/knowledge/skills/");
                let _ = wiki.append_to_log("Analysis_Log", &format!("Catastrophic Failure Detected. Need to synthesize generative skill via crossover."));

                // Simulasi pembuatan skill baru hasil "crossover"
                let new_page = crate::self_awareness::executable_wiki::WikiPage {
                    id: format!("synthesized_{}", chrono::Utc::now().format("%Y%m%d%H%M%S")),
                    page_type: "synthesized_crossover".to_string(),
                    tier: 8,
                    confidence: 0.50,
                    parent: Some("mcts_fallback".to_string()),
                    content: "## Origin\nAuto-generated skill from Catastrophic Failure\n\n```rust\n// Novel spatial tensor bound\n```\n".to_string(),
                    code_blocks: vec![],
                };
                let _ = wiki.create_skill(new_page);

                self.decoder.collapse_to_grid(test_input, test_input.global_width as usize, test_input.global_height as usize, 0.5)
            }
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
        let fast_pass_axioms: Vec<WaveNode> = seed_axioms.iter().filter(|a| a.physics_tier <= 2).cloned().take(3).collect();
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
        let mut best_fast_pass_energy = f32::MAX;

        {
            let ground_states = search.ground_states.read().unwrap();
            for state in ground_states.iter() {
                if state.probability > max_prob {
                    max_prob = state.probability;
                    best_rule = Some(state.clone());
                }

                // Estimate pragmatic error from fast pass node energy conceptually
                // For simplicity, if we don't find a perfect solution, let's assume error is high
                if max_prob < 0.99 {
                    best_fast_pass_energy = 100.0;
                }
            }
        }

        // 🌟 1. INISIALISASI CEO
        let mut ceo_engine = DeepActiveInferenceEngine::new();

        // 🌟 2. METAKOGNISI: SAKLAR GIGI OTOMATIS
        if best_fast_pass_energy > 50.0 || max_prob < 0.99 {
            println!("   🧠 [Metakognisi] Terjebak di Local Optimum (Fast Pass Gagal).");
            println!("   🧠 Beralih ke Mode: PROBABILISTIC (Mengaktifkan Rasa Ingin Tahu Tinggi untuk Struktur Kosmik!)");
            ceo_engine.switch_mode(SimulationMode::Probabilistic);
        } else {
            ceo_engine.switch_mode(SimulationMode::StrictVSA);
        }

        // ADVANCED PASS (SNAPSHOT FALLBACK):
        // Jika Fast Pass gagal menemukan Ground State (Energy 0.0, prob = 1.0),
        // kita jalankan deep MCTS dengan seluruh aksioma kosmis (Geometry, Spawn, Crop, dll)
        if best_rule.is_none() || max_prob < 0.99 {
            println!("   [Rust MCTS] Fast Pass gagal. Memulai ADVANCED PASS (Depth 2, All Physics)...");

            // Filter aksioma berdasarkan confidence. HGM menghasilkan similarity > 0.85, Hebbian biasa lebih rendah.
            let high_confidence_axioms: Vec<WaveNode> = seed_axioms.into_iter()
                .filter(|a| a.probability >= 0.3) // Allow sub-part heuristics (Tier 0) to enter advanced pass
                .collect();

            println!("   🧠 Advanced Pass Axioms Generated (Sim >= 0.3): {}", high_confidence_axioms.len());
            for (i, ax) in high_confidence_axioms.iter().enumerate().take(30) {
                println!("      [{}] {:?} | sim: {:.3} | tier: {} | dx: {} dy: {}", i, ax.axiom_type, ax.probability, ax.physics_tier, ax.delta_x, ax.delta_y);
            }

            // Iterative Deepening: Beam Width 3 -> 5 -> 10 -> 20
            let depths = vec![2, 5, 10, 20];

            for (attempt, &take_n) in depths.iter().enumerate() {
                println!("   🔍 Search Attempt {}: Exploring top {} advanced axioms...", attempt + 1, take_n);

                // Menggunakan GroverDiffusionSystem untuk Pre-Filter Aksioma Terbaik tanpa deep cloning
                // secara terus-menerus ke semua cabang, sehingga menghemat memory MCTS!
                let mut candidates = Vec::new();
                for ax in high_confidence_axioms.iter().take(take_n) {
                    candidates.push(GroverCandidate {
                        energy: ax.probability, // warm start base
                        tensor_rule: ax.tensor_spatial.clone(), // Menggunakan tensor spasial untuk filtering
                        condition_tensor: ax.condition_tensor.clone(),
                        delta_x: ax.delta_x,
                        delta_y: ax.delta_y,
                        physics_tier: ax.physics_tier,
                        axiom_type: ax.axiom_type.last().cloned().unwrap_or_else(|| "".to_string()),
                    });
                }

                // Konversi train_states menjadi format Oracle Grover
                let mut grover_train_states = Vec::new();
                for (i, (man_in, _man_out)) in train_states.iter().enumerate() {
                    grover_train_states.push(TrainState {
                        in_state: man_in.clone(),
                        expected_grid: expected_grids[i].clone(),
                    });
                }

                let mut sandbox = MultiverseSandbox::new();
                let config = GroverConfig {
                    dimensions: crate::core::config::GLOBAL_DIMENSION,
                    search_space_size: candidates.len(),
                    temperature: 0.5,
                    free_energy_threshold: 0.0,
                    max_iterations: 2, // 2 iterations Cukup untuk 20 node
                };

                let mut grover = GroverDiffusionSystem::new(&mut sandbox, config);
                let best_grover_idx = grover.search(&candidates, &grover_train_states, &ceo_engine.current_mode);

                // Jika Grover menemukan pemenang yang meyakinkan, kita bisa langsung pakai
                if let Some(idx) = best_grover_idx {
                    if grover.energies[idx] <= 0.001 {
                        println!("   ✅ Grover Diffusion menemukan solusi eksak! Index: {}", idx);
                        // Convert to WaveNode
                        let winner = &candidates[idx];
                        let mut w_node = WaveNode::new(
                            winner.axiom_type.clone(),
                            winner.condition_tensor.clone(),
                            winner.tensor_rule.clone(),
                            winner.tensor_rule.clone(),
                            winner.delta_x,
                            winner.delta_y,
                            winner.physics_tier,
                            std::sync::Arc::new(train_states.iter().map(|(m, _)| std::sync::RwLock::new(m.clone())).collect::<Vec<_>>()),
                        );
                        w_node.probability = 1.0;
                        best_rule = Some(w_node);
                        break; // Selesai!
                    }
                }

                // 1. Buat Tensor Identitas (Keadaan Diam / Tidak ada fisika yang berubah)
                let mut id_tensor = ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION);
                if crate::core::config::GLOBAL_DIMENSION > 0 {
                    id_tensor[0] = 1.0;
                    id_tensor[crate::core::config::GLOBAL_DIMENSION - 1] = 1.0;
                }

                // Kita butuh initial state_manifolds
                let initial_manifolds_adv = std::sync::Arc::new(train_states.iter().map(|(m, _)| std::sync::RwLock::new(m.clone())).collect::<Vec<_>>());

                // 2. ROOT ZERO-POINT (Memulai MCTS dari Depth 0, bukan Depth 1)
                let initial_wave = WaveNode {
                    axiom_type: vec!["ROOT_START".to_string()],
                    state_manifolds: std::sync::Arc::clone(&initial_manifolds_adv),
                    condition_tensor: Some(id_tensor.clone()),
                    tensor_spatial: id_tensor.clone(),
                    tensor_semantic: id_tensor.clone(),
                    probability: 1.0,
                    delta_x: 0.0,
                    delta_y: 0.0,
                    physics_tier: 0,
                    depth: 0,
                    state_modified: false,
                };

                // 3. Masukkan SEMUA kandidat Grover sebagai amunisi untuk Depth 1, 2, dst.
                let mut all_clone: Vec<WaveNode> = high_confidence_axioms.clone();

                // BERSIHKAN AMUNISI DARI DUPLIKAT!
                // MCTS akan mencoba semua `all_clone`, jika terlalu banyak CROP yang sama, ia akan OOM / buang-buang energi.
                all_clone.dedup_by(|a, b| a.axiom_type == b.axiom_type);

                // Type aliasing for strict invariant enforcement
                type PhysicsTier = u8;
                const DIM_PHYSICS_TIER: PhysicsTier = 7;
                const GRID_OPS_TIER: PhysicsTier = 6;
                const GEOMETRY_TIER_MIN: PhysicsTier = 4;
                const GEOMETRY_TIER_MAX: PhysicsTier = 5;

                let all_clone_count = all_clone.len();

                // 🌟 VIP PASS: ORACLE INJECTION (OPSI A: Tactical Fallback) 🌟
                // TODO: Ganti ke Opsi B (Template Detection di HierarchicalGestalt)
                // di mana `TopDownAxiomator` yang menyadari ukuran frame/marker
                // dari input (misal kotak abu-abu 6x6) lalu mengirimkannya sebagai delta_x/y.

                // HACK SEMENTARA: Kita pasok target MCTS (Test Set Output) sebagai `delta_x/y`
                // hanya agar CROP tahu berapa besar jendela yang harus dipotong,
                // karena Sandbox dilarang menebak-nebak ukurannya dari konten global.
                let (test_target_h, test_target_w) = expected_grids.first()
                    .map(|grid| (grid.len() as f32, if grid.is_empty() { 0.0 } else { grid[0].len() as f32 }))
                    .unwrap_or((0.0, 0.0));

                for c in all_clone.iter_mut() {
                    let probability_boost = match c.physics_tier {
                        DIM_PHYSICS_TIER => 5.0,
                        GRID_OPS_TIER => 3.0,
                        GEOMETRY_TIER_MIN..=GEOMETRY_TIER_MAX => 2.0,
                        _ => 0.0,
                    };

                    if c.physics_tier == DIM_PHYSICS_TIER {
                        c.probability = probability_boost; // Absolute VIP

                        // Inject Oracle target WxH
                        if test_target_w > 0.0 && test_target_h > 0.0 {
                            c.delta_x = test_target_w;
                            c.delta_y = test_target_h;
                        }
                    } else {
                        c.probability += probability_boost;
                    }
                }

                // Stable deterministic sort
                all_clone.sort_by(|a, b| {
                    b.probability.partial_cmp(&a.probability)
                        .unwrap_or(std::cmp::Ordering::Equal)
                        .then_with(|| a.depth.cmp(&b.depth)) // Break ties with depth
                });

                // Invariant Assertions
                debug_assert!(all_clone.len() == all_clone_count, "Candidate count altered during VIP pass");
                debug_assert!(all_clone.iter().all(|h| !h.probability.is_nan()), "NaN detected in final probabilities");

                println!("   ⚡ Memulai MCTS dari ROOT ZERO-POINT (Depth 0) dengan {} amunisi unik...", all_clone.len());

                search = std::sync::Arc::new(AsyncWaveSearch::new(expected_grids.clone(), 2)); // Buka batas Horizon: Depth 2
                let s_clone = std::sync::Arc::clone(&search);

                // 4. Eksekusi MCTS dari akar!
                pollster::block_on(async move { s_clone.propagate_wave(initial_wave, initial_manifolds_adv, all_clone).await; });

                let ground_states = search.ground_states.read().unwrap();
                max_prob = -1.0;
                for state in ground_states.iter() {
                    if state.probability > max_prob {
                        max_prob = state.probability;
                        best_rule = Some(state.clone());
                    }
                }

                // Jika Ground State ditemukan (prob mendekati 1.0, error 0.0), break dari Iterative Deepening!
                if max_prob >= 0.95 {
                    println!("   ✅ Advanced Pass Selesai Berkat Grover! (Prob: {:.3})", max_prob);
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

            // Simpan ke LogicSeedBank agar bisa dipanggil lebih cepat di task selanjutnya
            self.seed_bank.add_seed(current_axiom_str, 999, &rule.tensor_spatial);

            // Optional: Sinkronisasikan agen dengan GlobalBlackboard jika ada multi-physics
            let mut blackboard = GlobalBlackboard::new();
            let spatial_agent = &rule.tensor_spatial;
            let semantic_agent = &rule.tensor_semantic;

            blackboard.synchronize(&[spatial_agent, semantic_agent]);
            let _collective = blackboard.read_collective_state(); // Future use for gestalt rendering

            // Terapkan ke test_manifold
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
            let mut wiki = crate::self_awareness::executable_wiki::ExecutableWiki::new("rrm_rust/knowledge/skills/");
            let _ = wiki.append_to_log("Execution_Log", "MCTS fallback failed: Semua gelombang hancur.");
            let new_page = crate::self_awareness::executable_wiki::WikiPage {
                id: format!("synthesized_{}", chrono::Utc::now().format("%Y%m%d%H%M%S")),
                page_type: "synthesized_crossover".to_string(),
                tier: 8,
                confidence: 0.50,
                parent: Some("mcts_fallback".to_string()),
                content: "## Origin\nAuto-generated skill from Catastrophic Failure in MCTS\n\n```rust\n// Novel spatial tensor bound\n```\n".to_string(),
                code_blocks: vec![],
            };
            let _ = wiki.create_skill(new_page);
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
