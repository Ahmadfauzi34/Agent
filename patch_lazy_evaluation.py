import re

with open('rrm_rust/src/reasoning/quantum_search.rs', 'r') as f:
    content = f.read()

# Make WaveNode use Arc for macroscopic and cow memory
content = content.replace("pub struct WaveNode {", "pub struct WaveNode {\n    // Status statis (Makroskopik) -> Cukup klon pointer Arc (Shallow)\n    pub static_background: Arc<crate::core::infinite_detail::CoarseData>,\n    // Status dinamis (Mikroskopik) -> Disalin penuh jika dimodifikasi\n")

# This will require a deeper restructuring of ensure_unique_state, apply_axiom, and WaveNode instantiation.
# For now, let's keep it simple: we want Cow-like behavior without ripping apart `apply_axiom`'s requirement
# of a `&mut EntityManifold`. We can actually just use `CowManifold` everywhere if we adapt `apply_axiom`
# or adapt how we pass things into `apply_axiom`.

# Let's fix ensure_unique_state to truly only copy what is needed (Cow style manually)
# Wait, MCTS state is `Vec<Arc<Vec<RwLock<EntityManifold>>>>`.
# Let's change the states to `Vec<Arc<Vec<RwLock<EntityManifold>>>>` but implement a shallow wrapper inside it? No, the struct itself needs `CowManifold` for zero-cost.
# But wait, the advice said:
# pub struct WaveNode {
#    pub static_background: Arc<CoarseData>,
#    pub active_micro_entities: EntityManifold,
# }
