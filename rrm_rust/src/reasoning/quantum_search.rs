use std::sync::{Arc, RwLock};
use ndarray::Array1;

use crate::core::entity_manifold::EntityManifold;
use crate::reasoning::hamiltonian_pruner::HamiltonianPruner;
use crate::reasoning::multiverse_sandbox::MultiverseSandbox;
use crate::shared::visualizer::Visualizer;
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

    /// Evaluasi EXPECTED Free Energy: (Pragmatic Error, Epistemic Value)
    /// Pragmatic Error: Seberapa jauh dari Ground Truth (Makin kecil makin baik)
    /// Epistemic Value: Seberapa banyak information gain/perubahan state yang relevan (Makin besar makin baik)
    fn evaluate_efe_streaming(
        &self,
        state_manifolds: &Arc<Vec<RwLock<EntityManifold>>>,
        initial_manifolds: &Arc<Vec<RwLock<EntityManifold>>>
    ) -> (f32, f32) {
        let mut total_pragmatic_error = 0.0;
        let mut total_epistemic_value = 0.0;

        for (i, expected_grid) in self.expected_grids.iter().enumerate() {
            let width = expected_grid[0].len();
            let height = expected_grid.len();

            let manifold_read = state_manifolds[i].read().unwrap();
            let initial_read = initial_manifolds[i].read().unwrap();

            // 1. Pragmatic Error (Seberapa beda dengan Ground Truth)
            let m_width = if manifold_read.global_width > 0.0 { manifold_read.global_width as usize } else { width };
            let m_height = if manifold_read.global_height > 0.0 { manifold_read.global_height as usize } else { height };
            total_pragmatic_error += HamiltonianPruner::calculate_energy_streaming(&*manifold_read, expected_grid, m_width, m_height);

            // 2. Epistemic Value (Information Gain / Curiosity)
            // Seberapa banyak partikel yang berubah state (posisi/warna/eksistensi) dibandingkan state awal?
            let mut changed_particles: f32 = 0.0;
            for e in 0..crate::core::config::MAX_ENTITIES {
                let old_mass = initial_read.masses[e];
                let new_mass = manifold_read.masses[e];

                // Jika eksistensi berubah (Spawn/Destroy)
                if old_mass != new_mass {
                    changed_particles += 1.0;
                    continue;
                }

                // Jika posisi / warna berubah (Translation/Geometry/Color Shift)
                if new_mass > 0.0 {
                    if (initial_read.centers_x[e] - manifold_read.centers_x[e]).abs() > 0.1 ||
                       (initial_read.centers_y[e] - manifold_read.centers_y[e]).abs() > 0.1 ||
                       initial_read.tokens[e] != manifold_read.tokens[e] {
                        changed_particles += 1.0;
                    }
                }
            }

            // Epistemic value didiskon logaritmik agar tidak overshadow pragmatic error
            // Log10 dari perubahan partikel memberi reward pelan tapi pasti untuk eksplorasi
            if changed_particles > 0.0 {
                total_epistemic_value += changed_particles.log10();
            }
        }

        (total_pragmatic_error, total_epistemic_value)
    }

    /// Menjalankan perambatan gelombang secara Asinkron
    /// Future ini akan mengembalikan Poll::Ready ketika gelombang runtuh (Pruned)
    /// atau menemukan Ground State.
    pub fn propagate_wave(
        self: Arc<Self>,
        mut wave: WaveNode,
        initial_manifolds: Arc<Vec<RwLock<EntityManifold>>>, // Referensi ke state awal untuk menghitung Epistemic Value
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

        // 2. Evaluasi EXPECTED Free Energy (Active Inference: Pragmatic - Epistemic)
        let (pragmatic_error, epistemic_value) = self.evaluate_efe_streaming(&wave.state_manifolds, &initial_manifolds);

        // 3. The Quantum Eraser (Pruning) dengan Active Inference G(π)
        // Expected Free Energy G(π) = Pragmatic Error - Epistemic Bonus
        let expected_free_energy = pragmatic_error - epistemic_value;
        let g_bounded = expected_free_energy.max(0.0); // G tidak boleh negatif

        // Semakin besar G(π), semakin kecil probability.
        // Jika pragmatic_error 0, probability otomatis 1.0 (Sempurna).
        let interference = if pragmatic_error == 0.0 { 1.0 } else { 1.0 / (g_bounded + 1.0) };
        wave.probability *= interference;

        // VISUALIZER DIAGNOSTIC
        // Tampilkan pohon MCTS jika kita sedang meng-explore node yang signifikan (Prob > 0.05)
        // Diubah ke prob > 0.00 agar selalu tercetak!
        if wave.probability >= 0.0 {
            Visualizer::print_mcts_branch(wave.depth, pragmatic_error, epistemic_value, wave.probability, &wave.axiom_type);

            // Cetak Barcode & Memory Map untuk contoh universe pertama di node ini untuk melihat apa yang Sandbox lakukan
            let debug_manifold = wave.state_manifolds[0].read().unwrap();
            Visualizer::print_particle_memory_map(&*debug_manifold);
        }

        if pragmatic_error == 0.0 {
            // Ground State Ditemukan! (Zero pragmatic error) Simpan ke Results
            self.ground_states.write().unwrap().push(wave.clone());

            println!("\n🌟 === GROUND STATE DITEMUKAN (Zero Error) === 🌟");
            let debug_manifold = wave.state_manifolds[0].read().unwrap();
            Visualizer::print_tensor_barcode("Semantic T[0]", &debug_manifold.get_semantic_tensor(0));
            Visualizer::print_tensor_barcode("Spatial T[0]", &debug_manifold.get_spatial_tensor(0));
            println!("🌟 ===========================================\n");

            return; // Gelombang selesai dengan sukses
        }

        // ENERGY PREDICTION PRUNING
        // Hard prune branch yang probabilitasnya terlalu kecil untuk selamat
        if wave.probability < 0.05 {
            return;
        }

        // Prediksi sisa energi setelah N langkah ke depan
        // Jika energi pragmatis saat ini masih sangat tinggi (misal > 20) dan kita sudah di depth >= 1
        // asumsikan mustahil mencapai 0.0 di sisa sisa depth.
        let predicted_min_energy = pragmatic_error * 0.9f32.powi((self.max_depth as i32) - (wave.depth as i32));
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
                let all_clone = all_possible_axioms.clone();
                let initial_manifolds_clone = Arc::clone(&initial_manifolds);

                branch_futures.push(async move {
                    s_clone.propagate_wave(child_wave, initial_manifolds_clone, all_clone).await;
                });
            }

            // Await all branches (dijalankan berurutan saat ini untuk keamanan memori,
            // jika kita punya executor parallel sungguhan, kita bisa spawn ke threadpool)
            for f in branch_futures {
                f.await;
            }
        }

        // Jika sampai di sini, gelombang hancur (Destructive Interference)
        })
    }
}
