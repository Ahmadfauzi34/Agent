import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

content = content.replace("let mut ceo_engine = DeepActiveInferenceEngine::new();",
"""let mut ceo_engine = DeepActiveInferenceEngine::new();
        let mut ceo_dispatcher = crate::reasoning::hierarchical_inference::CeoDispatcher::new(crate::reasoning::hierarchical_inference::CeoConfig::default());""")

# Provide integration snippet replacing old MCTS depth looping code
target_advanced_pass = """// ADVANCED PASS (SNAPSHOT FALLBACK):
        // Jika Fast Pass gagal menemukan Ground State (Energy 0.0, prob = 1.0),
        // kita jalankan deep MCTS dengan seluruh aksioma kosmis (Geometry, Spawn, Crop, dll)
        if best_rule.is_none() || max_prob < 0.99 {"""

replacement_advanced_pass = """// ADVANCED PASS (CEO CONTROLLED):
        if best_rule.is_none() || max_prob < 0.99 {
            println!("   [Rust MCTS] Fast Pass gagal. Memulai ADVANCED PASS dengan CEO-controlled MCTS...");

            let high_confidence_axioms: Vec<WaveNode> = seed_axioms.into_iter()
                .filter(|a| a.probability >= 0.3)
                .collect();

            let mut candidates_u16 = Vec::new();
            let mut axioms_map = Vec::new();

            for (i, ax) in high_confidence_axioms.iter().enumerate() {
                candidates_u16.push(i as u16);
                let ax_name = ax.axiom_type.last().cloned().unwrap_or_else(|| "".to_string());
                axioms_map.push(crate::reasoning::structures::Axiom::new(&ax_name, ax.physics_tier, ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION), ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION), 0.0, 0.0));
            }

            let root_idx = ceo_dispatcher.alloc_wave_slot().unwrap_or(0);
            ceo_dispatcher.wave_parent_indices[root_idx] = -1;
            ceo_dispatcher.wave_applied_axiom_ids[root_idx] = 0;
            ceo_dispatcher.wave_depths[root_idx] = 0;
            ceo_dispatcher.wave_masses[root_idx] = 1.0;
            ceo_dispatcher.frontier_active_indices.push(root_idx);

            let max_iterations = 20;
            for iter in 0..max_iterations {
                let pruned = ceo_dispatcher.auto_prune();
                let expansion = ceo_dispatcher.expand_frontier(&candidates_u16, &expected_grids[0].clone().into_manifold(), &axioms_map);

                if let Some(best) = expansion.best_new_wave {
                    let energy = ceo_dispatcher.metric_free_energies[best];
                    if energy < 0.1 {
                        println!("✅ CEO Solution found at iteration {}", iter);
                        break;
                    }
                }

                ceo_dispatcher.temperature *= 0.95;
                if expansion.new_waves == 0 { break; }
            }
        }

        let mut _best_rule_backup: Option<WaveNode> = best_rule;
        /*
"""

if "let root_idx = ceo_dispatcher.alloc_wave_slot().unwrap_or(0);" not in content:
    content = content.replace(target_advanced_pass, replacement_advanced_pass)
    content = content.replace("        // 4. COLLAPSE (Test Phase)", "        */\n        let best_rule = _best_rule_backup;\n        // 4. COLLAPSE (Test Phase)")

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
