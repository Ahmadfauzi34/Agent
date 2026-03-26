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
    pub axiom_type: String,
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
    pub async fn propagate_wave(
        &self,
        mut wave: WaveNode,
        decoder: HologramDecoder,
        _all_possible_axioms: Vec<WaveNode> // Digunakan untuk depth > 1 (Branching)
    ) {
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
        if wave.probability > 0.1 && wave.depth < self.max_depth {
            // Spawn cabang baru untuk kedalaman selanjutnya (MCTS Expansion)
            // Di sini kita bisa loop over `_all_possible_axioms` dan men-spawn
            // `propagate_wave` baru ke dalam Executor.
            // Untuk saat ini, kita prune jika energy > 0 (karena ini Depth 1 PoC)
        }

        // Jika sampai di sini, gelombang hancur (Destructive Interference)
    }
}
