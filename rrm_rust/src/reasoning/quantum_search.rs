use ndarray::Array1;
use std::sync::{Arc, RwLock};

use crate::core::config::GLOBAL_DIMENSION;
use crate::core::entity_manifold::EntityManifold;
use crate::reasoning::multiverse_sandbox::MultiverseSandbox;
use crate::reasoning::quantum_search_simd::{CognitivePhase, SimdEnergyCalculator};
use crate::shared::visualizer::{MctsNodeInfo, TransparencyLevel, Visualizer};
use futures_lite::future;

#[derive(Clone)]
pub struct FractalId {
    pub index: u32,
    pub path_hash: u64,
}

#[derive(Clone)]
pub struct EnergyTolerance {
    pub precision_width: f64, // E.g., 1e-6 (Fuzzy/Semantic) down to 1e-15 (Femto/Exact)
    pub max_branching_factor: u8,
}

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

    // Status statis (Makroskopik) -> Cukup klon pointer Arc (Shallow)
    pub static_background: Arc<crate::core::infinite_detail::CoarseData>,

    // Status dinamis (Mikroskopik) -> Disalin penuh/Copy-on-Write jika dimodifikasi
    pub state_manifolds: Arc<Vec<EntityManifold>>,
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
        initial_manifolds: Arc<Vec<EntityManifold>>,
        _static_background: Option<Arc<crate::core::infinite_detail::CoarseData>>,
    ) -> Self {
        Self {
            axiom_type: vec![axiom_type],
            condition_tensor,
            tensor_spatial,
            tensor_semantic,
            delta_x,
            delta_y,
            physics_tier,
            static_background: std::sync::Arc::new(crate::core::infinite_detail::CoarseData {
                regions: std::sync::Arc::new(vec![]),
                signatures: std::sync::Arc::new(vec![]),
            }),
            state_manifolds: initial_manifolds,
            state_modified: false,
            probability: 1.0,
            depth: 1,
        }
    }

    /// Lazy clone — hanya clone memory berat jika benar-benar akan dimodifikasi di Sandbox
    pub fn ensure_unique_state(&mut self) {
        if !self.state_modified {
            let cloned: Vec<EntityManifold> = self
                .state_manifolds
                .iter()
                .map(|m: &EntityManifold| {
                    if m.masses.len() > 0 && m.masses[0] > 100.0 {
                        let mut shallow = EntityManifold::new();
                        shallow.active_count = 0;
                        shallow
                    } else {
                        m.clone()
                    }
                })
                .collect();
            self.state_manifolds = Arc::new(cloned);
            self.state_modified = true;
        }
    }
}

#[derive(Clone, PartialEq)]
pub enum CognitiveMode {
    StrictVSA,
    Probabilistic,
    Counterfactual,
}

pub struct FractalArena {
    pub ids: Vec<FractalId>,
    pub parents: Vec<Option<usize>>,
    pub children_ranges: Vec<(usize, u8)>,
    pub tolerances: Vec<EnergyTolerance>,
    pub static_backgrounds: Vec<Arc<crate::core::infinite_detail::CoarseData>>,
    pub amplitudes: Vec<f32>,
    pub phases: Vec<f32>,
    pub states: Vec<Arc<Vec<EntityManifold>>>,
    pub modified_flags: Vec<bool>,

    // Extracted fields for logical grouping
    pub perception_sensory: Vec<Array1<f32>>,
    pub reasoning_pragmatic: Vec<f32>,
    pub reasoning_epistemic: Vec<f32>,
    pub reasoning_mode: Vec<CognitiveMode>,

    pub action_spatial: Vec<Array1<f32>>,
    pub action_semantic: Vec<Array1<f32>>,
    pub action_condition: Vec<Option<Array1<f32>>>,
    pub action_dx: Vec<f32>,
    pub action_dy: Vec<f32>,
    pub action_tier: Vec<u8>,

    pub axiom_path: Vec<Vec<String>>,

    pub free_indices: Vec<usize>,
    pub active_count: usize,
    pub capacity: usize,
}

