use crate::core::config::GLOBAL_DIMENSION;
use crate::core::entity_manifold::EntityManifold;
use crate::reasoning::multiverse_sandbox::MultiverseSandbox;
use crate::reasoning::hamiltonian_pruner::HamiltonianPruner;
use ndarray::Array1;

pub struct GroverConfig {
    pub dimensions: usize,
    pub search_space_size: usize,
    pub temperature: f32,
    pub free_energy_threshold: f32,
    pub max_iterations: usize,
}

pub struct GroverCandidate {
    pub energy: f32,
    pub tensor_rule: Array1<f32>,
    pub delta_x: f32,
    pub delta_y: f32,
    pub physics_tier: u8,
}

pub struct TrainState {
    pub in_state: EntityManifold,
    pub expected_grid: Vec<Vec<i32>>,
}

/// ============================================================================
/// GROVER DIFFUSION SYSTEM (Real-Valued VSA/FHRR Implementation)
/// ============================================================================
/// Menjalankan algoritma Grover (Amplitude Amplification) menggunakan
/// Termodinamika Berkelanjutan (Continuous Free Energy Oracle).
pub struct GroverDiffusionSystem<'a> {
    pub config: GroverConfig,
    pub amplitudes: Vec<f32>,
    pub multipliers: Vec<f32>,
    pub energies: Vec<f32>,
    mean_buffer: Vec<f32>,
    sandbox: &'a mut MultiverseSandbox,
}

impl<'a> GroverDiffusionSystem<'a> {
    pub fn new(sandbox: &'a mut MultiverseSandbox, config: GroverConfig) -> Self {
        let total_size = config.search_space_size * config.dimensions;
        Self {
            amplitudes: vec![0.0; total_size],
            multipliers: vec![0.0; config.search_space_size],
            energies: vec![0.0; config.search_space_size],
            mean_buffer: vec![0.0; config.dimensions],
            config,
            sandbox,
        }
    }

    /// MENGINISIALISASI "WARM START" (Hybrid ARC Architecture)
    pub fn warm_start(&mut self, candidates: &[GroverCandidate]) {
        let n = self.config.search_space_size.min(candidates.len());
        let d = self.config.dimensions;

        self.amplitudes.fill(0.0);

        let mut total_initial_energy_sq = 0.0;
        for i in 0..n {
            let energy = candidates[i].energy;
            let base_amp = 0.001_f32.max(energy.sqrt());
            total_initial_energy_sq += base_amp * base_amp;
        }

        let normalization_factor = 1.0 / (total_initial_energy_sq + 1e-15).sqrt();

        for i in 0..n {
            let base_idx = i * d;
            let energy = candidates[i].energy;
            let amp = energy.sqrt() * normalization_factor;

            let rule_tensor = &candidates[i].tensor_rule;

            for dim in 0..d {
                self.amplitudes[base_idx + dim] = rule_tensor[dim] * amp;
            }
        }
    }

