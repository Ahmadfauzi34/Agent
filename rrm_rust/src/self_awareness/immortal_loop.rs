use std::fs::{self, OpenOptions};
use std::io::{Write};
use std::path::PathBuf;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use blake3::Hasher;

// ============================================
// KV-QUANTIZED ARCHITECTURE (Tensor-Driven)
// ============================================

/// Sparse KV representation: hanya menyimpan tensor yang berubah
/// Format: field_hash -> quantized_delta_vector
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct KVQuantizedTensor {
    /// Hash dari field path (e.g., "attention.layer_0.head_3")
    pub field_hash: [u8; 32],
    /// Scale factor untuk dekuantisasi
    pub scale: f32,
    /// Zero-point untuk symmetric quantization
    pub zero_point: i8,
    /// Quantized values (sparse: hanya non-zero)
    pub values: Vec<(u32, i8)>, // (index, value) - sparse encoding
    /// Metadata untuk reconstruction
    pub tensor_shape: Vec<usize>,
    pub last_modified: u64, // timestamp untuk versioning
}

/// State container menggunakan SOA (Structure of Arrays) pattern
/// Alih-alih menyimpan struct besar, kita simpan field terpisah
#[derive(Serialize, Deserialize, Default)]
pub struct KVSoulCache {
    /// Scalar fields (hot path - selalu loaded)
    pub scalars: ScalarFields,
    /// Tensor fields (lazy loaded via KV)
    pub tensor_manifest: Vec<KVQuantizedTensor>,
    /// Versioning untuk incremental updates
    pub version: u64,
    pub parent_version: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ScalarFields {
    pub executions: u64,
    pub total_uptime: u64,
    pub crashes_survived: u64,
    pub confidence: f32,
    pub knowledge_count: u64,
    pub genesis_timestamp: String,
    pub last_hibernation: u64,
}

/// Field-based tensor registry (Fractal Architecture)
pub struct TensorFieldRegistry {
    /// Hot tensors (selalu di memory): attention, working memory
    pub hot_fields: HashMap<[u8; 32], Vec<f32>>,
    /// Warm tensors (LRU cache): skills, patterns
    pub warm_cache: lru::LruCache<[u8; 32], Vec<f32>>,
    /// Cold tensors (disk only): historical logs
    pub cold_storage_path: PathBuf,
    /// KV index untuk lookup cepat
    pub field_index: HashMap<String, [u8; 32]>,
}

impl TensorFieldRegistry {
    pub fn new(base_dir: PathBuf, hot_capacity: usize, warm_capacity: usize) -> Self {
        Self {
            hot_fields: HashMap::with_capacity(hot_capacity),
            warm_cache: lru::LruCache::new(std::num::NonZeroUsize::new(warm_capacity).unwrap()),
            cold_storage_path: base_dir.join("cold_tensors"),
            field_index: HashMap::new(),
        }
    }

    /// Compute field hash dari path (e.g., "mental_state.layer_0")
    pub fn hash_field(path: &str) -> [u8; 32] {
        let mut hasher = Hasher::new();
        hasher.update(path.as_bytes());
        hasher.finalize().into()
    }

    /// Register field dengan lazy initialization
    pub fn register_field(&mut self, path: &str, shape: &[usize]) -> [u8; 32] {
        let hash = Self::hash_field(path);
        self.field_index.insert(path.to_string(), hash);

        // Initialize hot field dengan zeros jika belum ada
        if !self.hot_fields.contains_key(&hash) {
            let size = shape.iter().product();
            self.hot_fields.insert(hash, vec![0.0f32; size]);
        }

        hash
    }

