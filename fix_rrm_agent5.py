import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = "let planner = HierarchicalPlanner::from_delta(&consensus_delta, &self.ontology);"
replacement = "let mut planner = crate::reasoning::hierarchical_planner::HierarchicalPlanner::from_delta(&consensus_delta, &self.ontology);"

if target in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
