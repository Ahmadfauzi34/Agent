import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = """        let mut phase_count = 0;"""
replacement = """
        let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;
        let mut phase_count = 0;"""

if "let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;" not in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
