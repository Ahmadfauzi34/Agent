use crate::core::config::{GLOBAL_DIMENSION, MAX_ENTITIES};
use ndarray::{Array1, ArrayViewMut1};

/// Struktur SoA (Structure of Arrays) untuk Quantum Entity Manifold.
/// Didesain untuk Zero-GC dan cache locality di L1/L2.
/// Menggunakan sistem Tri-Tensor: Spatial (Pusat Global), Shape (Pola Lokal), dan Semantic (Warna).
pub struct EntityManifold {
    pub active_count: usize,
    pub global_width: f32,
    pub global_height: f32,

    // 1. Posisi Global (Pusat Massa Absolut di Kanvas)
    pub spatial_tensors: Vec<f32>, // Ukuran: MAX_ENTITIES * GLOBAL_DIMENSION

    // 2. Cetak Biru (Blueprint) Relatif (Bentuk lokal dari titik pusat)
    pub shape_tensors: Vec<f32>, // Ukuran: MAX_ENTITIES * GLOBAL_DIMENSION

    // 3. Warna / Tipe Material
    pub semantic_tensors: Vec<f32>, // Ukuran: MAX_ENTITIES * GLOBAL_DIMENSION

    pub ids: Vec<String>, // Ukuran: MAX_ENTITIES
    pub masses: Vec<f32>, // Ukuran: MAX_ENTITIES
    pub tokens: Vec<i32>, // Ukuran: MAX_ENTITIES

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
        let active = self.active_count;
        let tensor_end = active * GLOBAL_DIMENSION;

        // Optimized Memory Allocation
        // Alih-alih melakukan clone 1000 entitas (3 * 1000 * 8192 f32 = ~98MB),
        // Kita HANYA mengalokasi memori yang terpakai oleh active_count.
        // Bagian vec yang tidak terpakai dibiarkan kosong, dan akan bertambah
        // kembali ke MAX_ENTITIES jika dibutuhkan (sangat jarang terjadi di simulasi internal MCTS)

        // Shrink-to-fit allocation: We only allocate exact memory needed for `active_count`.
        // If the simulation needs to spawn more entities later, Rust's Vec will automatically reallocate/grow.
        // This cuts memory from 100MB per state down to <1MB for typical ARC tasks.

        let mut new_spatial = vec![0.0; tensor_end];
        new_spatial.copy_from_slice(&self.spatial_tensors[..tensor_end]);

        let mut new_shape = vec![0.0; tensor_end];
        new_shape.copy_from_slice(&self.shape_tensors[..tensor_end]);

        let mut new_semantic = vec![0.0; tensor_end];
        new_semantic.copy_from_slice(&self.semantic_tensors[..tensor_end]);

        let mut new_ids = vec![String::new(); MAX_ENTITIES];
        for i in 0..active {
            new_ids[i] = self.ids[i].clone();
        }

        let mut new_masses = vec![0.0; MAX_ENTITIES];
        new_masses[..active].copy_from_slice(&self.masses[..active]);

        let mut new_tokens = vec![0; MAX_ENTITIES];
        new_tokens[..active].copy_from_slice(&self.tokens[..active]);

        let mut new_spans_x = vec![0.0; MAX_ENTITIES];
        new_spans_x[..active].copy_from_slice(&self.spans_x[..active]);

        let mut new_spans_y = vec![0.0; MAX_ENTITIES];
        new_spans_y[..active].copy_from_slice(&self.spans_y[..active]);

        let mut new_centers_x = vec![0.0; MAX_ENTITIES];
        new_centers_x[..active].copy_from_slice(&self.centers_x[..active]);

        let mut new_centers_y = vec![0.0; MAX_ENTITIES];
        new_centers_y[..active].copy_from_slice(&self.centers_y[..active]);

        let mut new_momentums_x = vec![0.0; MAX_ENTITIES];
        new_momentums_x[..active].copy_from_slice(&self.momentums_x[..active]);

        let mut new_momentums_y = vec![0.0; MAX_ENTITIES];
        new_momentums_y[..active].copy_from_slice(&self.momentums_y[..active]);

        let mut new_entanglement = vec![0.0; MAX_ENTITIES];
        new_entanglement[..active].copy_from_slice(&self.entanglement_status[..active]);

