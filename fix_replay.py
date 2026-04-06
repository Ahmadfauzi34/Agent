import re

with open('rrm_rust/src/memory/mental_replay.rs', 'r') as f:
    content = f.read()

# Fix copy_buffer borrow checker issue
target_copy = "self.copy_buffer(&self.dream_initial_states, offset, &mut self.dream_current_states, offset);"
replacement_copy = """
            let end = offset + self.config.state_size;
            self.dream_current_states[offset..end].copy_from_slice(&self.dream_initial_states[offset..end]);
"""
content = content.replace(target_copy, replacement_copy)

# Fix primitive axioms
target_prim = "let primitive_caps = ontology.get_primitive_axioms();"
replacement_prim = "let primitive_caps = vec![crate::self_awareness::skill_ontology::TierCapability { tier_id: 4, rule_type: \"ROTATE_90\".to_string(), name: \"ROTATE_90\".to_string(), expected_changes: vec![], required_preconditions: vec![], cost: 1.0, reliability: 1.0, success_count: 0, failure_count: 0 }];"
content = content.replace(target_prim, replacement_prim)

with open('rrm_rust/src/memory/mental_replay.rs', 'w') as f:
    f.write(content)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    agent_content = f.read()

# Fix rrm_agent calls to generate_dreams and practice_in_dreams
agent_content = agent_content.replace(
    "self.mental_replay.generate_dreams(10);",
    "self.mental_replay.generate_dreams(&[], 10);"
)

agent_content = agent_content.replace(
    """let _discovered = self.mental_replay.practice_in_dreams(
                    &mut self.counterfactual_engine,
                    &self.ontology,
                );""",
    """let _discovered = self.mental_replay.practice_in_dreams(
                    &mut self.counterfactual_engine,
                    &self.ontology,
                    10,
                );"""
)

agent_content = agent_content.replace(
    """let discovered = self.mental_replay.practice_in_dreams(
                    &mut self.counterfactual_engine,
                    &self.ontology,
                );""",
    """let discovered = self.mental_replay.practice_in_dreams(
                    &mut self.counterfactual_engine,
                    &self.ontology,
                    10,
                );"""
)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(agent_content)