impl FractalArena {
    pub fn new(capacity: usize) -> Self {
        Self {
            ids: Vec::with_capacity(capacity),
            parents: Vec::with_capacity(capacity),
            children_ranges: Vec::with_capacity(capacity),
            tolerances: Vec::with_capacity(capacity),
            static_backgrounds: Vec::with_capacity(capacity),
            amplitudes: Vec::with_capacity(capacity),
            phases: Vec::with_capacity(capacity),
            states: Vec::with_capacity(capacity),
            modified_flags: Vec::with_capacity(capacity),

            perception_sensory: Vec::with_capacity(capacity),
            reasoning_pragmatic: Vec::with_capacity(capacity),
            reasoning_epistemic: Vec::with_capacity(capacity),
            reasoning_mode: Vec::with_capacity(capacity),

            action_spatial: Vec::with_capacity(capacity),
            action_semantic: Vec::with_capacity(capacity),
            action_condition: Vec::with_capacity(capacity),
            action_dx: Vec::with_capacity(capacity),
            action_dy: Vec::with_capacity(capacity),
            action_tier: Vec::with_capacity(capacity),

            axiom_path: Vec::with_capacity(capacity),

            free_indices: Vec::new(),
            active_count: 0,
            capacity,
        }
    }

    pub fn spawn_node(
        &mut self,
        parent: Option<usize>,
        tolerance: EnergyTolerance,
        state: Arc<Vec<EntityManifold>>,
    ) -> Option<usize> {
        if let Some(idx) = self.free_indices.pop() {
            self.parents[idx] = parent;
            self.tolerances[idx] = tolerance;
            self.amplitudes[idx] = 1.0;
            self.phases[idx] = 0.0;
            self.modified_flags[idx] = false;
            self.states[idx] = state;
            self.ids[idx] = FractalId {
                index: idx as u32,
                path_hash: 0,
            };

            // Clean up state memory to avoid leakage
            self.perception_sensory[idx].fill(0.0);
            self.reasoning_pragmatic[idx] = 0.0;
            self.reasoning_epistemic[idx] = 0.0;
            self.reasoning_mode[idx] = CognitiveMode::StrictVSA;

            self.action_spatial[idx].fill(0.0);
            self.action_semantic[idx].fill(0.0);
            self.action_condition[idx] = None;
            self.action_dx[idx] = 0.0;
            self.action_dy[idx] = 0.0;
            self.action_tier[idx] = 0;

            self.axiom_path[idx].clear();

            return Some(idx);
        }

        if self.active_count >= self.capacity {
            return None;
        }

        let depth = parent.map(|p| self.children_ranges[p].1 + 1).unwrap_or(0);
        let idx = self.active_count;
        self.active_count += 1;

        self.ids.push(FractalId {
            index: idx as u32,
            path_hash: 0,
        });
        self.parents.push(parent);
        self.children_ranges.push((0, depth));
        self.tolerances.push(tolerance);
        self.static_backgrounds
            .push(Arc::new(crate::core::infinite_detail::CoarseData {
                regions: Arc::new(vec![]),
                signatures: Arc::new(vec![]),
            }));
        self.amplitudes.push(1.0);
        self.phases.push(0.0);
        self.states.push(state);
        self.modified_flags.push(false);

        self.perception_sensory
            .push(Array1::zeros(GLOBAL_DIMENSION));
        self.reasoning_pragmatic.push(0.0);
        self.reasoning_epistemic.push(0.0);
        self.reasoning_mode
            .push(crate::reasoning::quantum_search::CognitiveMode::StrictVSA);

        self.action_spatial.push(Array1::zeros(GLOBAL_DIMENSION));
        self.action_semantic.push(Array1::zeros(GLOBAL_DIMENSION));
        self.action_condition.push(None);
        self.action_dx.push(0.0);
        self.action_dy.push(0.0);
        self.action_tier.push(0);

        self.axiom_path.push(Vec::new());

        Some(idx)
    }

    pub fn kill_node(&mut self, idx: usize) {
        if idx < self.active_count {
            self.amplitudes[idx] = 0.0;
            self.free_indices.push(idx);

            let (start, count) = self.children_ranges[idx];
            for i in 0..count as usize {
                self.kill_node(start + i);
            }
        }
    }

