import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    content = f.read()

pattern1 = r'''    pub fn ensure_unique_state\(&mut self\) \{
        if !self\.state_modified \{
            let cloned: Vec<RwLock<EntityManifold>> = self
                \.state_manifolds
                \.iter\(\)
                \.map\(\|m: &RwLock<EntityManifold>\| RwLock::new\(m\.read\(\)\.unwrap\(\)\.clone\(\)\)\)
                \.collect\(\);
            self\.state_manifolds = Arc::new\(cloned\);
            self\.state_modified = true;
        \}
    \}'''

repl1 = '''    pub fn ensure_unique_state(&mut self) {
        if !self.state_modified {
            let cloned: Vec<RwLock<EntityManifold>> = self
                .state_manifolds
                .iter()
                .map(|m: &RwLock<EntityManifold>| {
                    let guard = m.read().unwrap();
                    if guard.masses.len() > 0 && guard.masses[0] > 100.0 {
                        let mut shallow = EntityManifold::new();
                        shallow.active_count = 0;
                        RwLock::new(shallow)
                    } else {
                        RwLock::new(guard.clone())
                    }
                })
                .collect();
            self.state_manifolds = Arc::new(cloned);
            self.state_modified = true;
        }
    }'''

content = re.sub(pattern1, repl1, content)

pattern2 = r'''    pub fn ensure_unique_state\(&mut self, idx: usize\) \{
        if !self\.modified_flags\[idx\] \{
            let cloned: Vec<RwLock<EntityManifold>> = self\.states\[idx\]
                \.iter\(\)
                \.map\(\|m: &RwLock<EntityManifold>\| RwLock::new\(m\.read\(\)\.unwrap\(\)\.clone\(\)\)\)
                \.collect\(\);
            self\.states\[idx\] = Arc::new\(cloned\);
            self\.modified_flags\[idx\] = true;
        \}
    \}'''

repl2 = '''    pub fn ensure_unique_state(&mut self, idx: usize) {
        if !self.modified_flags[idx] {
            let cloned: Vec<RwLock<EntityManifold>> = self.states[idx]
                .iter()
                .map(|m: &RwLock<EntityManifold>| {
                    let guard = m.read().unwrap();
                    // Implementasi Shallow clone memory
                    if guard.masses.len() > 0 && guard.masses[0] > 100.0 { // Heuristic check macro vs micro
                        let mut shallow = EntityManifold::new();
                        shallow.active_count = 0;
                        RwLock::new(shallow)
                    } else {
                        RwLock::new(guard.clone())
                    }
                })
                .collect();
            self.states[idx] = Arc::new(cloned);
            self.modified_flags[idx] = true;
        }
    }'''

content = re.sub(pattern2, repl2, content)

with open('rrm_rust/src/reasoning/quantum_search.rs', 'w') as f:
    f.write(content)
