use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use ndarray::Array1;
use crate::core::config::GLOBAL_DIMENSION;
use crate::core::fhrr::FHRR;
use crate::core::core_seeds::CoreSeeds;

#[derive(Serialize, Deserialize, Debug)]
pub struct SymbolicComponent {
    pub seed: String,
    pub weight: Option<f32>,
    pub phase: Option<f32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MemoryTrace {
    pub axiom_type: String,
    pub composition: Vec<SymbolicComponent>,
    pub entropy_at_creation: f32,
    pub timestamp: u64,
    pub version: String,
    pub dimension_at_creation: usize,
}

pub struct KnowledgeBase {
    memory_dir: String,
    version: String,
}

impl KnowledgeBase {
    pub fn new(dir: &str) -> Self {
        fs::create_dir_all(dir).unwrap_or(());
        Self {
            memory_dir: dir.to_string(),
            version: "v1.0".to_string(),
        }
    }

    pub fn save_axiom(&self, base_name: &str, axiom_type: &str, composition: Vec<SymbolicComponent>, tensor: &Array1<f32>, entropy: f32) {
        let trace_path = Path::new(&self.memory_dir).join(format!("{}.json", base_name));
        let bin_path = Path::new(&self.memory_dir).join(format!("{}.bin", base_name));

        let trace = MemoryTrace {
            axiom_type: axiom_type.to_string(),
            composition,
            entropy_at_creation: entropy,
            timestamp: 0, // Should be actual epoch time
            version: self.version.clone(),
            dimension_at_creation: GLOBAL_DIMENSION,
        };

        // Save JSON
        let json_str = serde_json::to_string_pretty(&trace).unwrap();
        fs::write(trace_path, json_str).unwrap();

        // Save Bin (Float32Array bytes equivalent)
        let bytes: Vec<u8> = tensor.iter().flat_map(|&f| f.to_ne_bytes().to_vec()).collect();
        fs::write(bin_path, bytes).unwrap();

        println!("[Rust KnowledgeBase] Eksport Axiom '{}' berhasil.", axiom_type);
    }
}
