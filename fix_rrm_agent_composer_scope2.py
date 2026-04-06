import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = "        let mut phase_count = 0;\n        let max_phases = 20;"
replacement = "        let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;\n        let mut phase_count = 0;\n        let max_phases = 20;"

if "let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;\n        let mut phase_count = 0;\n        let max_phases = 20;" not in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
