use crate::core::entity_manifold::EntityManifold;
use std::sync::Arc;

/// Copy-on-Write (CoW) Wrapper for EntityManifold.
/// This allows Multiverse Simulation (MCTS/Grover) to spawn thousands of theoretical universes
/// cheaply by sharing memory until an explicit mutation (physics step) requires a clone.
pub struct CowManifold {
    manifold: Arc<EntityManifold>,
}

impl CowManifold {
    pub fn new(manifold: EntityManifold) -> Self {
        Self {
            manifold: Arc::new(manifold),
        }
    }

    /// Read-only access to the shared manifold
    pub fn read(&self) -> &EntityManifold {
        &self.manifold
    }

    /// Mutable access. Clones the manifold *only* if there are other strong references.
    /// This is the "Write" part of Copy-on-Write.
    pub fn write(&mut self) -> &mut EntityManifold {
        Arc::make_mut(&mut self.manifold)
    }

    /// Fork this universe. Extremely cheap, just increments an atomic reference count.
    pub fn fork(&self) -> Self {
        Self {
            manifold: Arc::clone(&self.manifold),
        }
    }
}

impl Clone for CowManifold {
    fn clone(&self) -> Self {
        self.fork()
    }
}
