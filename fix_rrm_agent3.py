import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = "let strategy = self.ontology.can_solve(&consensus_delta).expect(\"No strategy available for this task class\");"
replacement = "let strategy = self.ontology.can_solve(&consensus_delta);"

if target in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
