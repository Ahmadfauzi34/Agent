import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = "let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;"
if target in content:
    content = content.replace(target, "")

target_insert = "let mut promising = Vec::new();"
replacement_insert = "let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;\n        let mut promising = Vec::new();"
content = content.replace(target_insert, replacement_insert)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
