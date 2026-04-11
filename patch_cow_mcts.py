import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    content = f.read()

# Fix WaveNode initializers to inherit background and correctly pass it
# We need to modify `WaveNode::new` to take an Arc<CoarseData> parameter
pattern = r'''    pub fn new\(
        axiom_type: String,
        condition_tensor: Option<Array1<f32>>,
        tensor_spatial: Array1<f32>,
        tensor_semantic: Array1<f32>,
        delta_x: f32,
        delta_y: f32,
        physics_tier: u8,
        initial_manifolds: Arc<Vec<RwLock<EntityManifold>>>,
    \) -> Self \{'''

repl = '''    pub fn new(
        axiom_type: String,
        condition_tensor: Option<Array1<f32>>,
        tensor_spatial: Array1<f32>,
        tensor_semantic: Array1<f32>,
        delta_x: f32,
        delta_y: f32,
        physics_tier: u8,
        initial_manifolds: Arc<Vec<RwLock<EntityManifold>>>,
        static_background: Option<Arc<crate::core::infinite_detail::CoarseData>>,
    ) -> Self {'''

content = re.sub(pattern, repl, content)

pattern_init = r'''        Self \{
            axiom_type: vec!\[String::new\(\)\],
            condition_tensor: None,
            tensor_spatial: Array1::zeros\(GLOBAL_DIMENSION\),
            tensor_semantic: Array1::zeros\(GLOBAL_DIMENSION\),
            delta_x: 0\.0,
            delta_y: 0\.0,
            physics_tier,
            static_background: std::sync::Arc::new\(crate::core::infinite_detail::CoarseData \{ regions: std::sync::Arc::new\(vec!\[\]\), signatures: std::sync::Arc::new\(vec!\[\]\) \}\),
            state_manifolds: initial_manifolds,
            state_modified: false,
            probability: 1\.0,
            depth: 1,
        \}'''

repl_init = '''        Self {
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
        }'''
content = re.sub(pattern_init, repl_init, content)

with open('rrm_rust/src/reasoning/quantum_search.rs', 'w') as f:
    f.write(content)

# We have to fix WaveNode callers across rrm_rust
import os

def fix_wavenode_callers(file_path):
    with open(file_path, 'r') as f:
        c = f.read()

    # regex for WaveNode::new calls
    c = re.sub(
        r'''WaveNode::new\(\s*(.*?),\s*(.*?),\s*(.*?),\s*(.*?),\s*(.*?),\s*(.*?),\s*(.*?),\s*(.*?)\s*\)''',
        r'WaveNode::new(\1, \2, \3, \4, \5, \6, \7, \8, None)',
        c
    )
    with open(file_path, 'w') as f:
        f.write(c)

# We don't need to recursively call fix_wavenode_callers everywhere because some might be correctly formatted WaveNode { ... } structs!
# Instead, we just use regex on the `ensure_unique_state` method.
