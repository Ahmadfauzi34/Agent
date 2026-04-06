import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = """let _strategy = self.ontology.can_solve(&consensus_delta);
            .expect("No strategy available for this task class");"""

replacement = "let _strategy = self.ontology.can_solve(&consensus_delta);"

if target in content:
    content = content.replace(target, replacement)
else:
    # Just remove any dangling `.expect(...)` line after `can_solve`
    lines = content.split('\n')
    new_lines = []
    skip = False
    for i, line in enumerate(lines):
        if skip:
            skip = False
            continue
        if "let _strategy = self.ontology.can_solve(&consensus_delta);" in line:
            new_lines.append(line)
            if i + 1 < len(lines) and ".expect(\"No strategy" in lines[i+1]:
                skip = True
        else:
            new_lines.append(line)
    content = '\n'.join(new_lines)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
