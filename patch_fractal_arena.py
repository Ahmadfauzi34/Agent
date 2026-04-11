import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    content = f.read()

pattern = r'''impl FractalArena \{
    pub fn new\(capacity: usize\) -> Self \{
        Self \{
            ids: Vec::with_capacity\(capacity\),
            parents: Vec::with_capacity\(capacity\),
            children_ranges: Vec::with_capacity\(capacity\),
            scales: Vec::with_capacity\(capacity\),
            amplitudes: Vec::with_capacity\(capacity\),
            phases: Vec::with_capacity\(capacity\),
            states: Vec::with_capacity\(capacity\),
            modified_flags: Vec::with_capacity\(capacity\),'''

repl = '''impl FractalArena {
    pub fn new(capacity: usize) -> Self {
        Self {
            ids: Vec::with_capacity(capacity),
            parents: Vec::with_capacity(capacity),
            children_ranges: Vec::with_capacity(capacity),
            scales: Vec::with_capacity(capacity),
            static_backgrounds: Vec::with_capacity(capacity),
            amplitudes: Vec::with_capacity(capacity),
            phases: Vec::with_capacity(capacity),
            states: Vec::with_capacity(capacity),
            modified_flags: Vec::with_capacity(capacity),'''

content = re.sub(pattern, repl, content)

with open('rrm_rust/src/reasoning/quantum_search.rs', 'w') as f:
    f.write(content)
