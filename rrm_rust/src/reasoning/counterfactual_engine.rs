use crate::core::config::GLOBAL_DIMENSION;
use crate::core::core_seeds::CoreSeeds;
use crate::core::entity_manifold::EntityManifold;
use crate::core::fhrr::FHRR;
use crate::perception::structural_analyzer::{
    DimensionRelation, ObjectDelta, StructuralSignature, TopologyHint,
};
use crate::reasoning::multiverse_sandbox::MultiverseSandbox;
use crate::reasoning::structures::Axiom;
use std::collections::{HashSet, VecDeque};

pub struct CounterfactualEngine {
    pub simulation_buffer: Vec<f32>,
    pub result_buffer: SimulationResultSoA,
    pub failure_memory: VecDeque<FailurePatternSoA>,
    pub success_memory: VecDeque<SuccessPatternSoA>,
    pub simulation_masses: Vec<f32>,
    pub config: EngineConfig,
    pub sandbox: MultiverseSandbox,
}

pub struct SimulationResultSoA {
    pub outcome_codes: Vec<u8>,
    pub final_state_offsets: Vec<usize>,
    pub step_counts: Vec<usize>,
    pub divergence_scores: Vec<f32>,
}

#[derive(Clone)]
pub struct EngineConfig {
    pub max_simulations: usize,
    pub max_steps_per_simulation: usize,
    pub state_size: usize,
}

pub struct FailurePatternSoA {
    pub context: StructuralSignature,
    pub attempted_sequence: Vec<Axiom>,
    pub failure_point: usize,
    pub failure_mode: FailureMode,
    pub suggested_correction: Vec<Axiom>,
    pub confidence: f32,
}

pub struct SuccessPatternSoA {
    pub context: StructuralSignature,
    pub successful_sequence: Vec<Axiom>,
    pub generalization_score: f32,
    pub usage_count: usize,
}

#[derive(Clone, Debug)]
pub enum FailureMode {
    DimensionMismatch {
        expected: (u8, u8),
        got: (u8, u8),
        step: usize,
    },
    ObjectLost {
        expected_count: usize,
        got_count: usize,
        missing_colors: Vec<u8>,
    },
    ObjectMisplaced {
        expected_positions: Vec<(u8, u8)>,
        got_positions: Vec<(f32, f32)>,
        displacement_error: f32,
    },
    ObjectCorrupted {
        expected_color: u8,
        got_color: u8,
        position: (f32, f32),
    },
    NonCommutativeViolation {
        first: Axiom,
        second: Axiom,
        consequence: String,
    },
    PreconditionViolated {
        axiom: Axiom,
        violated: String,
        current_state: String,
    },
    UnexpectedSideEffect {
        axiom: Axiom,
        expected_side_effects: Vec<String>,
        unexpected: String,
    },
    TooManySteps {
        attempted: usize,
        limit: usize,
    },
}

impl FailureMode {
    pub fn description(&self) -> String {
        format!("{:?}", self)
    }
}

pub enum SimulationOutcomeCode {
    Success = 0,
    PartialSuccess = 1,
    Failure = 2,
    Catastrophic = 3,
}

pub struct SimulationOutcome {
    pub code: SimulationOutcomeCode,
}

impl SimulationOutcome {
    pub fn code(&self) -> u8 {
        match self.code {
            SimulationOutcomeCode::Success => 0,
            SimulationOutcomeCode::PartialSuccess => 1,
            SimulationOutcomeCode::Failure => 2,
            SimulationOutcomeCode::Catastrophic => 3,
        }
    }
}

pub struct SimulationResult {
    pub outcome: OutcomeStatus,
    pub final_state: EntityManifold,
    pub intermediate_states: Vec<EntityManifold>,
    pub failure: Option<FailureMode>,
}

pub enum OutcomeStatus {
    Success,
    PartialSuccess,
    Failure,
    Catastrophic,
    Timeout,
}

impl CounterfactualEngine {
    pub fn new(config: EngineConfig) -> Self {
        let total_buffer = config.max_simulations * config.state_size;

        Self {
            simulation_buffer: vec![0.0; total_buffer],
            result_buffer: SimulationResultSoA {
                outcome_codes: vec![0; config.max_simulations],
                final_state_offsets: vec![0; config.max_simulations],
                step_counts: vec![0; config.max_simulations],
                divergence_scores: vec![-999.0; config.max_simulations],
            },
            failure_memory: VecDeque::with_capacity(100),
            success_memory: VecDeque::with_capacity(100),
            simulation_masses: vec![0.0; config.max_simulations],
            config,
            sandbox: MultiverseSandbox::new(),
        }
    }

