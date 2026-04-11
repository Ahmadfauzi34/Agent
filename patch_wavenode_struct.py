import re

with open('rrm_rust/src/core/infinite_detail.rs', 'r') as f:
    content = f.read()

content = content.replace("    pub region_active: Vec<bool>,\n    pub region_active: Vec<bool>,", "    pub region_active: Vec<bool>,")
with open('rrm_rust/src/core/infinite_detail.rs', 'w') as f:
    f.write(content)


def replace_wavenode_init(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # regex to find WaveNode { ... } and add static_background if not exists
    # It's safer to just inject it before `state_manifolds` or at the end

    # rrm_agent.rs
    content = re.sub(
        r'''(WaveNode\s*\{[^\}]*?)(state_manifolds:)''',
        r'\1static_background: std::sync::Arc::new(crate::core::infinite_detail::CoarseData { regions: vec![], complexity_map: vec![], region_active: vec![] }),\n                            \2',
        content,
        flags=re.DOTALL
    )
    with open(file_path, 'w') as f:
        f.write(content)

replace_wavenode_init('rrm_rust/src/reasoning/quantum_search.rs')
replace_wavenode_init('rrm_rust/src/reasoning/rrm_agent.rs')
replace_wavenode_init('rrm_rust/src/reasoning/skill_library.rs')