        Self {
            active_count: self.active_count,
            global_width: self.global_width,
            global_height: self.global_height,

            spatial_tensors: new_spatial,
            shape_tensors: new_shape,
            semantic_tensors: new_semantic,

            ids: new_ids,
            masses: new_masses,
            tokens: new_tokens,

            spans_x: new_spans_x,
            spans_y: new_spans_y,
            centers_x: new_centers_x,
            centers_y: new_centers_y,
            momentums_x: new_momentums_x,
            momentums_y: new_momentums_y,
            entanglement_status: new_entanglement,
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

            spatial_tensors: vec![0.0; MAX_ENTITIES * GLOBAL_DIMENSION],
            shape_tensors: vec![0.0; MAX_ENTITIES * GLOBAL_DIMENSION],
            semantic_tensors: vec![0.0; MAX_ENTITIES * GLOBAL_DIMENSION],

            ids: vec![String::new(); MAX_ENTITIES],
            // Inisialisasi masses dengan 0.0 menjadikan seluruh buffer ini sebagai "Dark Matter"
            // Saat segmenter mengisi partikel awal, masses akan di-set menjadi > 0.0
            masses: vec![0.0; MAX_ENTITIES],
            tokens: vec![0; MAX_ENTITIES],

            spans_x: vec![0.0; MAX_ENTITIES],
            spans_y: vec![0.0; MAX_ENTITIES],
            entanglement_status: vec![0.0; MAX_ENTITIES],
            centers_x: vec![0.0; MAX_ENTITIES],
            centers_y: vec![0.0; MAX_ENTITIES],
            momentums_x: vec![0.0; MAX_ENTITIES],
            momentums_y: vec![0.0; MAX_ENTITIES],
        }
    }

    /// Mendapatkan mutable view dari spatial_tensor (Pusat Posisi Global)
    // Fungsi bantuan agar `Vec` tetap cukup ukurannya saat index diakses
    fn ensure_capacity(&mut self, required_len: usize) {
        if self.spatial_tensors.len() < required_len {
            self.spatial_tensors.resize(required_len, 0.0);
            self.shape_tensors.resize(required_len, 0.0);
            self.semantic_tensors.resize(required_len, 0.0);
        }
    }

    pub fn get_spatial_tensor_mut(&mut self, index: usize) -> ArrayViewMut1<'_, f32> {
        let offset = index * GLOBAL_DIMENSION;
        let required = offset + GLOBAL_DIMENSION;
        self.ensure_capacity(required);
        ArrayViewMut1::from(&mut self.spatial_tensors[offset..required])
    }

    /// Mendapatkan salinan spatial_tensor (untuk dibaca)
    pub fn get_spatial_tensor(&self, index: usize) -> Array1<f32> {
        let offset = index * GLOBAL_DIMENSION;
        let required = offset + GLOBAL_DIMENSION;
        Array1::from_vec(self.spatial_tensors[offset..required].to_vec())
    }

    /// Mendapatkan mutable view dari shape_tensor (Cetak Biru Bentuk Lokal)
    pub fn get_shape_tensor_mut(&mut self, index: usize) -> ArrayViewMut1<'_, f32> {
        let offset = index * GLOBAL_DIMENSION;
        let required = offset + GLOBAL_DIMENSION;
        self.ensure_capacity(required);
        ArrayViewMut1::from(&mut self.shape_tensors[offset..required])
    }

    /// Mendapatkan salinan shape_tensor (untuk dibaca)
    pub fn get_shape_tensor(&self, index: usize) -> Array1<f32> {
        let offset = index * GLOBAL_DIMENSION;
        let required = offset + GLOBAL_DIMENSION;
        Array1::from_vec(self.shape_tensors[offset..required].to_vec())
    }

    /// Mendapatkan mutable view dari semantic_tensor (Warna)
    pub fn get_semantic_tensor_mut(&mut self, index: usize) -> ArrayViewMut1<'_, f32> {
        let offset = index * GLOBAL_DIMENSION;
        let required = offset + GLOBAL_DIMENSION;
        self.ensure_capacity(required);
        ArrayViewMut1::from(&mut self.semantic_tensors[offset..required])
    }

    /// Mendapatkan salinan semantic_tensor (untuk dibaca)
    pub fn get_semantic_tensor(&self, index: usize) -> Array1<f32> {
        let offset = index * GLOBAL_DIMENSION;
        let required = offset + GLOBAL_DIMENSION;
        Array1::from_vec(self.semantic_tensors[offset..required].to_vec())
    }
}