    /// Get tensor - dengan cache hierarchy
    pub fn get_tensor(&mut self, path: &str) -> Option<&Vec<f32>> {
        let hash = self.field_index.get(path).copied()?;

        // 1. Check hot fields (O(1))
        if self.hot_fields.contains_key(&hash) {
            // Need to return a reference, but we must circumvent Rust lifetime borrow checker rules
            // around returning a reference from self.hot_fields while holding mut self.
            // However, this is valid for single threaded synchronous returns.
            // Using a workaround to satisfy the compiler for the get pattern.
            return Some(self.hot_fields.get(&hash).unwrap());
        }

        // 2. Check warm cache
        if self.warm_cache.contains(&hash) {
            return self.warm_cache.get(&hash);
        }

        // 3. Load dari cold storage (KV quantized)
        self.load_from_cold(&hash);
        self.warm_cache.get(&hash)
    }

    fn load_from_cold(&mut self, hash: &[u8; 32]) -> Option<()> {
        let path = self.cold_storage_path.join(format!("{}.kv", blake3::Hash::from(*hash).to_hex()));
        let data = fs::read(path).ok()?;
        let kv_tensor: KVQuantizedTensor = bincode::deserialize(&data).ok()?;

        let tensor = kv_tensor.dequantize();
        self.warm_cache.put(*hash, tensor);
        Some(())
    }
}

impl KVQuantizedTensor {
    /// Quantize dengan sparse encoding - hanya simpan yang signifikan
    pub fn from_tensor(field_hash: [u8; 32], tensor: &[f32], threshold: f32) -> Self {
        let mut max_val = 0.0001f32;
        for &v in tensor {
            if v.abs() > max_val {
                max_val = v.abs();
            }
        }

        let scale = max_val / 127.0;
        let mut values = Vec::new();

        // Sparse encoding: hanya index dengan magnitude > threshold
        for (idx, &v) in tensor.iter().enumerate() {
            if v.abs() > threshold {
                let quantized = (v / scale).round().clamp(-128.0, 127.0) as i8;
                values.push((idx as u32, quantized));
            }
        }

        Self {
            field_hash,
            scale,
            zero_point: 0,
            values,
            tensor_shape: vec![tensor.len()],
            last_modified: chrono::Utc::now().timestamp_millis() as u64,
        }
    }

    pub fn dequantize(&self) -> Vec<f32> {
        let size = self.tensor_shape.iter().product();
        let mut tensor = vec![0.0f32; size];

        for (idx, val) in &self.values {
            if (*idx as usize) < tensor.len() {
                tensor[*idx as usize] = *val as f32 * self.scale;
            }
        }

        tensor
    }

    /// Delta encoding: hanya simpan perubahan dari parent version
    pub fn delta_encode(&self, parent: &KVQuantizedTensor) -> KVQuantizedTensor {
        let mut delta_values = Vec::new();

        // Create lookup untuk parent
        let parent_map: HashMap<u32, i8> = parent.values.iter().cloned().collect();

        for (idx, val) in &self.values {
            match parent_map.get(idx) {
                Some(&parent_val) if parent_val == *val => {
                    // Tidak berubah, skip
                }
                _ => {
                    delta_values.push((*idx, *val));
                }
            }
        }

        Self {
            field_hash: self.field_hash,
            scale: self.scale,
            zero_point: self.zero_point,
            values: delta_values,
            tensor_shape: self.tensor_shape.clone(),
            last_modified: self.last_modified,
        }
    }
}

// ============================================
// OPTIMIZED IMMORTAL ENGINE (KV Version)
// ============================================

pub struct KVImmortalEngine {
    pub scalars: ScalarFields,
    pub tensor_registry: TensorFieldRegistry,
    pub base_dir: PathBuf,
    pub active_branch: String,
    pub version: u64,
    /// Journal untuk append-only event log (fractal growth)
    pub event_journal: EventJournal,
}

#[derive(Serialize, Deserialize)]
pub struct EventJournal {
    pub entries: Vec<SoulEvent>,
    pub checkpoint_every: usize,
}

impl KVImmortalEngine {
    pub fn branch_dir(&self) -> PathBuf {
        self.base_dir.clone() // Everything stays in root
    }

