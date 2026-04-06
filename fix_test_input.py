import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = "generate_smart_crop_axioms(test_input);"
replacement = "generate_smart_crop_axioms(&test_manifold);"

content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
