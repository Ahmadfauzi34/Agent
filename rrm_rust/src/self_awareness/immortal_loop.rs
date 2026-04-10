use std::path::{Path, PathBuf};
use crate::core::entity_manifold::EntityManifold;

pub struct KVImmortalEngine {
    root_dir: PathBuf,
}

impl KVImmortalEngine {
    pub fn new(base_dir: &Path, _name: &str) -> Self {
        Self {
            root_dir: base_dir.to_path_buf(),
        }
    }

    pub fn branch(&self, name: &str) -> Self {
        Self {
            root_dir: self.root_dir.join(name),
        }
    }

    pub fn append_event(&self, _event: SoulEvent) {
        // Dummy
    }

    pub fn hibernate(&self, _state: &EntityManifold) {
        // Dummy
    }

    pub fn resurrect(&mut self) -> Result<(), String> {
        Ok(())
    }
}


pub enum SoulEvent {
    TaskAttempted { task_id: String },
    TaskSolved { task_id: String },
    MctsFailed { task_id: String },
}
