import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    content = f.read()

# fix the duplicate / broken static_background struct def
content = re.sub(
    r'''    pub static_background: Arc<crate::core::infinite_detail::CoarseData>,\n    \n    // Status dinamis \(Mikroskopik\) -> Disalin penuh/Copy-on-Write jika dimodifikasi\n    pub static_background: std::sync::Arc::new\(crate::core::infinite_detail::CoarseData \{ regions: std::sync::Arc::new\(vec!\[\]\), signatures: std::sync::Arc::new\(vec!\[\]\) \}\),\n                            state_manifolds: Arc<Vec<RwLock<EntityManifold>>>,''',
    '''    pub static_background: Arc<crate::core::infinite_detail::CoarseData>,

    // Status dinamis (Mikroskopik) -> Disalin penuh/Copy-on-Write jika dimodifikasi
    pub state_manifolds: Arc<Vec<RwLock<EntityManifold>>>,''',
    content
)

# fix the type inference map closure
content = content.replace(".map(|m| RwLock::new(m.read().unwrap().clone()))", ".map(|m: &RwLock<EntityManifold>| RwLock::new(m.read().unwrap().clone()))")
content = content.replace(".map(|(idx, m)| {", ".map(|(idx, m): (usize, &RwLock<EntityManifold>)| {")
content = content.replace(".map(|(m_idx, m)| {", ".map(|(m_idx, m): (usize, &RwLock<EntityManifold>)| {")


with open('rrm_rust/src/reasoning/quantum_search.rs', 'w') as f:
    f.write(content)
