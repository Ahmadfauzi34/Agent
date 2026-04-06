import re

with open('rrm_rust/src/reasoning/structures.rs', 'r') as f:
    content = f.read()

target = "crate::self_awareness::skill_ontology::SkillCapability"
replacement = "crate::self_awareness::skill_ontology::SkillUsage"

if target in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/structures.rs', 'w') as f:
    f.write(content)
