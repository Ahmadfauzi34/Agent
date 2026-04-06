import re

with open('rrm_rust/src/memory/mental_replay.rs', 'r') as f:
    content = f.read()

target_prim = """let primitive_caps = vec![crate::self_awareness::skill_ontology::TierCapability {
            tier_id: 4,
            rule_type: "ROTATE_90".to_string(),
            name: "ROTATE_90".to_string(),
            description: "ROTATE_90".to_string(),
            activation_triggers: vec![],
            preconditions: vec![],
            postconditions: vec![],
            side_effects: vec![],
        }];"""

replacement_prim = """let primitive_caps = vec![crate::self_awareness::skill_ontology::TierCapability {
            tier_id: 4,
            name: "ROTATE_90".to_string(),
            description: "ROTATE_90".to_string(),
            activation_triggers: vec![],
            preconditions: vec![],
            postconditions: vec![],
            side_effects: vec![],
            cost: 1.0,
            historical_success_rate: 1.0,
            typical_signatures: vec![],
        }];"""

content = content.replace(target_prim, replacement_prim)

with open('rrm_rust/src/memory/mental_replay.rs', 'w') as f:
    f.write(content)
