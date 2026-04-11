import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

content = content.replace('''                        let mut w_node = WaveNode::new(
                            winner.axiom_type.clone(),
                            winner.condition_tensor.clone(),
                            winner.tensor_rule.clone(),
                            winner.tensor_rule.clone(),
                            winner.delta_x,
                            winner.delta_y,
                            winner.physics_tier,
                            std::sync::Arc::new(
                                train_states
                                    .iter()
                                    .map(|(m, _)| std::sync::RwLock::new(m.clone()))
                                    .collect::<Vec<_>>(),
                            ),
                        );''', '''                        let mut w_node = WaveNode::new(
                            winner.axiom_type.clone(),
                            winner.condition_tensor.clone(),
                            winner.tensor_rule.clone(),
                            winner.tensor_rule.clone(),
                            winner.delta_x,
                            winner.delta_y,
                            winner.physics_tier,
                            std::sync::Arc::new(
                                train_states
                                    .iter()
                                    .map(|(m, _)| std::sync::RwLock::new(m.clone()))
                                    .collect::<Vec<_>>(),
                            ),
                            None,
                        );''')

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
