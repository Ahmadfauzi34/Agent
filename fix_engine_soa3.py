import re

with open('rrm_rust/src/reasoning/counterfactual_engine.rs', 'r') as f:
    content = f.read()

target = "pub enum SequenceResult {\n    Complete(SimulationResult),\n}"
replacement = """pub enum SequenceResult {
    Complete(SimulationResult),
}

impl SequenceResult {
    pub fn is_success(&self) -> bool {
        match self {
            SequenceResult::Complete(sim) => matches!(sim.outcome, OutcomeStatus::Success),
            _ => false,
        }
    }
}
"""

if "impl SequenceResult" not in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/counterfactual_engine.rs', 'w') as f:
    f.write(content)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    agent_content = f.read()

agent_content = agent_content.replace(
    "plan = Some(best);",
    "plan = Some(best.clone());"
)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(agent_content)
