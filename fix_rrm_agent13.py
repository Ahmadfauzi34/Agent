import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = "let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;"
if target in content:
    # Remove the bottom declaration of plan
    lines = content.split('\n')
    new_lines = []
    for i, line in enumerate(lines):
        if "let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;" in line and i > 200:
            continue
        new_lines.append(line)

    content = '\n'.join(new_lines)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
