use std::sync::{Arc, RwLock};
use ndarray::Array1;

use crate::core::entity_manifold::EntityManifold;
use crate::reasoning::hamiltonian_pruner::HamiltonianPruner;
use crate::reasoning::multiverse_sandbox::MultiverseSandbox;
use crate::perception::hologram_decoder::HologramDecoder;
use futures_lite::future;

/// Struktur untuk satu Node di dalam Pencarian Gelombang
#[derive(Clone)]
pub struct WaveNode {
    pub axiom_type: Vec<String>, // Now tracks the path of axioms applied
    pub condition_tensor: Option<Array1<f32>>,
    pub tensor_spatial: Array1<f32>,
    pub tensor_semantic: Array1<f32>,
    pub delta_x: f32,
    pub delta_y: f32,
    pub physics_tier: u8,

    // Status Sandbox yang terikat pada gelombang ini (Fisika saat ini)
    // Menggunakan Copy-on-Write (CoW) untuk menghindari clone memori 39MB yang berlebihan!
    pub state_manifolds: Arc<Vec<RwLock<EntityManifold>>>,
    pub state_modified: bool,

    // Amplitudo kelangsungan hidup (1.0 = sempurna, 0.0 = hancur/pruned)
    pub probability: f32,
    pub depth: usize,
}

impl WaveNode {
    pub fn new(
        axiom_type: String,
        condition_tensor: Option<Array1<f32>>,
        tensor_spatial: Array1<f32>,
        tensor_semantic: Array1<f32>,
        delta_x: f32,
        delta_y: f32,
        physics_tier: u8,
        initial_manifolds: Arc<Vec<RwLock<EntityManifold>>>,
    ) -> Self {
        Self {
            axiom_type: vec![axiom_type],
            condition_tensor,
            tensor_spatial,
            tensor_semantic,
            delta_x,
            delta_y,
            physics_tier,
            state_manifolds: initial_manifolds,
            state_modified: false,
            probability: 1.0,
            depth: 1,
        }
    }

    /// Lazy clone — hanya clone memory berat jika benar-benar akan dimodifikasi di Sandbox
    pub fn ensure_unique_state(&mut self) {
        if !self.state_modified {
            let cloned: Vec<RwLock<EntityManifold>> = self.state_manifolds
                .iter()
                .map(|m| RwLock::new(m.read().unwrap().clone()))
                .collect();
            self.state_manifolds = Arc::new(cloned);
            self.state_modified = true;
        }
    }
}

pub struct AsyncWaveSearch {
    // Referensi ke Ground Truth (Expected Grids) untuk Oracle
    expected_grids: Vec<Vec<Vec<i32>>>,
    max_depth: usize,

    // Hasil gelombang yang berhasil mencapai Ground State (Energy 0)
    pub ground_states: Arc<RwLock<Vec<WaveNode>>>,
}

