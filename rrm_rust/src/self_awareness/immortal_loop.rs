use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::path::PathBuf;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum SoulEvent {
    Genesis { timestamp: String, version: String },
    TaskAttempted { task_id: String, duration_ms: u64 },
    TaskSolved { task_id: String, confidence: f32 },
    MctsFailed { reason: String },
    SkillSynthesized { skill_id: String },
}

#[derive(Clone, Debug, Default)]
pub struct ResurrectableState {
    pub total_uptime: u64,
    pub executions: u64,
    pub crashes_survived: u64,
    pub confidence: f32,
    pub knowledge_count: u64,
    // Tensor state vector, full precision (f32) inside the engine
    pub mental_state_tensor: Vec<f32>,
}

impl ResurrectableState {
    pub fn apply(&mut self, event: &SoulEvent) {
        match event {
            SoulEvent::Genesis { .. } => {
                self.executions = 0;
                self.mental_state_tensor = vec![0.0; 8192];
            }
            SoulEvent::TaskAttempted { duration_ms, .. } => {
                self.executions += 1;
                self.total_uptime += duration_ms;
            }
            SoulEvent::TaskSolved { confidence, .. } => {
                self.confidence = (self.confidence + confidence) / 2.0;
            }
            SoulEvent::MctsFailed { .. } => {
                self.confidence *= 0.9; // Confidence drop
            }
            SoulEvent::SkillSynthesized { .. } => {
                self.knowledge_count += 1;
                self.confidence += 0.05;
            }
        }
    }
}

/// Struktur untuk menyimpan State dalam format biner yang ringan (int8 quantization).
/// Seperti konsep "Buku Hitam", akurasi tensor akan sedikit memudar (lossy)
/// tapi sangat cepat diload sebagai "warm-up".
#[derive(Serialize, Deserialize)]
pub struct QuantizedCache {
    pub executions: u64,
    pub confidence: f32,
    pub knowledge_count: u64,
    pub tensor_scale: f32,
    pub quantized_tensor: Vec<i8>,
}

impl QuantizedCache {
    pub fn from_state(state: &ResurrectableState) -> Self {
        let mut max_val: f32 = 0.0001; // Avoid div by zero
        for &v in &state.mental_state_tensor {
            if v.abs() > max_val {
                max_val = v.abs();
            }
        }

        let scale = max_val / 127.0;
        let mut quantized = Vec::with_capacity(state.mental_state_tensor.len());

        for &v in &state.mental_state_tensor {
            let q = (v / scale).round().clamp(-128.0, 127.0) as i8;
            quantized.push(q);
        }

        Self {
            executions: state.executions,
            confidence: state.confidence,
            knowledge_count: state.knowledge_count,
            tensor_scale: scale,
            quantized_tensor: quantized,
        }
    }

    pub fn to_state(&self) -> ResurrectableState {
        let mut state = ResurrectableState {
            total_uptime: 0,
            executions: self.executions,
            crashes_survived: 0,
            confidence: self.confidence,
            knowledge_count: self.knowledge_count,
            mental_state_tensor: Vec::with_capacity(self.quantized_tensor.len()),
        };

        for &q in &self.quantized_tensor {
            state.mental_state_tensor.push(q as f32 * self.tensor_scale);
        }

        state
    }
}

/// Engine sentral untuk menangani siklus Resurrection & Hibernation.
pub struct ImmortalEngine {
    pub current_state: ResurrectableState,
    pub cache_path: PathBuf,
    pub log_path: PathBuf,
}

impl ImmortalEngine {
    pub fn new(base_dir: PathBuf) -> Self {
        let cache_path = base_dir.join("soul_cache.bin");
        let log_path = base_dir.join("soul_log.md");

        Self {
            current_state: ResurrectableState::default(),
            cache_path,
            log_path,
        }
    }

    /// Resurrection: Membangkitkan state dari biner dan mencocokkan dengan log markdown
    pub fn resurrect(&mut self) {
        println!("🔥 [ImmortalEngine] Memulai Resurrection Protocol...");

        // 1. Coba baca dari fast cache (warmup)
        if self.cache_path.exists() {
            if let Ok(data) = fs::read(&self.cache_path) {
                if let Ok(quantized) = bincode::deserialize::<QuantizedCache>(&data) {
                    self.current_state = quantized.to_state();
                    println!("   -> Warmup sukses dari soul_cache.bin (Lossy Tensor Loaded).");
                }
            }
        } else {
            println!("   -> soul_cache.bin tidak ditemukan. Memulai dari Genesis.");
            let event = SoulEvent::Genesis {
                timestamp: chrono::Utc::now().to_rfc3339(),
                version: "3.2".to_string(),
            };
            self.append_event(event);
        }

        // NOTE: Di implementasi penuh, di sini sistem akan membaca `soul_log.md`
        // dan melakukan replay event-event yang tidak ada di cache.
        self.current_state.crashes_survived += 1;
    }

    /// Menambahkan kejadian ke dalam Soul Log (Markdown) & Update state
    pub fn append_event(&mut self, event: SoulEvent) {
        // Update memori runtime
        self.current_state.apply(&event);

        // Append ke Markdown Log
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_path)
        {
            let timestamp = chrono::Utc::now().to_rfc3339();
            let yaml = serde_json::to_string(&event).unwrap_or_else(|_| "{}".to_string());

            let log_entry = format!("### [{}]\n```json\n{}\n```\n\n", timestamp, yaml);
            let _ = file.write_all(log_entry.as_bytes());
        }
    }

    /// Hibernation: Snapshot state menjadi Quantized int8 biner
    pub fn hibernate(&self) {
        let quantized = QuantizedCache::from_state(&self.current_state);
        if let Ok(encoded) = bincode::serialize(&quantized) {
            let _ = fs::write(&self.cache_path, encoded);
            println!("💤 [ImmortalEngine] Hibernated to soul_cache.bin");
        }
    }
}
