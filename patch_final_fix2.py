import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    qs = f.read()

qs = qs.replace("static_background: static_background.unwrap_or_else(|| Arc::new(crate::core::infinite_detail::CoarseData { regions: std::sync::Arc::new(vec![]), signatures: std::sync::Arc::new(vec![]) })),", "static_background: std::sync::Arc::new(crate::core::infinite_detail::CoarseData { regions: std::sync::Arc::new(vec![]), signatures: std::sync::Arc::new(vec![]) }),")

with open('rrm_rust/src/reasoning/quantum_search.rs', 'w') as f:
    f.write(qs)


with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    rrm = f.read()

rrm = re.sub(
    r'''                        let mut w_node = WaveNode::new\(
                            winner\.axiom_type\.clone\(\),
                            winner\.condition_tensor\.clone\(\),
                            winner\.tensor_rule\.clone\(\),
                            winner\.tensor_semantic\.clone\(\),
                            winner\.delta_x,
                            winner\.delta_y,
                            winner\.physics_tier,
                            Arc::new\(
                                initial_manifolds
                                    \.iter\(\)
                                    \.map\(\|m\| RwLock::new\(m\.read\(\)\.unwrap\(\)\.clone\(\)\)\)
                                    \.collect\(\),
                            \),
                        \);''',
    '''                        let mut w_node = WaveNode::new(
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
                        );''',
    rrm
)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(rrm)