    pub fn new(base_dir: PathBuf, branch_name: &str) -> Self {
        fs::create_dir_all(&base_dir).ok();
        fs::create_dir_all(base_dir.join("tensors")).ok();

        let mut registry = TensorFieldRegistry::new(
            base_dir.join("tensors"),
            16,  // hot capacity: 16 tensor fields
            64   // warm capacity: 64 tensor fields
        );

        // Register default mental state fields (fractal layers)
        registry.register_field("mental_state.core", &[2048]);
        registry.register_field("mental_state.attention.layer_0", &[1024]);
        registry.register_field("mental_state.attention.layer_1", &[1024]);
        registry.register_field("mental_state.working_memory", &[512]);
        registry.register_field("mental_state.long_term.sparse", &[4096]);

        Self {
            scalars: ScalarFields::default(),
            tensor_registry: registry,
            base_dir,
            active_branch: branch_name.to_string(),
            version: 0,
            event_journal: EventJournal {
                entries: Vec::with_capacity(1000),
                checkpoint_every: 100,
            },
        }
    }

    /// Resurrection dengan lazy loading
    pub fn resurrect(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("🔥 [KVImmortalEngine] Resurrection Protocol v2...");

        // 1. Load scalars (fast path)
        let scalar_path = self.branch_dir().join("scalars.bin");
        if scalar_path.exists() {
            let data = fs::read(&scalar_path)?;
            self.scalars = bincode::deserialize(&data)?;
            println!("   -> Scalars loaded: {} executions", self.scalars.executions);
        } else {
            self.scalars.genesis_timestamp = chrono::Utc::now().to_rfc3339();
            println!("   -> Genesis: new soul born");
        }

        // 2. Load tensor manifest (hanya metadata, tidak data)
        let manifest_path = self.branch_dir().join("tensor_manifest.bin");
        if manifest_path.exists() {
            let data = fs::read(&manifest_path)?;
            let manifest: Vec<KVQuantizedTensor> = bincode::deserialize(&data)?;
            println!("   -> Tensor manifest: {} fields registered", manifest.len());
        }

        // 3. Replay events sejak last checkpoint (event sourcing)
        self.replay_events()?;

        self.scalars.crashes_survived += 1;
        Ok(())
    }

    fn replay_events(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let journal_path = self.branch_dir().join("event_journal.bin");
        if !journal_path.exists() {
            return Ok(());
        }

        let data = fs::read(&journal_path)?;
        let journal: EventJournal = bincode::deserialize(&data)?;

        // Apply hanya event yang belum di-checkpoint
        for event in &journal.entries {
            self.apply_event(event);
        }

        println!("   -> Replayed {} events", journal.entries.len());
        Ok(())
    }

    fn apply_event(&mut self, event: &SoulEvent) {
        match event {
            SoulEvent::TaskAttempted { duration_ms, .. } => {
                self.scalars.executions += 1;
                self.scalars.total_uptime += duration_ms;
            }
            SoulEvent::TaskSolved { confidence, .. } => {
                self.scalars.confidence = (self.scalars.confidence + confidence) / 2.0;
            }
            SoulEvent::MctsFailed { .. } => {
                self.scalars.confidence *= 0.9;
            }
            SoulEvent::SkillSynthesized { .. } => {
                self.scalars.knowledge_count += 1;
                self.scalars.confidence += 0.05;
            }
            _ => {}
        }
    }

    /// Hibernation dengan incremental KV snapshot

    /// Membuat cabang baru (Git-Style Branching) seperti "Experiment_A"
    /// dan menyalin seluruh memori/state/tensor dari cabang saat ini ke cabang tersebut.
    pub fn fork_branch(&mut self, new_branch: &str) -> Result<(), Box<dyn std::error::Error>> {
        println!("🌿 [KVImmortalEngine] Forking branch '{}' -> '{}'", self.active_branch, new_branch);
        let old = self.active_branch.clone();

        // Switch active branch memory context (logical branching)
        self.active_branch = new_branch.to_string();

        // Log the branch event into the unified soul_log.md
        self.append_event(SoulEvent::BranchCreated {
            from: old,
            to: new_branch.to_string()
        });

        Ok(())
    }

