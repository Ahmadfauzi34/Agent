import re

with open('rrm_rust/src/reasoning/counterfactual_engine.rs', 'r') as f:
    content = f.read()

content = content.replace("crate::reasoning::causal_reasoning::BranchingResult", "BranchingResult")
content = content.replace("crate::reasoning::causal_reasoning::SequenceResult", "SequenceResult")

types_to_add = """
pub enum SequenceResult {
    Complete(SimulationResult),
}
pub struct BranchingResult {
    pub branches: Vec<crate::reasoning::structures::Axiom>,
    pub best_path: Option<Vec<crate::reasoning::structures::Axiom>>,
    pub coverage: f32,
}
"""

if "pub enum SequenceResult" not in content:
    content = content + types_to_add

with open('rrm_rust/src/reasoning/counterfactual_engine.rs', 'w') as f:
    f.write(content)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    agent_content = f.read()

agent_content = agent_content.replace(
    "crate::reasoning::causal_reasoning::SequenceResult",
    "crate::reasoning::counterfactual_engine::SequenceResult"
)

agent_content = agent_content.replace(
    "if let Some(best) = branching.best_path",
    "if let Some(best) = branching.best_path.as_ref()"
)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(agent_content)