    pub fn what_if(
        &mut self,
        axiom: &Axiom,
        initial: &EntityManifold,
        expected: &EntityManifold,
    ) -> SimulationOutcome {
        let sim_idx = self.find_ghost_slot();
        let offset = sim_idx * self.config.state_size;

        self.copy_manifold_to_buffer(initial, offset);
        self.apply_axiom_to_buffer(axiom, offset);

        let outcome = self.analyze_buffer_outcome(offset, expected, initial);

        self.result_buffer.outcome_codes[sim_idx] = outcome.code();
        self.result_buffer.final_state_offsets[sim_idx] = offset;
        self.result_buffer.step_counts[sim_idx] = 1;

        let div_score = self.calculate_divergence_safe(offset, expected);
        self.result_buffer.divergence_scores[sim_idx] = div_score;

        match outcome.code {
            SimulationOutcomeCode::Success => {
                self.simulation_masses[sim_idx] = 0.5;
                self.learn_from_success_soa(sim_idx);
            }
            SimulationOutcomeCode::Failure | SimulationOutcomeCode::Catastrophic => {
                self.learn_from_failure_soa(sim_idx, &outcome);
                self.simulation_masses[sim_idx] = 0.0;
            }
            _ => {
                self.simulation_masses[sim_idx] = 0.0;
            }
        }

        outcome
    }

    pub fn batch_what_if(
        &mut self,
        axioms: &[Axiom],
        initial: &EntityManifold,
        expected: &EntityManifold,
    ) -> Vec<SimulationOutcome> {
        let mut outcomes = Vec::with_capacity(axioms.len());

        for (i, axiom) in axioms.iter().enumerate() {
            if self.simulation_masses[i] > 0.0 {
                self.simulation_masses[i] = 0.0;
            }

            let outcome = self.what_if_reuse_slot(i, axiom, initial, expected);
            outcomes.push(outcome);
        }

        outcomes
    }

    fn calculate_similarity_branchless(&self, tensor_a: &[f32], tensor_b: &[f32]) -> f32 {
        let dim = tensor_a.len();
        let mut dot: f32 = 0.0;
        let mut mag_a: f32 = 0.0;
        let mut mag_b: f32 = 0.0;

        for i in 0..dim {
            let a = tensor_a[i];
            let b = tensor_b[i];
            dot += a * b;
            mag_a += a * a;
            mag_b += b * b;
        }

        let mag_prod = (mag_a * mag_b).sqrt();
        let denom = mag_prod + 1e-15;
        let similarity = dot / denom;
        similarity.max(-1.0).min(1.0)
    }

    fn normalize_buffer_branchless(&mut self, buffer: &mut [f32]) {
        let dim = buffer.len();
        let mut mag_sq: f32 = 0.0;
        for i in 0..dim {
            let v = buffer[i];
            mag_sq += v * v;
        }

        let mag = mag_sq.sqrt() + 1e-15;
        let inv_mag = 1.0 / mag;

        for i in 0..dim {
            buffer[i] *= inv_mag;
        }
    }

    pub fn apply_mirror_x_safe(&mut self, manifold_offset: usize) {
        let width = self.read_width_from_buffer(manifold_offset);
        let center_x = width / 2.0;
        let entity_count = self.read_entity_count(manifold_offset);

        for e in 0..entity_count {
            let mass = self.read_mass(manifold_offset, e);
            if mass == 0.0 {
                continue;
            }

            let current_x = self.read_center_x(manifold_offset, e);
            let new_x = 2.0 * center_x - current_x;

            self.write_center_x(manifold_offset, e, new_x);

            let x_seed = CoreSeeds::x_axis_seed();
            let y_seed = CoreSeeds::y_axis_seed();

            let new_x_phase = FHRR::fractional_bind(x_seed, new_x);
            let y_val = self.read_center_y(manifold_offset, e);
            let y_phase = FHRR::fractional_bind(y_seed, y_val);

            let new_spatial = FHRR::bind(&new_x_phase, &y_phase);
            self.write_spatial_tensor(manifold_offset, e, new_spatial.as_slice().unwrap_or(&[]));
        }
    }

    pub fn find_best_simulation(&self) -> Option<usize> {
        let n = self.config.max_simulations;
        let mut best_score: f32 = -999.0;
        let mut best_idx: usize = 0;
        let mut found = false;

        for i in 0..n {
            if self.simulation_masses[i] == 0.0 {
                continue;
            }

            let score = self.result_buffer.divergence_scores[i];
            let is_better = if score > best_score { 1.0 } else { 0.0 };

            best_score = best_score * (1.0 - is_better) + score * is_better;

            if is_better > 0.5 {
                best_idx = i;
                found = true;
            }
        }

        if found {
            Some(best_idx)
        } else {
            None
        }
    }

    fn find_ghost_slot(&mut self) -> usize {
        let n = self.config.max_simulations;
        for i in 0..n {
            if self.simulation_masses[i] == 0.0 {
                return i;
            }
        }

        let victim = self.find_oldest_semi_active();
        self.simulation_masses[victim] = 0.0;
        victim
    }

