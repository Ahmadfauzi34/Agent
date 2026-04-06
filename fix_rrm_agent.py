import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = "let delta = &consensus_delta;"
replacement = "let consensus_delta = StructuralAnalyzer::consensus(&deltas);\n        let delta = &consensus_delta;"

if "let delta = &consensus_delta;" in content and "let consensus_delta = StructuralAnalyzer::consensus(&deltas);\n        let delta = &consensus_delta;" not in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
