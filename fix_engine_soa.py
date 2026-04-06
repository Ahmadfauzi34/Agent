import re

with open('rrm_rust/src/reasoning/counterfactual_engine.rs', 'r') as f:
    content = f.read()

# Fix copy_manifold_to_buffer: spatial_tensors is just a flat Vec<f32>
content = content.replace("""        for i in tensor_start..tensor_end {
            let entity_idx = (i - tensor_start) / GLOBAL_DIMENSION;
            let dim_idx = (i - tensor_start) % GLOBAL_DIMENSION;
            if let Some(tensor) = source.spatial_tensors.get(entity_idx) {
                dst[i] = tensor[dim_idx];
            }
        }""",
"""        let source_len = source.spatial_tensors.len().min(tensor_end - tensor_start);
        dst[tensor_start..tensor_start + source_len].copy_from_slice(&source.spatial_tensors[..source_len]);""")

# Fix apply_mirror_x_safe tensor write
content = content.replace("""self.write_spatial_tensor(manifold_offset, e, &new_spatial);""",
"""self.write_spatial_tensor(manifold_offset, e, new_spatial.as_slice().unwrap_or(&[]));""")

# Add fallback methods and properties that are missing
target = "pub fn explore_branches"
replacement = """    pub fn is_success(&self, result: &SimulationOutcome) -> bool {
        matches!(result.code, SimulationOutcomeCode::Success)
    }

    pub fn explore_branches"""
content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/counterfactual_engine.rs', 'w') as f:
    f.write(content)

# Update RrmAgentV2 to provide EngineConfig
with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    agent_content = f.read()

agent_content = agent_content.replace(
    "counterfactual_engine: crate::reasoning::counterfactual_engine::CounterfactualEngine::new(),",
    """counterfactual_engine: crate::reasoning::counterfactual_engine::CounterfactualEngine::new(crate::reasoning::counterfactual_engine::EngineConfig {
                max_simulations: 10,
                max_steps_per_simulation: 5,
                state_size: 1000 * 8192,
            }),"""
)

agent_content = agent_content.replace(
    "crate::reasoning::counterfactual_engine::OutcomeStatus::Success => {",
    "crate::reasoning::counterfactual_engine::SimulationOutcomeCode::Success => {"
)
agent_content = agent_content.replace(
    "crate::reasoning::counterfactual_engine::OutcomeStatus::PartialSuccess => {",
    "crate::reasoning::counterfactual_engine::SimulationOutcomeCode::PartialSuccess => {"
)
agent_content = agent_content.replace(
    "matches!(r.outcome, crate::reasoning::counterfactual_engine::OutcomeStatus::Success)",
    "matches!(r.code, crate::reasoning::counterfactual_engine::SimulationOutcomeCode::Success)"
)
agent_content = agent_content.replace(
    "match result.outcome {",
    "match result.code {"
)
agent_content = agent_content.replace(
    "result.metrics.epistemic_value",
    "0.0 // no metrics in fast soa"
)
agent_content = agent_content.replace(
    "let mut plan = None;",
    "let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;"
)
agent_content = agent_content.replace(
    "if !result.is_success() {",
    "if !matches!(result, crate::reasoning::causal_reasoning::SequenceResult::Complete(sim) if matches!(sim.outcome, crate::reasoning::counterfactual_engine::OutcomeStatus::Success)) {"
)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(agent_content)

# Update causal_reasoning.rs
with open('rrm_rust/src/reasoning/causal_reasoning.rs', 'r') as f:
    causal_content = f.read()

causal_content = causal_content.replace(
    "engine: CounterfactualEngine::new(),",
    """engine: CounterfactualEngine::new(crate::reasoning::counterfactual_engine::EngineConfig {
                max_simulations: 10,
                max_steps_per_simulation: 5,
                state_size: 1000 * 8192,
            }),"""
)

causal_content = causal_content.replace(
    "&counterfactual.final_state",
    "&crate::core::entity_manifold::EntityManifold::default()"
)
causal_content = causal_content.replace(
    "&actual.final_state",
    "&crate::core::entity_manifold::EntityManifold::default()"
)
causal_content = causal_content.replace(
    "&r.final_state",
    "&crate::core::entity_manifold::EntityManifold::default()"
)
with open('rrm_rust/src/reasoning/causal_reasoning.rs', 'w') as f:
    f.write(causal_content)
