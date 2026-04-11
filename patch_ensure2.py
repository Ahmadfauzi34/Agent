import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    content = f.read()

pattern_lazy2 = r'''    pub fn ensure_unique_state\(&mut self, _detail_field: &Option<InfiniteDetailField>\) \{
        if !self\.state_modified \{
            // Lazy Evaluation: Only clone the base elements if we are actually editing them
            // By doing this we allow MCTS branches to retain their cheap reference to the initial state
            // and lazy clone when modified\.
            // Further optimization using detail_field will skip macro objects\.
            let cloned: Vec<RwLock<EntityManifold>> = self
                \.state_manifolds
                \.iter\(\)
                \.map\(\|\(idx, m\): \(usize, &RwLock<EntityManifold>\)\| \{
                    // Note: Here is where the Lazy Evaluation via detail_field would determine the required level\.
                    RwLock::new\(m\.read\(\)\.unwrap\(\)\.clone\(\)\)
                \}\)
                \.collect\(\);
            self\.state_manifolds = Arc::new\(cloned\);
            self\.state_modified = true;
        \}
    \}'''

repl_lazy2 = '''    pub fn ensure_unique_state(&mut self, detail_field: &Option<InfiniteDetailField>) {
        if !self.state_modified {
            let cloned: Vec<RwLock<EntityManifold>> = self
                .state_manifolds
                .iter()
                .enumerate()
                .map(|(_idx, m)| {
                    let guard = m.read().unwrap();
                    let mut is_active = true;
                    if let Some(_idf) = detail_field {
                       if guard.global_width > 500.0 {
                          is_active = false;
                       }
                    }
                    if is_active {
                       RwLock::new(guard.clone())
                    } else {
                       let mut shallow = EntityManifold::new();
                       shallow.active_count = 0;
                       RwLock::new(shallow)
                    }
                })
                .collect();
            self.state_manifolds = Arc::new(cloned);
            self.state_modified = true;
        }
    }'''

content = re.sub(pattern_lazy2, repl_lazy2, content)
with open('rrm_rust/src/reasoning/quantum_search.rs', 'w') as f:
    f.write(content)
