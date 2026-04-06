import re

with open('rrm_rust/src/reasoning/hierarchical_inference.rs', 'r') as f:
    content = f.read()

target = """pub struct DeepActiveInferenceEngine;

impl DeepActiveInferenceEngine {
    pub fn new() -> Self {
        Self
    }
}"""

replacement = """pub struct DeepActiveInferenceEngine {
    pub current_mode: SimulationMode,
}

impl DeepActiveInferenceEngine {
    pub fn new() -> Self {
        Self { current_mode: SimulationMode::StrictVSA }
    }

    pub fn switch_mode(&mut self, mode: SimulationMode) {
        self.current_mode = mode;
    }
}"""

content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/hierarchical_inference.rs', 'w') as f:
    f.write(content)
