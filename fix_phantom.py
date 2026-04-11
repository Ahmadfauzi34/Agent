import os

filepath = "rrm_rust/src/reasoning/skill_composer.rs"
with open(filepath, "r") as f:
    content = f.read()

content = content.replace(
"""        let dynamic_axiom = Axiom {
            name: skill_id.clone(),
            tier: 1, // Primary tier
            condition_tensor: None,
            delta_spatial: novel_spatial,
            delta_semantic: novel_semantic,
            delta_x: node_a.delta_x * 0.6 + node_b.delta_x * 0.4,
            delta_y: node_a.delta_y * 0.6 + node_b.delta_y * 0.4,
        };""",
"""        let dynamic_axiom = Axiom {
            name: skill_id.clone(),
            tier: 1, // Primary tier
            condition_tensor: None,
            delta_spatial: novel_spatial,
            delta_semantic: novel_semantic,
            delta_x: node_a.delta_x * 0.6 + node_b.delta_x * 0.4,
            delta_y: node_a.delta_y * 0.6 + node_b.delta_y * 0.4,
            _state: std::marker::PhantomData,
        };"""
)

with open(filepath, "w") as f:
    f.write(content)
