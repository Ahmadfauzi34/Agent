import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    content = f.read()

pattern = r'''        self\.ids\.push\(FractalId \{
            level,
            index: idx as u32,
            path_hash: 0,
        \}\);
        self\.parents\.push\(parent\);
        self\.children_ranges\.push\(\(0, 0\)\);
        self\.scales\.push\(scale\);
        self\.amplitudes\.push\(1\.0\);
        self\.phases\.push\(0\.0\);
        self\.states\.push\(state\);
        self\.modified_flags\.push\(false\);'''

repl = '''        self.ids.push(FractalId {
            level,
            index: idx as u32,
            path_hash: 0,
        });
        self.parents.push(parent);
        self.children_ranges.push((0, 0));
        self.scales.push(scale);
        self.static_backgrounds.push(Arc::new(crate::core::infinite_detail::CoarseData { regions: Arc::new(vec![]), signatures: Arc::new(vec![]) }));
        self.amplitudes.push(1.0);
        self.phases.push(0.0);
        self.states.push(state);
        self.modified_flags.push(false);'''

content = re.sub(pattern, repl, content)

with open('rrm_rust/src/reasoning/quantum_search.rs', 'w') as f:
    f.write(content)
