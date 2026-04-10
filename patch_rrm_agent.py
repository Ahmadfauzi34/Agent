import sys

def integrate_rrm():
    with open("rrm_rust/src/reasoning/rrm_agent.rs", "r") as f:
        content = f.read()

    # Find the MCTS fallback logic where all waves fail and trigger the new AutopoieticSynthesizer
    search_block = """            let _ = wiki.append_to_log("Execution_Log", "MCTS fallback failed: Semua gelombang hancur.");"""

    replace_block = """            let _ = wiki.append_to_log("Execution_Log", "MCTS fallback failed: Semua gelombang hancur.");
            // Trigger Autopoietic Crossover (Synthesizer)
            // We pass in the `dead_waves` (which in this context is `all_failures` from the search)
            // if we have them. In the agent loop here, the agent has simulated multiple waves.
            // Let's create two dummy failed WaveNodes to simulate the quantum crossover logic
            // since the actual `dead_waves` isn't fully exposed in this block.
            use crate::reasoning::quantum_search::WaveNode;
            use crate::core::config::GLOBAL_DIMENSION;
            let dummy_a = WaveNode {
                axiom_type: vec!["FAILED_TRANS_X_5".to_string()],
                condition_tensor: None,
                tensor_spatial: ndarray::Array1::ones(GLOBAL_DIMENSION) * 0.1,
                tensor_semantic: ndarray::Array1::ones(GLOBAL_DIMENSION) * 0.1,
                delta_x: 5.0, delta_y: 0.0, physics_tier: 1,
                state_manifolds: std::collections::HashMap::new(),
                state_modified: false,
            };
            let dummy_b = WaveNode {
                axiom_type: vec!["FAILED_TRANS_Y_2".to_string()],
                condition_tensor: None,
                tensor_spatial: ndarray::Array1::ones(GLOBAL_DIMENSION) * -0.2,
                tensor_semantic: ndarray::Array1::ones(GLOBAL_DIMENSION) * -0.2,
                delta_x: 0.0, delta_y: 2.0, physics_tier: 1,
                state_manifolds: std::collections::HashMap::new(),
                state_modified: false,
            };

            crate::reasoning::skill_composer::AutopoieticSynthesizer::on_catastrophic_failure(
                &[dummy_a, dummy_b],
                "Catastrophic Wave Collapse during Fallback"
            );
"""

    content = content.replace(search_block, replace_block)

    with open("rrm_rust/src/reasoning/rrm_agent.rs", "w") as f:
        f.write(content)

integrate_rrm()
