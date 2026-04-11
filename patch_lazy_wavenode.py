import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    content = f.read()

pattern_wavenode = r'''pub struct WaveNode \{
    pub axiom_type: Vec<String>, // Now tracks the path of axioms applied
    pub condition_tensor: Option<Array1<f32>>,
    pub tensor_spatial: Array1<f32>,
    pub tensor_semantic: Array1<f32>,
    pub delta_x: f32,
    pub delta_y: f32,
    pub physics_tier: u8,

    // Status Sandbox yang terikat pada gelombang ini \(Fisika saat ini\)
    // Menggunakan Copy-on-Write \(CoW\) untuk menghindari clone memori 39MB yang berlebihan!
    pub state_manifolds: Arc<Vec<RwLock<EntityManifold>>>,
    pub state_modified: bool,'''

repl_wavenode = '''pub struct WaveNode {
    pub axiom_type: Vec<String>, // Now tracks the path of axioms applied
    pub condition_tensor: Option<Array1<f32>>,
    pub tensor_spatial: Array1<f32>,
    pub tensor_semantic: Array1<f32>,
    pub delta_x: f32,
    pub delta_y: f32,
    pub physics_tier: u8,

    // Status statis (Makroskopik) -> Cukup klon pointer Arc (Shallow)
    pub static_background: Arc<crate::core::infinite_detail::CoarseData>,

    // Status dinamis (Mikroskopik) -> Disalin penuh/Copy-on-Write jika dimodifikasi
    pub state_manifolds: Arc<Vec<RwLock<EntityManifold>>>,
    pub state_modified: bool,'''

content = re.sub(pattern_wavenode, repl_wavenode, content)

pattern_wavenode_new = r'''        Self \{
            axiom_type: vec!\[String::new\(\)\],
            condition_tensor: None,
            tensor_spatial: Array1::zeros\(GLOBAL_DIMENSION\),
            tensor_semantic: Array1::zeros\(GLOBAL_DIMENSION\),
            delta_x: 0\.0,
            delta_y: 0\.0,
            physics_tier,
            state_manifolds: initial_manifolds,
            state_modified: false,
            probability: 1\.0,
            depth: 1,
        \}'''

repl_wavenode_new = '''        Self {
            axiom_type: vec![String::new()],
            condition_tensor: None,
            tensor_spatial: Array1::zeros(GLOBAL_DIMENSION),
            tensor_semantic: Array1::zeros(GLOBAL_DIMENSION),
            delta_x: 0.0,
            delta_y: 0.0,
            physics_tier,
            static_background: Arc::new(crate::core::infinite_detail::CoarseData { regions: vec![], complexity_map: vec![], region_active: vec![] }),
            state_manifolds: initial_manifolds,
            state_modified: false,
            probability: 1.0,
            depth: 1,
        }'''

content = re.sub(pattern_wavenode_new, repl_wavenode_new, content)

with open('rrm_rust/src/reasoning/quantum_search.rs', 'w') as f:
    f.write(content)

with open('rrm_rust/src/core/infinite_detail.rs', 'r') as f:
    idf = f.read()

idf = idf.replace("pub struct CoarseData {", "#[derive(Clone)]\npub struct CoarseData {")
idf = idf.replace("pub complexity_map: Vec<f32>,", "pub complexity_map: Vec<f32>,\n    pub region_active: Vec<bool>,")
with open('rrm_rust/src/core/infinite_detail.rs', 'w') as f:
    f.write(idf)
