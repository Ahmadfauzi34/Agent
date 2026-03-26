use std::sync::{Arc, RwLock};
use ndarray::Array1;

use crate::core::entity_manifold::EntityManifold;
use crate::reasoning::hamiltonian_pruner::HamiltonianPruner;
use crate::reasoning::multiverse_sandbox::MultiverseSandbox;
use crate::perception::hologram_decoder::HologramDecoder;
use crate::reasoning::async_runtime::async_yield;

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
    pub state_manifolds: Vec<EntityManifold>,

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
        state_manifolds: Vec<EntityManifold>,
    ) -> Self {
        Self {
            axiom_type: vec![axiom_type],
            condition_tensor,
            tensor_spatial,
            tensor_semantic,
            delta_x,
            delta_y,
            physics_tier,
            state_manifolds,
            probability: 1.0,
            depth: 1,
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
    fn evaluate_energy(&self, state_manifolds: &Vec<EntityManifold>, decoder: &HologramDecoder) -> f32 {
        let mut total_energy = 0.0;
        for (i, expected_grid) in self.expected_grids.iter().enumerate() {
            let width = expected_grid[0].len();
            let height = expected_grid.len();

            // Render Hologram
            let collapsed_grid = decoder.collapse_to_grid(&state_manifolds[i], width, height, 0.50);

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
        all_possible_axioms: Vec<WaveNode>, // Digunakan untuk depth > 1 (Branching)
        executor: crate::reasoning::async_runtime::MiniExecutor
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>> {
        Box::pin(async move {
        // 1. Terapkan Aksioma (Fisika) ke seluruh state dalam gelombang ini
        for manifold in &mut wave.state_manifolds {
            MultiverseSandbox::apply_axiom(
                manifold,
                &wave.condition_tensor,
                &wave.tensor_spatial,
                &wave.tensor_semantic,
                wave.delta_x,
                wave.delta_y,
                wave.physics_tier,
            );
        }

        // Cooperative Yield: Beri kesempatan gelombang lain untuk dieksekusi oleh MiniExecutor
        // karena simulasi Sandbox dan Decoder memakan waktu CPU.
        async_yield().await;

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

        // Jika probabilitas masih cukup tinggi (Threshold Pruning)
        // Kita perketat threshold pruning untuk mencegah ledakan cabang!
        // Hanya cabang dengan error (Free Energy) yang sangat kecil
        // prob > 0.1 berarti energy < 9.0
        // Mari kita izinkan prob > 0.05 (energy < 19.0)
        // UPDATE: For multi-step ARC, sometimes the first step looks COMPLETELY wrong (energy high).
        // Let's relax this back to > 0.005 for Depth 2 specifically.
        // Extremely tight threshold to avoid OOM
        if wave.probability > 0.05 && wave.depth < self.max_depth {
            // Optimization: limits branch count
            // Take top 5 best branches, but here we just take all, maybe we can limit it.
            let mut branch_count = 0;
            for next_axiom in all_possible_axioms.iter() {
                // Optimisasi: Jangan branch ke rule yang sama dua kali (opsional, tapi berguna untuk ARC)
                if wave.axiom_type.last() == next_axiom.axiom_type.last() {
                    continue;
                }
                // To avoid OOM in our primitive executor, limit branches to 1 max
                branch_count += 1;
                if branch_count > 1 {
                    break;
                }

                let mut child_wave = wave.clone();

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
                let ex_clone = executor.clone();

                executor.spawn(async move {
                    s_clone.propagate_wave(child_wave, d_clone, all_clone, ex_clone).await;
                });
            }
        }

        // Jika sampai di sini, gelombang hancur (Destructive Interference)
        })
    }
}