    pub fn ensure_unique_state(&mut self, idx: usize) {
        if !self.modified_flags[idx] {
            let cloned: Vec<EntityManifold> = self.states[idx]
                .iter()
                .map(|m: &EntityManifold| {
                    if m.masses.len() > 0 && m.masses[0] > 100.0 {
                        let mut shallow = EntityManifold::new();
                        shallow.active_count = 0;
                        shallow
                    } else {
                        m.clone()
                    }
                })
                .collect();
            self.states[idx] = Arc::new(cloned);
            self.modified_flags[idx] = true;
        }
    }

    /// Reason: Active Inference (Minimize Free Energy) mapped to Fractal Nodes
    pub fn reason(
        &mut self,
        idx: usize,
        expected_grids: &[Vec<Vec<i32>>],
        initial_manifolds: &Arc<Vec<EntityManifold>>,
    ) {
        let mut total_pragmatic_error = 0.0;
        let mut total_epistemic_value = 0.0;

        let current_depth = self.children_ranges[idx].1 as usize;
        let current_phase = if current_depth <= 1 {
            CognitivePhase::MacroStructural // Langkah pertama HARUS menyelesaikan dimensi!
        } else {
            CognitivePhase::Microscopic // Langkah kedua merapikan isi (piksel)
        };

        for (i, expected_grid) in expected_grids.iter().enumerate() {
            let width = expected_grid[0].len();
            let height = expected_grid.len();

            let manifold_read = &self.states[idx][i];
            let initial_read = &initial_manifolds[i];

            let m_width = if manifold_read.global_width > 0.0 {
                manifold_read.global_width as usize
            } else {
                width
            };
            let m_height = if manifold_read.global_height > 0.0 {
                manifold_read.global_height as usize
            } else {
                height
            };

            let current_tolerance = self.tolerances[idx].precision_width;

            total_pragmatic_error += SimdEnergyCalculator::calculate_pragmatic_streaming(
                &*manifold_read,
                expected_grid,
                m_width,
                m_height,
                &current_phase,
                current_tolerance,
            );
            total_epistemic_value +=
                SimdEnergyCalculator::calculate_epistemic(&*manifold_read, &initial_read);
        }

        self.reasoning_pragmatic[idx] = total_pragmatic_error;
        self.reasoning_epistemic[idx] = total_epistemic_value;

        // Expected Free Energy: G = E - I + C
        let expected_free_energy = total_pragmatic_error - total_epistemic_value;
        let g_bounded = expected_free_energy.max(0.0);

        // Update amplitude based on dynamic free energy
        self.amplitudes[idx] = if total_pragmatic_error <= 0.0 {
            1.0
        } else {
            0.99 - (expected_free_energy / 50000.0).clamp(0.0, 0.95)
        };

        // Switch cognitive mode berdasarkan posisi (Mandelbrot Boundary logic)
        self.reasoning_mode[idx] = if g_bounded < 0.1 {
            CognitiveMode::StrictVSA // Inside set: stable
        } else if g_bounded < 1.0 {
            CognitiveMode::Probabilistic // Boundary: optimal
        } else {
            CognitiveMode::Counterfactual // Outside: explore
        };
    }
}

pub struct AsyncWaveSearch {
    // Referensi ke Ground Truth (Expected Grids) untuk Oracle
    expected_grids: Vec<Vec<Vec<i32>>>,
    max_depth: usize,

    // Fractal Engine menggantikan Vec<WaveNode> allocation
    pub arena: Arc<RwLock<FractalArena>>,
    pub ground_states: Arc<RwLock<Vec<WaveNode>>>, // Keeping WaveNode here just for the legacy output conversion interface for now
}

