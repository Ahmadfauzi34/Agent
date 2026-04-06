import re

with open('rrm_rust/src/reasoning/structures.rs', 'r') as f:
    content = f.read()

impl_add = """
    pub fn description(&self) -> String {
        format!("Axiom({})", self.name)
    }

    pub fn short_name(&self) -> &str {
        &self.name
    }

    pub fn similarity(&self, other: &Self) -> f32 {
        if self.name == other.name { 1.0 } else { 0.0 }
    }
"""

content = content.replace(
    'pub fn identity() -> Self {\n        use crate::core::config::GLOBAL_DIMENSION;\n        Self::new("IDENTITY", 0, Array1::zeros(GLOBAL_DIMENSION), Array1::zeros(GLOBAL_DIMENSION), 0.0, 0.0)\n    }',
    'pub fn identity() -> Self {\n        use crate::core::config::GLOBAL_DIMENSION;\n        Self::new("IDENTITY", 0, Array1::zeros(GLOBAL_DIMENSION), Array1::zeros(GLOBAL_DIMENSION), 0.0, 0.0)\n    }\n' + impl_add
)

with open('rrm_rust/src/reasoning/structures.rs', 'w') as f:
    f.write(content)
