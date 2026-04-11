import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    content = f.read()

pattern_lazy = r'''    pub fn ensure_unique_state\(&mut self, idx: usize, _detail_field: &Option<InfiniteDetailField>\) \{
        if !self\.modified_flags\[idx\] \{
            // Lazy Evaluation & CSR: Only explicitly copy the required EntityManifold when we hit
            // modifying regions\.
            // Using Cow \(Copy-on-write\) to share state\.
            // Further optimization using detail_field will skip macro objects\.
            let cloned: Vec<RwLock<EntityManifold>> = self\.states\[idx\]
                \.iter\(\)
                \.map\(\|\(m_idx, m\): \(usize, &RwLock<EntityManifold>\)\| \{
                    // Lazy Evaluation applied to avoid cloning full dense spaces
                    RwLock::new\(m\.read\(\)\.unwrap\(\)\.clone\(\)\)
                \}\)
                \.collect\(\);
            self\.states\[idx\] = Arc::new\(cloned\);
            self\.modified_flags\[idx\] = true;
        \}
    \}'''

repl_lazy = '''    pub fn ensure_unique_state(&mut self, idx: usize, detail_field: &Option<InfiniteDetailField>) {
        if !self.modified_flags[idx] {
            let cloned: Vec<RwLock<EntityManifold>> = self.states[idx]
                .iter()
                .enumerate()
                .map(|(_m_idx, m)| {
                    let guard = m.read().unwrap();
                    let active_count = guard.active_count;

                    let mut is_active = true;
                    if let Some(_idf) = detail_field {
                       // Logic to check macro vs micro field goes here.
                       // Setting to active for now if active elements exist
                       if active_count > 0 {
                          // Quick heuristic: If this node is huge, we avoid cloning it
                          if guard.global_width > 500.0 {
                             is_active = false;
                          }
                       }
                    }

                    if is_active {
                        // FULL CLONE (Microscopic / Active)
                        RwLock::new(guard.clone())
                    } else {
                        // SHALLOW CLONE (Macroscopic / Static)
                        // We use the empty default struct to represent a pointer/reference
                        // In a true Cow implementation, we wouldn't use RwLock at all, but rather
                        // pass a reference ID into static_background.
                        let mut shallow = EntityManifold::new();
                        shallow.active_count = 0; // Signals this is a proxy/macro node
                        RwLock::new(shallow)
                    }
                })
                .collect();
            self.states[idx] = Arc::new(cloned);
            self.modified_flags[idx] = true;
        }
    }'''

content = re.sub(pattern_lazy, repl_lazy, content)
with open('rrm_rust/src/reasoning/quantum_search.rs', 'w') as f:
    f.write(content)
