use crate::core::config::GLOBAL_DIMENSION;
use ndarray::{Array1, ArrayViewMut1};

/// Struktur SoA (Structure of Arrays) untuk Quantum Entity Manifold.
/// Didesain untuk Zero-GC dan cache locality di L1/L2 secara dinamis.
/// Menggunakan sistem Tri-Tensor: Spatial (Pusat Global), Shape (Pola Lokal), dan Semantic (Warna).
pub struct EntityManifold {
    pub active_count: usize,
    pub global_width: f32,
    pub global_height: f32,

    // 1. Posisi Global (Pusat Massa Absolut di Kanvas)
    pub spatial_tensors: Vec<f32>,

    // 2. Cetak Biru (Blueprint) Relatif (Bentuk lokal dari titik pusat)
    pub shape_tensors: Vec<f32>,

    // 3. Warna / Tipe Material
    pub semantic_tensors: Vec<f32>,

    pub ids: Vec<String>,
    pub masses: Vec<f32>,
    pub tokens: Vec<i32>,

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

impl Clone for EntityManifold {
    fn clone(&self) -> Self {
        Self {
            active_count: self.active_count,
            global_width: self.global_width,
            global_height: self.global_height,
            spatial_tensors: self.spatial_tensors.clone(),
            shape_tensors: self.shape_tensors.clone(),
            semantic_tensors: self.semantic_tensors.clone(),
            ids: self.ids.clone(),
            masses: self.masses.clone(),
            tokens: self.tokens.clone(),
            spans_x: self.spans_x.clone(),
            spans_y: self.spans_y.clone(),
            centers_x: self.centers_x.clone(),
            centers_y: self.centers_y.clone(),
            momentums_x: self.momentums_x.clone(),
            momentums_y: self.momentums_y.clone(),
            entanglement_status: self.entanglement_status.clone(),
        }
    }
}

impl Default for EntityManifold {
    fn default() -> Self {
        Self::new()
    }
}

impl EntityManifold {
    pub fn new() -> Self {
        Self {
            active_count: 0,
            global_width: 0.0,
            global_height: 0.0,

            spatial_tensors: Vec::new(),
            shape_tensors: Vec::new(),
            semantic_tensors: Vec::new(),

            ids: Vec::new(),
            masses: Vec::new(),
            tokens: Vec::new(),

            spans_x: Vec::new(),
            spans_y: Vec::new(),
            entanglement_status: Vec::new(),
            centers_x: Vec::new(),
            centers_y: Vec::new(),
            momentums_x: Vec::new(),
            momentums_y: Vec::new(),
        }
    }

    /// Dynamic capacity extension for dense array mapping (SparseSet behavior fallback)
    pub fn ensure_scalar_capacity(&mut self, required_len: usize) {
        if self.masses.len() < required_len {
            self.ids.resize(required_len, String::new());
            self.masses.resize(required_len, 0.0); // 0.0 acts as Dark Matter / Empty Slot
            self.tokens.resize(required_len, 0);
            self.spans_x.resize(required_len, 0.0);
            self.spans_y.resize(required_len, 0.0);
            self.entanglement_status.resize(required_len, 0.0);
            self.centers_x.resize(required_len, 0.0);
            self.centers_y.resize(required_len, 0.0);
            self.momentums_x.resize(required_len, 0.0);
            self.momentums_y.resize(required_len, 0.0);
        }
    }

    /// Fungsi bantuan agar `Vec` tensor tetap cukup ukurannya saat index diakses
    fn ensure_tensor_capacity(&mut self, required_len: usize) {
        if self.spatial_tensors.len() < required_len {
            self.spatial_tensors.resize(required_len, 0.0);
            self.shape_tensors.resize(required_len, 0.0);
            self.semantic_tensors.resize(required_len, 0.0);
        }
    }

    pub fn get_spatial_tensor_mut(&mut self, index: usize) -> ArrayViewMut1<'_, f32> {
        let offset = index * GLOBAL_DIMENSION;
        let required = offset + GLOBAL_DIMENSION;
        self.ensure_tensor_capacity(required);
        ArrayViewMut1::from(&mut self.spatial_tensors[offset..required])
    }

    pub fn get_spatial_tensor(&self, index: usize) -> Array1<f32> {
        let offset = index * GLOBAL_DIMENSION;
        let required = offset + GLOBAL_DIMENSION;
        if self.spatial_tensors.len() >= required {
            Array1::from_vec(self.spatial_tensors[offset..required].to_vec())
        } else {
            Array1::zeros(GLOBAL_DIMENSION)
        }
    }

    pub fn get_shape_tensor_mut(&mut self, index: usize) -> ArrayViewMut1<'_, f32> {
        let offset = index * GLOBAL_DIMENSION;
        let required = offset + GLOBAL_DIMENSION;
        self.ensure_tensor_capacity(required);
        ArrayViewMut1::from(&mut self.shape_tensors[offset..required])
    }

    pub fn get_shape_tensor(&self, index: usize) -> Array1<f32> {
        let offset = index * GLOBAL_DIMENSION;
        let required = offset + GLOBAL_DIMENSION;
        if self.shape_tensors.len() >= required {
            Array1::from_vec(self.shape_tensors[offset..required].to_vec())
        } else {
            Array1::zeros(GLOBAL_DIMENSION)
        }
    }

    pub fn get_semantic_tensor_mut(&mut self, index: usize) -> ArrayViewMut1<'_, f32> {
        let offset = index * GLOBAL_DIMENSION;
        let required = offset + GLOBAL_DIMENSION;
        self.ensure_tensor_capacity(required);
        ArrayViewMut1::from(&mut self.semantic_tensors[offset..required])
    }

    pub fn get_semantic_tensor(&self, index: usize) -> Array1<f32> {
        let offset = index * GLOBAL_DIMENSION;
        let required = offset + GLOBAL_DIMENSION;
        if self.semantic_tensors.len() >= required {
            Array1::from_vec(self.semantic_tensors[offset..required].to_vec())
        } else {
            Array1::zeros(GLOBAL_DIMENSION)
        }
    }
}
