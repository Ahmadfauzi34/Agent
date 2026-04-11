import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    qs = f.read()

# Make WaveNode construct actually thread its parent's static_background if one is not explicitly given:
qs = qs.replace('''        Self {
            axiom_type: vec![String::new()],
            condition_tensor: None,
            tensor_spatial: Array1::zeros(GLOBAL_DIMENSION),
            tensor_semantic: Array1::zeros(GLOBAL_DIMENSION),
            delta_x: 0.0,
            delta_y: 0.0,
            physics_tier,
            static_background: static_background.unwrap_or_else(|| std::sync::Arc::new(crate::core::infinite_detail::CoarseData { regions: std::sync::Arc::new(vec![]), signatures: std::sync::Arc::new(vec![]) })),
            state_manifolds: initial_manifolds,
            state_modified: false,
            probability: 1.0,
            depth: 1,
        }''', '''        Self {
            axiom_type: vec![String::new()],
            condition_tensor: None,
            tensor_spatial: Array1::zeros(GLOBAL_DIMENSION),
            tensor_semantic: Array1::zeros(GLOBAL_DIMENSION),
            delta_x: 0.0,
            delta_y: 0.0,
            physics_tier,
            static_background: static_background.unwrap_or_else(|| std::sync::Arc::new(crate::core::infinite_detail::CoarseData { regions: std::sync::Arc::new(vec![]), signatures: std::sync::Arc::new(vec![]) })),
            state_manifolds: initial_manifolds,
            state_modified: false,
            probability: 1.0,
            depth: 1,
        }''')

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
                        static_background: arena.scales[current_idx].clone(), // Use thread local pointer to share memory
                        state_manifolds: arena.states[current_idx].clone(),
                        state_modified: arena.modified_flags[current_idx],
                        probability: arena.amplitudes[current_idx],
                        depth: arena.children_ranges[current_idx].1,
                    };''',
    qs
)

# And fix the scales variable mismatch, it was CoarseData we want to share
qs = qs.replace("pub scales: Vec<FractalScale>,", "pub scales: Vec<FractalScale>,\n    pub static_backgrounds: Vec<Arc<crate::core::infinite_detail::CoarseData>>,")
qs = qs.replace("pub fn new(max_capacity: usize) -> Self {", "pub fn new(max_capacity: usize) -> Self {")
qs = qs.replace("scales: vec![", "static_backgrounds: vec![Arc::new(crate::core::infinite_detail::CoarseData { regions: Arc::new(vec![]), signatures: Arc::new(vec![]) }); max_capacity],\n            scales: vec![")
qs = qs.replace("static_background: arena.scales[current_idx].clone(), // Use thread local pointer to share memory", "static_background: arena.static_backgrounds[current_idx].clone(),")
qs = qs.replace("arena.action_tier[root_idx] = wave.physics_tier;", "arena.action_tier[root_idx] = wave.physics_tier;\n                arena.static_backgrounds[root_idx] = wave.static_background.clone();")

with open('rrm_rust/src/reasoning/quantum_search.rs', 'w') as f:
    f.write(qs)