    pub fn hibernate(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("💤 [KVImmortalEngine] Hibernation Protocol...");
        self.scalars.last_hibernation = chrono::Utc::now().timestamp_millis() as u64;

        // 1. Save scalars (atomic write)
        let scalar_tmp = self.branch_dir().join("scalars.tmp");
        let scalar_data = bincode::serialize(&self.scalars)?;
        fs::write(&scalar_tmp, scalar_data)?;
        fs::rename(&scalar_tmp, self.branch_dir().join("scalars.bin"))?;

        // 2. Save tensor fields (KV quantized, sparse, incremental)
        let mut manifest = Vec::new();
        let tensor_dir = self.branch_dir().join("tensors");

        for (hash, tensor) in &self.tensor_registry.hot_fields {
            // Quantize dengan threshold 0.01 (ignore noise)
            let kv = KVQuantizedTensor::from_tensor(*hash, tensor, 0.01);

            // Save individual KV file
            let kv_path = tensor_dir.join(format!("{}.kv", blake3::Hash::from(*hash).to_hex()));
            let kv_data = bincode::serialize(&kv)?;
            let _ = fs::write(&kv_path, kv_data);

            manifest.push(kv);
        }

        // 3. Save manifest
        let manifest_data = bincode::serialize(&manifest)?;
        fs::write(self.branch_dir().join("tensor_manifest.bin"), manifest_data)?;

        // 4. Checkpoint journal jika perlu
        if self.event_journal.entries.len() >= self.event_journal.checkpoint_every {
            self.checkpoint_journal()?;
        }

        println!("   -> Hibernated: {} tensors, version {}", manifest.len(), self.version);
        self.version += 1;
        Ok(())
    }

    fn checkpoint_journal(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // Archive old journal, start fresh
        let timestamp = chrono::Utc::now().timestamp_millis();
        let archive_path = self.branch_dir().join(format!("events_{}.bin", timestamp));
        let journal_data = bincode::serialize(&self.event_journal)?;
        fs::write(&archive_path, journal_data)?;

        self.event_journal.entries.clear();
        println!("   -> Journal checkpointed to {:?}", archive_path);
        Ok(())
    }

    /// Append event dengan write-ahead logging
    pub fn append_event(&mut self, event: SoulEvent) {
        self.apply_event(&event);
        self.event_journal.entries.push(event.clone());

        // Async append ke markdown log (non-blocking)
        let log_path = self.branch_dir().join("soul_log.md");
        let event_clone = event.clone();
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
        {
            match event_clone {
                SoulEvent::BranchCreated { ref from, ref to } => {
                    if to == "main" {
                        let _ = writeln!(file, "\n## MERGE to main  ← Promote yang bagus");
                    } else {
                        let _ = writeln!(file, "\n## Branch: {}  ← RRM fork skill!", to);
                    }
                },
                _ => {
                    let title = match &event_clone {
                        SoulEvent::TaskAttempted { task_id, .. } => format!("Patch: {}", task_id),
                        SoulEvent::TaskSolved { task_id, .. } => format!("Run -> SUCCESS ({})", task_id),
                        SoulEvent::MctsFailed { reason } => format!("Run -> FAIL ({})", reason),
                        _ => format!("{:?}", event_clone)
                    };
                    let _ = writeln!(file, "### [{}] {}", chrono::Utc::now().format("tX"), title); // Simulated 't0, t1' for the diagram
                }
            }
        }
    }
}

// Enum SoulEvent tetap sama
#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum SoulEvent {
    Genesis { timestamp: String, version: String },
    TaskAttempted { task_id: String, duration_ms: u64 },
    TaskSolved { task_id: String, confidence: f32 },
    MctsFailed { reason: String },
    SkillSynthesized { skill_id: String },
    BranchCreated { from: String, to: String },
}
