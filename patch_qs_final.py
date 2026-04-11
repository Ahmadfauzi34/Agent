import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    content = f.read()

content = content.replace("static_background: static_background.unwrap_or_else(|| Arc::new(crate::core::infinite_detail::CoarseData { regions: std::sync::Arc::new(vec![]), signatures: std::sync::Arc::new(vec![]) })),", "static_background: arena.scales[current_idx].clone(), // Dummy replace, let's fix it properly")

pattern = r'''                    let result_wave = WaveNode \{
                        axiom_type: arena\.axiom_path\[current_idx\]\.clone\(\),
                        condition_tensor: arena\.action_condition\[current_idx\]\.clone\(\),
                        tensor_spatial: arena\.action_spatial\[current_idx\]\.clone\(\),
                        tensor_semantic: arena\.action_semantic\[current_idx\]\.clone\(\),
                        delta_x: arena\.action_dx\[current_idx\],
                        delta_y: arena\.action_dy\[current_idx\],
                        physics_tier: arena\.action_tier\[current_idx\],
                        static_background: arena\.scales\[current_idx\]\.clone\(\), // Dummy replace, let's fix it properly
                            state_manifolds: arena\.states\[current_idx\]\.clone\(\),
                        state_modified: arena\.modified_flags\[current_idx\],
                        probability: arena\.amplitudes\[current_idx\],
                        depth: arena\.children_ranges\[current_idx\]\.1,
                    \};'''

repl = '''                    let result_wave = WaveNode {
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
                    };'''

content = re.sub(pattern, repl, content)

with open('rrm_rust/src/reasoning/quantum_search.rs', 'w') as f:
    f.write(content)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    rrm = f.read()

rrm = rrm.replace("initial_manifolds,", "initial_manifolds,\n                    None,")
rrm = rrm.replace("None,\n                    None,", "None,") # Prevent double inserts

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(rrm)
