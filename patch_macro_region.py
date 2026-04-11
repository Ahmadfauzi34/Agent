import re

with open('rrm_rust/src/core/infinite_detail.rs', 'r') as f:
    content = f.read()

pattern = r'''#\[derive\(Clone\)\]
pub struct CoarseData \{
    pub regions: std::sync::Arc<Vec<MacroRegion>>,
    pub complexity_map: Vec<f32>,
    pub region_active: Vec<bool>,
    pub signatures: std::sync::Arc<Vec<ndarray::Array1<f32>>>,
\}'''

repl = '''#[derive(Clone)]
pub struct CoarseData {
    pub regions: std::sync::Arc<Vec<crate::core::infinite_detail::MacroRegion>>,
    pub complexity_map: Vec<f32>,
    pub region_active: Vec<bool>,
    pub signatures: std::sync::Arc<Vec<ndarray::Array1<f32>>>,
}'''

content = re.sub(pattern, repl, content)
with open('rrm_rust/src/core/infinite_detail.rs', 'w') as f:
    f.write(content)

def fix_coarse(file):
    with open(file, 'r') as f:
        c = f.read()
    c = c.replace("crate::core::infinite_detail::CoarseData { regions: vec![].into(), complexity_map: vec![], region_active: vec![] }", "crate::core::infinite_detail::CoarseData { regions: std::sync::Arc::new(vec![]), complexity_map: vec![], region_active: vec![], signatures: std::sync::Arc::new(vec![]) }")
    c = c.replace("crate::core::infinite_detail::CoarseData { regions: vec![], complexity_map: vec![], region_active: vec![] }", "crate::core::infinite_detail::CoarseData { regions: std::sync::Arc::new(vec![]), complexity_map: vec![], region_active: vec![], signatures: std::sync::Arc::new(vec![]) }")
    # Also fix map closure explicit type if it exists:
    c = re.sub(r'\.map\(\|s\| s\.as_str\(\)\)', '.map(|s: &String| s.as_str())', c)
    with open(file, 'w') as f:
        f.write(c)

fix_coarse('rrm_rust/src/reasoning/quantum_search.rs')
fix_coarse('rrm_rust/src/reasoning/rrm_agent.rs')
fix_coarse('rrm_rust/src/reasoning/skill_library.rs')