impl AsyncWaveSearch {
    pub fn new(expected_grids: Vec<Vec<Vec<i32>>>, max_depth: usize) -> Self {
        Self {
            expected_grids,
            max_depth,
            arena: Arc::new(RwLock::new(FractalArena::new(20000))), // Alokasikan 20k slot flat
            ground_states: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Evaluasi EXPECTED Free Energy menggunakan SoA Fractal Nodes (Iteratif, bukan rekursif!)
    /// Menjalankan perambatan gelombang
    pub fn propagate_wave(
        self: Arc<Self>,
        wave: WaveNode,
        initial_manifolds: Arc<Vec<EntityManifold>>,
        all_possible_axioms: Vec<WaveNode>,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>> {
        Box::pin(async move {
            // 1. Inisiasi Root Fractal Node
            let root_idx;
            {
                let mut arena = self.arena.write().unwrap();
                let root_tolerance = EnergyTolerance {
                    precision_width: 1e-6, // Mulai dari Micro / Fuzzy (Semantic level)
                    max_branching_factor: 20,
                };

                root_idx = arena
                    .spawn_node(None, root_tolerance, wave.state_manifolds.clone())
                    .unwrap();

                // Sync initial state dari Legacy WaveNode
                arena.axiom_path[root_idx] = wave.axiom_type.clone();
                arena.action_condition[root_idx] = wave.condition_tensor.clone();
                arena.action_spatial[root_idx] = wave.tensor_spatial.clone();
                arena.action_semantic[root_idx] = wave.tensor_semantic.clone();
                arena.action_dx[root_idx] = wave.delta_x;
                arena.action_dy[root_idx] = wave.delta_y;
                arena.action_tier[root_idx] = wave.physics_tier;
                arena.static_backgrounds[root_idx] = wave.static_background.clone();
            }

            // Queue iteratif untuk simulasi Tree-Search Zero-GC
            let mut frontier = vec![root_idx];

            while let Some(current_idx) = frontier.pop() {
                // Cooperative Yield untuk async runtime compatibility
                future::yield_now().await;

                // Cek jika Ground State sudah ditemukan
                if self.ground_states.read().unwrap().len() > 0 {
                    break;
                }

                let mut arena = self.arena.write().unwrap();

                // Copy-On-Write State sebelum modifikasi
                arena.ensure_unique_state(current_idx);

                // Apply Axiom
                let current_axiom_str = arena.axiom_path[current_idx]
                    .last()
                    .map(|s: &String| s.clone())
                    .unwrap_or_else(|| "IDENTITY_STATIC".to_string());

                // We must extract these immutable fields BEFORE modifying `arena.states`
                let action_condition = arena.action_condition[current_idx].clone();
                let action_spatial = arena.action_spatial[current_idx].clone();
                let action_semantic = arena.action_semantic[current_idx].clone();
                let action_dx = arena.action_dx[current_idx];
                let action_dy = arena.action_dy[current_idx];
                let action_tier = arena.action_tier[current_idx];

                let states_mut = Arc::make_mut(&mut arena.states[current_idx]);
                for manifold in states_mut.iter_mut() {
                    MultiverseSandbox::apply_axiom(
                        &mut *manifold,
                        &action_condition,
                        &action_spatial,
                        &action_semantic,
                        action_dx,
                        action_dy,
                        action_tier,
                        &current_axiom_str,
                    );
                }

                // Reasoning (Free Energy)
                arena.reason(current_idx, &self.expected_grids, &initial_manifolds);

                let pragmatic_error = arena.reasoning_pragmatic[current_idx];
                let epistemic_value = arena.reasoning_epistemic[current_idx];
                let amplitude = arena.amplitudes[current_idx];
                let current_depth = arena.children_ranges[current_idx].1 as usize;

                // Visualizer & Logging
                let m_width = arena.states[current_idx][0].global_width;
                let m_height = arena.states[current_idx][0].global_height;

                let is_ground_state = pragmatic_error <= 0.0 && current_depth > 1;
                let is_pruned = amplitude < 0.01;

                println!(
                    "[Depth {}] Axioms: {:?} | Pragmatic: {:.2} | Epistemic: {:.2} | Prob: {:.4} | Dim: {}x{}",
                    current_depth,
                    arena.axiom_path[current_idx],
                    pragmatic_error,
                    epistemic_value,
                    amplitude,
                    m_width, m_height
                );

                if amplitude >= 0.0 {
                    let mcts_node = MctsNodeInfo {
                        id: 0,
                        depth: current_depth,
                        probability: amplitude,
                        pragmatic_error,
                        epistemic_value,
                        complexity: 0.0,
                        threshold: 0.05,
                        is_pruned,
                        is_ground_state,
                        is_expanding: !is_pruned
                            && !is_ground_state
                            && current_depth < self.max_depth,
                        path: arena.axiom_path[current_idx].clone(),
                        axiom_type: current_axiom_str.clone(),
                    };

                    let mut mock_siblings = vec![mcts_node.clone()];
                    mock_siblings.push(MctsNodeInfo {
                        probability: 0.8,
                        ..mcts_node.clone()
                    });

                    Visualizer::print_mcts_transparent(
                        &mcts_node,
                        &mock_siblings,
                        TransparencyLevel::Standard,
                    );

                    let debug_manifold = &arena.states[current_idx][0];
                    Visualizer::print_particle_memory_map(&debug_manifold);
                }

                // Cek Ground State
                if is_ground_state {
                    let result_wave = WaveNode {
                        axiom_type: arena.axiom_path[current_idx].clone(),
                        condition_tensor: arena.action_condition[current_idx].clone(),
                        tensor_spatial: arena.action_spatial[current_idx].clone(),
                        tensor_semantic: arena.action_semantic[current_idx].clone(),
                        delta_x: arena.action_dx[current_idx],
                        delta_y: arena.action_dy[current_idx],
                        physics_tier: arena.action_tier[current_idx],
                        static_background: std::sync::Arc::new(
                            crate::core::infinite_detail::CoarseData {
                                regions: std::sync::Arc::new(vec![]),
                                signatures: std::sync::Arc::new(vec![]),
                            },
                        ),
                        state_manifolds: arena.states[current_idx].clone(),
                        state_modified: arena.modified_flags[current_idx],
                        probability: amplitude,
                        depth: current_depth,
                    };
                    self.ground_states.write().unwrap().push(result_wave);

                    println!("\n🌟 === GROUND STATE DITEMUKAN (Zero Error) === 🌟");
                    let debug_manifold = &arena.states[current_idx][0];
                    Visualizer::print_tensor_quantum(
                        "Semantic T[0]",
                        &debug_manifold.get_semantic_tensor(0),
                        TransparencyLevel::Standard,
                        None,
                    );
                    Visualizer::print_tensor_quantum(
                        "Spatial T[0]",
                        &debug_manifold.get_spatial_tensor(0),
                        TransparencyLevel::Standard,
                        None,
                    );
                    println!("🌟 ===========================================\n");
                    break;
                }

                // Pruning Checks
                if amplitude < 0.05 {
                    arena.kill_node(current_idx);
                    continue;
                }

                let predicted_min_energy =
                    pragmatic_error * 0.9f32.powi((self.max_depth as i32) - (current_depth as i32));
                if predicted_min_energy > 5.0 && current_depth >= 2 {
                    arena.kill_node(current_idx);
                    continue;
                }

                // Branching Logic (Iteratif)
                if amplitude > 0.1 && current_depth < self.max_depth {
                    let max_branches = if current_depth == 0 { 20 } else { 2 };
                    let mut branch_count = 0;

                    for next_axiom in all_possible_axioms.iter() {
                        if arena.axiom_path[current_idx].last() == next_axiom.axiom_type.last() {
                            continue;
                        }

                        branch_count += 1;
                        if branch_count > max_branches {
                            break;
                        }

                        if next_axiom.physics_tier >= 3 && arena.action_tier[current_idx] >= 3 {
                            continue;
                        }

                        // Spawn child iteratif di Arena, membagikan referensi state CoW
                        // Modulasi Corong Toleransi (Femto Annealing)
                        let new_width = arena.tolerances[current_idx].precision_width * 1e-4; // Menajam secara eksponensial lebih cepat
                        let child_tolerance = EnergyTolerance {
                            precision_width: new_width.max(1e-15), // Berhenti di Femto scale
                            max_branching_factor: max_branches as u8,
                        };

                        let parent_state = arena.states[current_idx].clone();
                        if let Some(child_idx) =
                            arena.spawn_node(Some(current_idx), child_tolerance, parent_state)
                        {
                            // Populate child aksioma
                            arena.axiom_path[child_idx] = arena.axiom_path[current_idx].clone();
                            arena.axiom_path[child_idx].push(next_axiom.axiom_type[0].clone());

                            arena.action_condition[child_idx] = next_axiom.condition_tensor.clone();
                            arena.action_spatial[child_idx] = next_axiom.tensor_spatial.clone();
                            arena.action_semantic[child_idx] = next_axiom.tensor_semantic.clone();
                            arena.action_dx[child_idx] = next_axiom.delta_x;
                            arena.action_dy[child_idx] = next_axiom.delta_y;
                            arena.action_tier[child_idx] = next_axiom.physics_tier;

                            // Push ke frontier iteratif
                            frontier.push(child_idx);
                        }
                    }
                }
            }
        })
    }
}
