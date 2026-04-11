import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    qs = f.read()

# Fix WaveNode macro initialization to use empty struct if not provided (instead of arena.scales...)
qs = qs.replace("static_background: arena.scales[current_idx].clone(), // Dummy replace, let's fix it properly", "static_background: static_background.unwrap_or_else(|| Arc::new(crate::core::infinite_detail::CoarseData { regions: std::sync::Arc::new(vec![]), signatures: std::sync::Arc::new(vec![]) })),")

qs = re.sub(
    r'''                    let result_wave = WaveNode \{
                        axiom_type: arena\.axiom_path\[current_idx\]\.clone\(\),
                        condition_tensor: arena\.action_condition\[current_idx\]\.clone\(\),
                        tensor_spatial: arena\.action_spatial\[current_idx\]\.clone\(\),
                        tensor_semantic: arena\.action_semantic\[current_idx\]\.clone\(\),
                        delta_x: arena\.action_dx\[current_idx\],
                        delta_y: arena\.action_dy\[current_idx\],
                        physics_tier: arena\.action_tier\[current_idx\],
                        static_background: std::sync::Arc::new\(crate::core::infinite_detail::CoarseData \{ regions: std::sync::Arc::new\(vec\!\[\]\), signatures: std::sync::Arc::new\(vec\!\[\]\) \}\),
                        state_manifolds: arena\.states\[current_idx\]\.clone\(\),
                        state_modified: arena\.modified_flags\[current_idx\],
                        probability: arena\.amplitudes\[current_idx\],
                        depth: arena\.children_ranges\[current_idx\]\.1,
                    \};''',
    '''                    let result_wave = WaveNode {
                        axiom_type: arena.axiom_path[current_idx].clone(),
                        condition_tensor: arena.action_condition[current_idx].clone(),
                        tensor_spatial: arena.action_spatial[current_idx].clone(),
                        tensor_semantic: arena.action_semantic[current_idx].clone(),
                        delta_x: arena.action_dx[current_idx],
                        delta_y: arena.action_dy[current_idx],
                        physics_tier: arena.action_tier[current_idx],
                        static_background: std::sync::Arc::new(crate::core::infinite_detail::CoarseData { regions: std::sync::Arc::new(vec![]), signatures: std::sync::Arc::new(vec![]) }),
                        state_manifolds: arena.states[current_idx].clone(),
                        state_modified: arena.modified_flags[current_idx],
                        probability: arena.amplitudes[current_idx],
                        depth: arena.children_ranges[current_idx].1,
                    };''',
    qs
)

with open('rrm_rust/src/reasoning/quantum_search.rs', 'w') as f:
    f.write(qs)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    rrm = f.read()

# Fix WaveNode missing param issue in rrm_agent.rs (line 594)
# Look for the last initial_manifolds.collect() call
rrm = rrm.replace('''                        let mut w_node = WaveNode::new(
                            winner.axiom_type.clone(),
                            winner.condition_tensor.clone(),
                            winner.tensor_rule.clone(),
                            winner.tensor_semantic.clone(),
                            winner.delta_x,
                            winner.delta_y,
                            winner.physics_tier,
                            Arc::new(
                                initial_manifolds
                                    .iter()
                                    .map(|m| RwLock::new(m.read().unwrap().clone()))
                                    .collect(),
                            ),
                        );''', '''                        let mut w_node = WaveNode::new(
                            winner.axiom_type.clone(),
                            winner.condition_tensor.clone(),
                            winner.tensor_rule.clone(),
                            winner.tensor_semantic.clone(),
                            winner.delta_x,
                            winner.delta_y,
                            winner.physics_tier,
                            Arc::new(
                                initial_manifolds
                                    .iter()
                                    .map(|m| RwLock::new(m.read().unwrap().clone()))
                                    .collect(),
                            ),
                            None,
                        );''')

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(rrm)
