use ndarray::{Array1, ArrayViewMut1, s};
use crate::core::config::{GLOBAL_DIMENSION, MAX_ENTITIES};

/// Struktur SoA (Structure of Arrays) untuk Quantum Entity Manifold.
/// Didesain untuk Zero-GC dan cache locality di L1/L2.
pub struct EntityManifold {
    pub active_count: usize,
    pub global_width: f32,
    pub global_height: f32,

    pub tensors: Vec<f32>,     // Ukuran: MAX_ENTITIES * GLOBAL_DIMENSION
    pub ids: Vec<String>,      // Ukuran: MAX_ENTITIES
    pub masses: Vec<f32>,      // Ukuran: MAX_ENTITIES
    pub tokens: Vec<i32>,      // Ukuran: MAX_ENTITIES

    // Spans / Bounding Boxes Anisotropik
    pub spans_x: Vec<f32>,
    pub spans_y: Vec<f32>,

    // Pusat Massa Kinetik / Scalar Momentum
    pub centers_x: Vec<f32>,
    pub centers_y: Vec<f32>,
    pub momentums_x: Vec<f32>,
    pub momentums_y: Vec<f32>,

    // Status Jeratan (Entanglement)
    pub entanglement_status: Vec<f32>,
}

impl EntityManifold {
    pub fn new() -> Self {
        Self {
            active_count: 0,
            global_width: 0.0,
            global_height: 0.0,

            tensors: vec![0.0; MAX_ENTITIES * GLOBAL_DIMENSION],
            ids: vec![String::new(); MAX_ENTITIES],
            masses: vec![0.0; MAX_ENTITIES],
            tokens: vec![0; MAX_ENTITIES],

            spans_x: vec![0.0; MAX_ENTITIES],
            spans_y: vec![0.0; MAX_ENTITIES],
            centers_x: vec![0.0; MAX_ENTITIES],
            centers_y: vec![0.0; MAX_ENTITIES],
            momentums_x: vec![0.0; MAX_ENTITIES],
            momentums_y: vec![0.0; MAX_ENTITIES],
            entanglement_status: vec![0.0; MAX_ENTITIES],
        }
    }

    /// Mendapatkan mutable view dari sebuah tensor entitas tertentu
    pub fn get_tensor_mut(&mut self, index: usize) -> ArrayViewMut1<f32> {
        let offset = index * GLOBAL_DIMENSION;
        ArrayViewMut1::from(&mut self.tensors[offset..offset + GLOBAL_DIMENSION])
    }

    /// Mendapatkan salinan array tensor (untuk dibaca)
    pub fn get_tensor(&self, index: usize) -> Array1<f32> {
        let offset = index * GLOBAL_DIMENSION;
        Array1::from_vec(self.tensors[offset..offset + GLOBAL_DIMENSION].to_vec())
    }
}
