import re

with open('rrm_rust/src/reasoning/skill_composer.rs', 'r') as f:
    content = f.read()

target = "use crate::memory::mental_replay::DreamScenarioSoA;"
replacement = "// no DreamScenarioSoA import needed"
content = content.replace(target, replacement)

# also fix DreamScenarioSoA reference in validate_in_dreams
content = content.replace("dream_scenarios: &[DreamScenarioSoA],", "dream_scenarios: &[crate::memory::mental_replay::TaskMemorySoA],")

# Fix dream.dream_mass etc
content = content.replace("if dream.dream_mass == 0.0", "if dream.task_mass == 0.0")

with open('rrm_rust/src/reasoning/skill_composer.rs', 'w') as f:
    f.write(content)