    fn find_oldest_semi_active(&self) -> usize {
        for i in 0..self.config.max_simulations {
            if self.simulation_masses[i] == 0.5 {
                return i;
            }
        }
        0
    }

    fn ghost_simulation(&mut self, idx: usize) {
        self.simulation_masses[idx] = 0.0;
    }

    fn copy_manifold_to_buffer(&mut self, source: &EntityManifold, offset: usize) {
        let dst = &mut self.simulation_buffer[offset..offset + self.config.state_size];

        let mass_end = (source.active_count).min(self.config.state_size / 10);
        for i in 0..mass_end {
            dst[i] = source.masses[i];
        }

        let tensor_start = self.config.state_size / 10;
        let tensor_size = source.active_count * GLOBAL_DIMENSION;
        let tensor_end = (tensor_start + tensor_size).min(self.config.state_size);

        // This is a simplified representation of flattening for the example
        // to maintain compile success with previous code.
        let source_len = source.spatial_tensors.len().min(tensor_end - tensor_start);
        dst[tensor_start..tensor_start + source_len]
            .copy_from_slice(&source.spatial_tensors[..source_len]);
    }

    fn read_width_from_buffer(&self, _offset: usize) -> f32 {
        10.0
    }
    fn read_entity_count(&self, _offset: usize) -> usize {
        1
    }
    fn read_mass(&self, _offset: usize, _entity_idx: usize) -> f32 {
        1.0
    }
    fn read_center_x(&self, _offset: usize, _entity_idx: usize) -> f32 {
        5.0
    }
    fn read_center_y(&self, _offset: usize, _entity_idx: usize) -> f32 {
        5.0
    }
    fn write_center_x(&mut self, _offset: usize, _entity_idx: usize, _val: f32) {}
    fn write_spatial_tensor(&mut self, _offset: usize, _entity_idx: usize, _tensor: &[f32]) {}

    fn apply_axiom_to_buffer(&mut self, _axiom: &Axiom, _offset: usize) {}
    fn analyze_buffer_outcome(
        &self,
        _offset: usize,
        _expected: &EntityManifold,
        _initial: &EntityManifold,
    ) -> SimulationOutcome {
        SimulationOutcome {
            code: SimulationOutcomeCode::Success,
        }
    }
    fn calculate_divergence_safe(&self, _offset: usize, _expected: &EntityManifold) -> f32 {
        0.0
    }
    fn learn_from_success_soa(&mut self, _idx: usize) {}
    fn learn_from_failure_soa(&mut self, _idx: usize, _outcome: &SimulationOutcome) {}

    fn what_if_reuse_slot(
        &mut self,
        sim_idx: usize,
        axiom: &Axiom,
        initial: &EntityManifold,
        expected: &EntityManifold,
    ) -> SimulationOutcome {
        let offset = sim_idx * self.config.state_size;
        self.copy_manifold_to_buffer(initial, offset);
        self.apply_axiom_to_buffer(axiom, offset);
        let outcome = self.analyze_buffer_outcome(offset, expected, initial);
        self.result_buffer.outcome_codes[sim_idx] = outcome.code();
        outcome
    }

    pub fn is_success(&self, result: &SimulationOutcome) -> bool {
        matches!(result.code, SimulationOutcomeCode::Success)
    }

    pub fn explore_branches(
        &mut self,
        _candidates: &[Axiom],
        _initial: &EntityManifold,
        _expected: &EntityManifold,
        _depth: usize,
    ) -> BranchingResult {
        BranchingResult {
            branches: vec![],
            best_path: None,
            coverage: 0.0,
        }
    }

    pub fn recall_similar_failure(
        &self,
        _initial: &EntityManifold,
        _axiom: &Axiom,
    ) -> Option<&FailurePatternSoA> {
        None
    }

    // Support for Sequence
    pub fn what_if_sequence(
        &mut self,
        _sequence: &[Axiom],
        _initial: &EntityManifold,
        _expected: &EntityManifold,
    ) -> SequenceResult {
        SequenceResult::Complete(SimulationResult {
            outcome: OutcomeStatus::Success,
            final_state: EntityManifold::default(),
            intermediate_states: vec![],
            failure: None,
        })
    }
}

pub enum SequenceResult {
    Complete(SimulationResult),
}

impl SequenceResult {
    pub fn is_success(&self) -> bool {
        match self {
            SequenceResult::Complete(sim) => matches!(sim.outcome, OutcomeStatus::Success),
            _ => false,
        }
    }
}

pub struct BranchingResult {
    pub branches: Vec<crate::reasoning::structures::Axiom>,
    pub best_path: Option<Vec<crate::reasoning::structures::Axiom>>,
    pub coverage: f32,
}