    /// CONTINUOUS FREE ENERGY ORACLE
    pub fn evaluate_oracle(&mut self, candidates: &[GroverCandidate], train_states: &[TrainState]) {
        let n = self.config.search_space_size.min(candidates.len());
        let d = self.config.dimensions;
        let t = self.config.temperature;
        let threshold = self.config.free_energy_threshold;

        for i in 0..n {
            let candidate = &candidates[i];
            let mut total_free_energy = 0.0;

            for state in train_states {
                // Evaluasi Dynamic: clone in_state, apply axiom, bandingkan
                let mut temp_state = state.in_state.clone();

                // Gunakan MultiverseSandbox statis untuk eksekusi
                // Note: TS uses a tensor directly for sandbox applyAxiom here. We reconstruct required arguments.
                let dummy_spatial_delta = Array1::<f32>::zeros(GLOBAL_DIMENSION);
                MultiverseSandbox::apply_axiom(
                    &mut temp_state,
                    &None, // condition_tensor
                    &candidate.tensor_rule, // delta_spatial
                    &candidate.tensor_rule, // delta_semantic (menggunakan tensor yg sama as fallback proxy)
                    candidate.delta_x,
                    candidate.delta_y,
                    candidate.physics_tier,
                    "", // axiom_type
                );

                // Grover mengevaluasi kandidat secara independen dari iterasi depth MCTS,
                // Kita asumsikan depth_ratio = 0.5 (Mid-level penalty) agar tetap cukup toleran
                let energy = HamiltonianPruner::calculate_energy_streaming(
                    &temp_state,
                    &state.expected_grid,
                    temp_state.global_width as usize,
                    temp_state.global_height as usize,
                    0.5
                );

                total_free_energy += energy;
            }

            self.energies[i] = total_free_energy;

            // Continuous Phase Multiplier
            // Sigmoid: 0.0 (High Surprise/Bad) -> 1.0 (Low Surprise/Perfect)
            let score = 0.5 * (1.0 + ((threshold - total_free_energy) / t).tanh());

            // Inversion Strength: Perfect -> -1.0, Bad -> 1.0
            self.multipliers[i] = 1.0 - (2.0 * score);
        }

        // Apply Multiplier (Branchless)
        for i in 0..n {
            let mult = self.multipliers[i];
            let base_idx = i * d;

            for dim in 0..d {
                self.amplitudes[base_idx + dim] *= mult;
            }
        }
    }

    /// DIFFUSION OPERATOR (Inversion About Mean)
    pub fn apply_diffusion(&mut self, n: usize) {
        let d = self.config.dimensions;

        self.mean_buffer.fill(0.0);
        for i in 0..n {
            let base_idx = i * d;
            for dim in 0..d {
                self.mean_buffer[dim] += self.amplitudes[base_idx + dim];
            }
        }

        let inv_n = 1.0 / (n as f32);
        for dim in 0..d {
            self.mean_buffer[dim] *= inv_n;
        }

        // Reflection
        for i in 0..n {
            let base_idx = i * d;
            for dim in 0..d {
                let mean = self.mean_buffer[dim];
                self.amplitudes[base_idx + dim] = 2.0 * mean - self.amplitudes[base_idx + dim];
            }
        }

        self.thermal_normalize(n);
    }

    /// Normalisasi Energi Kinetik menggunakan distribusi Boltzmann tiruan.
    fn thermal_normalize(&mut self, n: usize) {
        let d = self.config.dimensions;
        let t = self.config.temperature;

        let mut norms = vec![0.0; n];

        for i in 0..n {
            let base_idx = i * d;
            let mut sum_sq = 0.0;
            for dim in 0..d {
                let a = self.amplitudes[base_idx + dim];
                sum_sq += a * a;
            }
            norms[i] = sum_sq.sqrt();
        }

        for i in 0..n {
            let base_idx = i * d;
            let norm = norms[i] + 1e-10;

            let thermal_factor = (-norm / t).exp();
            let scale = 1.0 / (norm + thermal_factor);

            for dim in 0..d {
                self.amplitudes[base_idx + dim] *= scale;
            }
        }
    }

    /// Eksekusi Amplifikasi Kuantum (Grover Iteration)
    pub fn search(&mut self, candidates: &[GroverCandidate], train_states: &[TrainState]) -> Option<usize> {
        let n = self.config.search_space_size.min(candidates.len());
        if n == 0 {
            return None;
        }

        self.warm_start(candidates);

        // K_opt
        let mut iterations = ((std::f32::consts::PI / 4.0) * (n as f32).sqrt()).ceil() as usize;
        iterations = iterations.min(self.config.max_iterations);

        for _ in 0..iterations {
            self.evaluate_oracle(candidates, train_states);
            self.apply_diffusion(n);
        }

        let mut max_amp = -9999.0;
        let mut winner_idx = 0;

        for i in 0..n {
            let base_idx = i * self.config.dimensions;
            let mut state_energy = 0.0;

            for dim in 0..self.config.dimensions {
                let a = self.amplitudes[base_idx + dim];
                state_energy += a * a;
            }

            if state_energy > max_amp {
                max_amp = state_energy;
                winner_idx = i;
            }
        }

        Some(winner_idx)
    }
}