impl AsyncWaveSearch {
    pub fn new(expected_grids: Vec<Vec<Vec<i32>>>, max_depth: usize) -> Self {
        Self {
            expected_grids,
            max_depth,
            ground_states: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Evaluasi Free Energy dari sebuah state terhadap Ground Truth
    fn evaluate_energy(&self, state_manifolds: &Arc<Vec<RwLock<EntityManifold>>>, decoder: &HologramDecoder) -> f32 {
        let mut total_energy = 0.0;
        for (i, expected_grid) in self.expected_grids.iter().enumerate() {
            let width = expected_grid[0].len();
            let height = expected_grid.len();

            // Render Hologram
            let manifold_read = state_manifolds[i].read().unwrap();
            let collapsed_grid = decoder.collapse_to_grid(&*manifold_read, width, height, 0.50);

            // Hitung Error (Oracle)
            total_energy += HamiltonianPruner::calculate_free_energy(&collapsed_grid, expected_grid);
        }
        total_energy
    }

    /// Menjalankan perambatan gelombang secara Asinkron
    /// Future ini akan mengembalikan Poll::Ready ketika gelombang runtuh (Pruned)
    /// atau menemukan Ground State.
    pub fn propagate_wave(
        self: Arc<Self>,
        mut wave: WaveNode,
        decoder: HologramDecoder,
        all_possible_axioms: Vec<WaveNode> // Digunakan untuk depth > 1 (Branching)
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>> {
        Box::pin(async move {

        // COPY-ON-WRITE: Hanya clone array raksasa ini ke memory JIKA kita menerapkan fisika!
        // Di node pertama yang memodifikasi, array akan diclone. Child akan otomatis mewarisi pointer.
        wave.ensure_unique_state();

        // 1. Terapkan Aksioma (Fisika) ke seluruh state dalam gelombang ini
        for manifold_lock in wave.state_manifolds.iter() {
            let mut manifold = manifold_lock.write().unwrap();

            // Kita gunakan aksioma terakhir yang di-push ke dalam history path
            let current_axiom_str = wave.axiom_type.last().map(|s| s.as_str()).unwrap_or("IDENTITY_STATIC");

            MultiverseSandbox::apply_axiom(
                &mut *manifold,
                &wave.condition_tensor,
                &wave.tensor_spatial,
                &wave.tensor_semantic,
                wave.delta_x,
                wave.delta_y,
                wave.physics_tier,
                current_axiom_str,
            );
        }

        // Cooperative Yield: Beri kesempatan gelombang lain untuk dieksekusi oleh Executor
        // karena simulasi Sandbox dan Decoder memakan waktu CPU.
        future::yield_now().await;

        // Optimization: Early exit if a perfect solution was already found
        if self.ground_states.read().unwrap().len() > 0 {
            return;
        }

        // 2. Evaluasi Quantum Oracle (Menghitung Free Energy)
        let energy = self.evaluate_energy(&wave.state_manifolds, &decoder);

        // 3. The Quantum Eraser (Pruning)
        // Semakin besar energy (kesalahan), semakin kecil probability.
        // Jika energy 0, probability tetap 1.0 (Sempurna).
        let interference = if energy == 0.0 { 1.0 } else { 1.0 / (energy + 1.0) };
        wave.probability *= interference;

        if wave.probability >= 0.99 {
            // Ground State Ditemukan! Simpan ke Results
            self.ground_states.write().unwrap().push(wave.clone());
            return; // Gelombang selesai dengan sukses
        }

        // ENERGY PREDICTION PRUNING
        // Hard prune branch yang probabilitasnya terlalu kecil untuk selamat
        if wave.probability < 0.05 {
            return;
        }

        // Prediksi sisa energi setelah N langkah ke depan
        // Jika energi saat ini masih sangat tinggi (misal > 20) dan kita sudah di depth >= 1
        // asumsikan mustahil mencapai 0.0 di sisa sisa depth.
        let predicted_min_energy = energy * 0.9f32.powi((self.max_depth as i32) - (wave.depth as i32));
        if predicted_min_energy > 5.0 && wave.depth >= 2 {
            return; // Mustahil mencapai Ground State
        }

        // UPDATE: With true async futures-lite, we can afford slightly wider branching
        // without instantly OOMing, but we still want to prune bad paths.
        // Let's allow branching if probability > 0.1 and it passed the prediction pruning.
        if wave.probability > 0.1 && wave.depth < self.max_depth {
            let mut branch_futures = Vec::new();
            let mut branch_count = 0;

            for next_axiom in all_possible_axioms.iter() {
                // Optimisasi: Jangan branch ke rule yang sama dua kali berurut
                if wave.axiom_type.last() == next_axiom.axiom_type.last() {
                    continue;
                }

                // Limit to 1 branch max for validation bounds
                branch_count += 1;
                if branch_count > 1 {
                    break;
                }

                // Jangan branch ke operasi geometry / crop / spawn secara rekursif terus menerus untuk menghindari ledakan OOM ekstrim
                if next_axiom.physics_tier >= 3 && wave.physics_tier >= 3 {
                    continue;
                }

                let mut child_wave = wave.clone();
                // RESET CoW Flag agar child memaksa clone sebelum memodifikasi `state_manifolds` dari parent!
                child_wave.state_modified = false;

                // Track Path
                child_wave.axiom_type.push(next_axiom.axiom_type[0].clone());
                child_wave.depth += 1;

                // Pada depth > 1, fisika diakumulasi (berurut).
                // Sandbox akan menerapkan `next_axiom` ke atas `state_manifolds` yang
                // SUDAH diubah oleh axiom sebelumnya.
                child_wave.condition_tensor = next_axiom.condition_tensor.clone();
                child_wave.tensor_spatial = next_axiom.tensor_spatial.clone();
                child_wave.tensor_semantic = next_axiom.tensor_semantic.clone();
                child_wave.delta_x = next_axiom.delta_x;
                child_wave.delta_y = next_axiom.delta_y;
                child_wave.physics_tier = next_axiom.physics_tier;

                let s_clone = Arc::clone(&self);
                let d_clone = HologramDecoder::new();
                let all_clone = all_possible_axioms.clone();

                branch_futures.push(async move {
                    s_clone.propagate_wave(child_wave, d_clone, all_clone).await;
                });
            }

            // Await all branches concurrently
            for f in branch_futures {
                f.await;
            }
        }

        // Jika sampai di sini, gelombang hancur (Destructive Interference)
        })
    }
}
