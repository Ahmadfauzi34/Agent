import re

with open('rrm_rust/src/core/infinite_detail.rs', 'r') as f:
    content = f.read()

pattern = r'''#\[derive\(Clone\)\]
pub struct CoarseData \{
    pub signatures: std::sync::Arc<Vec<ndarray::Array1<f32>>>,
\}'''

repl = '''#[derive(Clone)]
pub struct CoarseData {
    pub regions: std::sync::Arc<Vec<MacroRegion>>,
    pub complexity_map: Vec<f32>,
    pub region_active: Vec<bool>,
    pub signatures: std::sync::Arc<Vec<ndarray::Array1<f32>>>,
}'''

content = re.sub(pattern, repl, content)

with open('rrm_rust/src/core/infinite_detail.rs', 'w') as f:
    f.write(content)

with open('rrm_rust/src/reasoning/skill_composer.rs', 'r') as f:
    sc = f.read()
sc = sc.replace("let mut sq_sum = 0.0;", "let mut sq_sum: f32 = 0.0;")
sc = sc.replace("let mut sq_sum2 = 0.0;", "let mut sq_sum2: f32 = 0.0;")
with open('rrm_rust/src/reasoning/skill_composer.rs', 'w') as f:
    f.write(sc)
