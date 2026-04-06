use std::collections::{VecDeque, HashSet};
use crate::core::entity_manifold::EntityManifold;
use crate::reasoning::structures::Axiom;
use crate::reasoning::multiverse_sandbox::MultiverseSandbox;
use crate::perception::structural_analyzer::{StructuralSignature, DimensionRelation, ObjectDelta, TopologyHint};

pub struct CounterfactualEngine {
    pub sandbox: MultiverseSandbox,
    pub failure_memory: VecDeque<FailurePattern>,
    pub success_memory: VecDeque<SuccessPattern>,
    pub current_trace: Option<SimulationTrace>,
    pub max_failure_memory: usize,
    pub max_success_memory: usize,
}

pub struct SimulationTrace {}

pub struct SimulationResult {
    pub outcome: OutcomeStatus,
    pub final_state: EntityManifold,
    pub intermediate_states: Vec<EntityManifold>,
    pub metrics: SimulationMetrics,
    pub failure: Option<FailureMode>,
    pub causal_explanation: String,
}

pub enum OutcomeStatus {
    Success,
    PartialSuccess,
    Failure,
    Catastrophic,
    Timeout,
}

pub struct SimulationMetrics {
    pub steps_taken: usize,
    pub objects_manipulated: usize,
    pub dimension_changes: usize,
    pub color_changes: usize,
    pub computational_cost: f32,
    pub epistemic_value: f32,
}

pub struct FailurePattern {
    pub context: StructuralSignature,
    pub attempted_sequence: Vec<Axiom>,
    pub failure_point: usize,
    pub failure_mode: FailureMode,
    pub suggested_correction: Vec<Axiom>,
    pub confidence: f32,
}

pub struct SuccessPattern {
    pub context: StructuralSignature,
    pub successful_sequence: Vec<Axiom>,
    pub generalization_score: f32,
    pub usage_count: usize,
}

#[derive(Clone, Debug)]
pub enum FailureMode {
    DimensionMismatch { expected: (u8, u8), got: (u8, u8), step: usize },
    ObjectLost { expected_count: usize, got_count: usize, missing_colors: Vec<u8> },
    ObjectMisplaced { expected_positions: Vec<(u8, u8)>, got_positions: Vec<(f32, f32)>, displacement_error: f32 },
    ObjectCorrupted { expected_color: u8, got_color: u8, position: (f32, f32) },
    NonCommutativeViolation { first: Axiom, second: Axiom, consequence: String },
    PreconditionViolated { axiom: Axiom, violated: String, current_state: String },
    UnexpectedSideEffect { axiom: Axiom, expected_side_effects: Vec<String>, unexpected: String },
    TooManySteps { attempted: usize, limit: usize },
}

impl FailureMode {
    pub fn description(&self) -> String {
        format!("{:?}", self)
    }
}

pub enum SequenceResult {
    Complete(SimulationResult),
    PreconditionViolated { at_step: usize, violation: String, state_before: EntityManifold },
    CatastrophicFailure { at_step: usize, state: EntityManifold, reason: String },
    Diverging { at_step: usize, divergence_score: f32, estimated_recovery_steps: usize },
}

impl SequenceResult {
    pub fn is_success(&self) -> bool {
        match self {
            SequenceResult::Complete(sim) => matches!(sim.outcome, OutcomeStatus::Success),
            _ => false,
        }
    }
}

pub struct Branch {
    pub path: Vec<Axiom>,
    pub result: SequenceResult,
    pub cumulative_cost: f32,
}

pub struct BranchingResult {
    pub branches: Vec<Branch>,
    pub best_path: Option<Vec<Axiom>>,
    pub coverage: f32,
}

pub struct StepResult {
    pub step: usize,
    pub axiom: Axiom,
    pub state_after: EntityManifold,
    pub divergence: f32,
}

impl CounterfactualEngine {
    pub fn new() -> Self {
        Self {
            sandbox: MultiverseSandbox::new(),
            failure_memory: VecDeque::with_capacity(100),
            success_memory: VecDeque::with_capacity(100),
            current_trace: None,
            max_failure_memory: 100,
            max_success_memory: 100,
        }
    }

    pub fn what_if(
        &mut self,
        axiom: &Axiom,
        initial: &EntityManifold,
        expected: &EntityManifold,
    ) -> SimulationResult {
        let mut state = initial.clone();
        let mut intermediates = vec![state.clone()];

        MultiverseSandbox::apply_axiom(&mut state, &axiom.condition_tensor, &axiom.delta_spatial, &axiom.delta_semantic, axiom.delta_x, axiom.delta_y, axiom.tier, &axiom.name);
        intermediates.push(state.clone());

        let outcome = self.analyze_outcome(&state, expected, initial);
        let metrics = self.compute_metrics(&intermediates, initial);
        let failure_clone = outcome.failure.clone();
        let explanation = self.explain_what_happened(axiom, initial, &state, &outcome);

        match &outcome.outcome {
            OutcomeStatus::Success | OutcomeStatus::PartialSuccess => {
                self.learn_success(initial, axiom, &state);
            },
            _ => {
                if let Some(ref failure) = failure_clone {
                    self.learn_failure(initial, axiom, failure, 0);
                }
            }
        }

        SimulationResult {
            outcome: outcome.outcome,
            final_state: state,
            intermediate_states: intermediates,
            metrics,
            failure: failure_clone,
            causal_explanation: explanation,
        }
    }

    pub fn what_if_sequence(
        &mut self,
        sequence: &[Axiom],
        initial: &EntityManifold,
        expected: &EntityManifold,
    ) -> SequenceResult {
        let mut state = initial.clone();
        let mut intermediates = vec![state.clone()];
        let mut step_results = Vec::new();

        for (step_idx, axiom) in sequence.iter().enumerate() {
            if let Some(violation) = self.check_preconditions(axiom, &state) {
                return SequenceResult::PreconditionViolated {
                    at_step: step_idx,
                    violation,
                    state_before: state.clone(),
                };
            }

            MultiverseSandbox::apply_axiom(&mut state, &axiom.condition_tensor, &axiom.delta_spatial, &axiom.delta_semantic, axiom.delta_x, axiom.delta_y, axiom.tier, &axiom.name);
            intermediates.push(state.clone());

            if self.is_catastrophic(&state) {
                return SequenceResult::CatastrophicFailure {
                    at_step: step_idx,
                    state,
                    reason: "Invalid manifold state detected".to_string(),
                };
            }

            let divergence = self.estimate_divergence(&state, expected, step_idx);
            if divergence > 0.9 {
                return SequenceResult::Diverging {
                    at_step: step_idx,
                    divergence_score: divergence,
                    estimated_recovery_steps: self.estimate_recovery(&state, expected),
                };
            }

            step_results.push(StepResult {
                step: step_idx,
                axiom: axiom.clone(),
                state_after: state.clone(),
                divergence,
            });
        }

        let final_outcome = self.analyze_outcome(&state, expected, initial);
        let total_metrics = self.compute_metrics(&intermediates, initial);

        if matches!(final_outcome.outcome, OutcomeStatus::Success) {
            self.learn_sequence_success(initial, sequence, &state);
        }

        SequenceResult::Complete(SimulationResult {
            outcome: final_outcome.outcome,
            failure: final_outcome.failure,
            final_state: state,
            intermediate_states: intermediates,
            metrics: total_metrics,
            causal_explanation: self.explain_sequence(&step_results, initial, expected),
        })
    }

    pub fn explore_branches(
        &mut self,
        candidates: &[Axiom],
        initial: &EntityManifold,
        expected: &EntityManifold,
        depth: usize,
    ) -> BranchingResult {
        let mut results = Vec::new();

        let mut depth1_results: Vec<(Axiom, SimulationResult)> = Vec::new();
        for axiom in candidates {
            let result = self.what_if(axiom, initial, expected);
            depth1_results.push((axiom.clone(), result));
        }

        depth1_results.sort_by(|a, b| {
            let score_a = self.promise_score(&a.1);
            let score_b = self.promise_score(&b.1);
            score_b.partial_cmp(&score_a).unwrap_or(std::cmp::Ordering::Equal)
        });

        if depth >= 2 {
            let top_k = depth1_results.iter().take(5);

            for (first_axiom, first_result) in top_k {
                if !matches!(first_result.outcome, OutcomeStatus::Catastrophic) {
                    for second_axiom in candidates {
                        if self.are_compatible(first_axiom, second_axiom, &first_result.final_state) {
                            let sequence = vec![first_axiom.clone(), second_axiom.clone()];
                            let seq_result = self.what_if_sequence(&sequence, initial, expected);

                            results.push(Branch {
                                path: sequence,
                                result: seq_result,
                                cumulative_cost: first_result.metrics.computational_cost + 1.0,
                            });
                        }
                    }
                }
            }
        }

        results.sort_by(|a, b| {
            let score_a = self.branch_score(a);
            let score_b = self.branch_score(b);
            score_b.partial_cmp(&score_a).unwrap_or(std::cmp::Ordering::Equal)
        });

        BranchingResult {
            coverage: if candidates.is_empty() { 0.0 } else { results.len() as f32 / (candidates.len().pow(2) as f32) },
            best_path: results.first().map(|b| b.path.clone()),
            branches: results,
        }
    }

    fn explain_what_happened(
        &self,
        axiom: &Axiom,
        before: &EntityManifold,
        after: &EntityManifold,
        outcome: &SimulationResultHelper,
    ) -> String {
        let mut explanation = format!("Menerapkan {}:\n", axiom.description());

        let count_before = before.active_count;
        let count_after = after.active_count;
        if count_before != count_after {
            explanation.push_str(&format!("- Jumlah objek: {} -> {}\n", count_before, count_after));
        }

        if before.global_width != after.global_width || before.global_height != after.global_height {
            explanation.push_str(&format!("- Dimensi: {}x{} -> {}x{}\n", before.global_width, before.global_height, after.global_width, after.global_height));
        }

        match &outcome.outcome {
            OutcomeStatus::Success => explanation.push_str("✅ Hasil cocok dengan ekspektasi"),
            OutcomeStatus::PartialSuccess => explanation.push_str("⚠️ Hasil mendekati tapi tidak sempurna"),
            OutcomeStatus::Failure => explanation.push_str("❌ Hasil tidak cocok"),
            _ => {}
        }
        explanation
    }

    fn explain_sequence(
        &self,
        steps: &[StepResult],
        _initial: &EntityManifold,
        _expected: &EntityManifold,
    ) -> String {
        let mut explanation = format!("Sequence {} langkah:\n", steps.len());
        for (i, step) in steps.iter().enumerate() {
            let trend = if step.divergence < 0.3 { "✅ mendekati target" } else if step.divergence < 0.7 { "⚠️ netral" } else { "❌ menjauh dari target" };
            explanation.push_str(&format!("  {}. {} -> divergensi {:.2} ({})\n", i + 1, step.axiom.short_name(), step.divergence, trend));
        }
        explanation
    }

    fn learn_failure(
        &mut self,
        _context: &EntityManifold,
        attempted: &Axiom,
        failure: &FailureMode,
        step: usize,
    ) {
        let signature = StructuralSignature {
            dim_relation: DimensionRelation::Equal,
            object_delta: ObjectDelta::SameCount,
            color_transitions: vec![],
            topology_in: TopologyHint::Grid,
            topology_out: TopologyHint::Grid,
            has_template_frame: false,
            symmetry_change: crate::perception::structural_analyzer::SymmetryChange::Preserved,
        };

        let correction = self.suggest_correction(failure, _context);

        let pattern = FailurePattern {
            context: signature,
            attempted_sequence: vec![attempted.clone()],
            failure_point: step,
            failure_mode: failure.clone(),
            suggested_correction: correction,
            confidence: 0.8,
        };

        if self.failure_memory.len() >= self.max_failure_memory {
            self.failure_memory.pop_back();
        }
        self.failure_memory.push_front(pattern);
    }

    fn learn_success(
        &mut self,
        _context: &EntityManifold,
        axiom: &Axiom,
        _result: &EntityManifold,
    ) {
        let signature = StructuralSignature {
            dim_relation: DimensionRelation::Equal,
            object_delta: ObjectDelta::SameCount,
            color_transitions: vec![],
            topology_in: TopologyHint::Grid,
            topology_out: TopologyHint::Grid,
            has_template_frame: false,
            symmetry_change: crate::perception::structural_analyzer::SymmetryChange::Preserved,
        };

        let pattern = SuccessPattern {
            context: signature,
            successful_sequence: vec![axiom.clone()],
            generalization_score: 1.0,
            usage_count: 1,
        };

        if self.success_memory.len() >= self.max_success_memory {
            self.success_memory.pop_back();
        }
        self.success_memory.push_front(pattern);
    }

    fn learn_sequence_success(
        &mut self,
        _context: &EntityManifold,
        sequence: &[Axiom],
        _result: &EntityManifold,
    ) {
        let signature = StructuralSignature {
            dim_relation: DimensionRelation::Equal,
            object_delta: ObjectDelta::SameCount,
            color_transitions: vec![],
            topology_in: TopologyHint::Grid,
            topology_out: TopologyHint::Grid,
            has_template_frame: false,
            symmetry_change: crate::perception::structural_analyzer::SymmetryChange::Preserved,
        };

        let is_novel = !self.success_memory.iter().any(|p| {
            p.successful_sequence.len() == sequence.len() &&
            p.successful_sequence.iter().zip(sequence.iter()).all(|(a, b)| a.similarity(b) > 0.9)
        });

        if is_novel {
            let pattern = SuccessPattern {
                context: signature,
                successful_sequence: sequence.to_vec(),
                generalization_score: 1.0,
                usage_count: 1,
            };

            if self.success_memory.len() >= self.max_success_memory {
                self.success_memory.pop_back();
            }
            self.success_memory.push_front(pattern);
        }
    }

    fn suggest_correction(&self, failure: &FailureMode, _context: &EntityManifold) -> Vec<Axiom> {
        match failure {
            FailureMode::DimensionMismatch { expected, got, .. } => {
                if got.0 > expected.0 || got.1 > expected.1 {
                    vec![Axiom::crop_to_content()]
                } else {
                    vec![Axiom::identity()]
                }
            },
            FailureMode::ObjectLost { .. } => vec![Axiom::identity()],
            FailureMode::NonCommutativeViolation { first, second, .. } => vec![second.clone(), first.clone()],
            _ => vec![],
        }
    }

    pub fn recall_similar_failure(&self, _context: &EntityManifold, attempted: &Axiom) -> Option<&FailurePattern> {
        self.failure_memory.iter().find(|p| p.attempted_sequence.first().map(|a| a.similarity(attempted) > 0.9).unwrap_or(false))
    }

    pub fn recall_similar_success(&self, _context: &EntityManifold) -> Option<&SuccessPattern> {
        self.success_memory.iter().next()
    }

    fn analyze_outcome(
        &self,
        state: &EntityManifold,
        expected: &EntityManifold,
        _initial: &EntityManifold,
    ) -> SimulationResultHelper {
        let dim_match = (state.global_width - expected.global_width).abs() < 0.5 &&
                       (state.global_height - expected.global_height).abs() < 0.5;

        if !dim_match {
            return SimulationResultHelper {
                outcome: OutcomeStatus::Failure,
                failure: Some(FailureMode::DimensionMismatch {
                    expected: (expected.global_width as u8, expected.global_height as u8),
                    got: (state.global_width as u8, state.global_height as u8),
                    step: 0,
                }),
            };
        }

        let mismatches = self.compare_objects(state, expected);
        if mismatches == 0 {
            SimulationResultHelper { outcome: OutcomeStatus::Success, failure: None }
        } else if mismatches <= 2 {
            SimulationResultHelper { outcome: OutcomeStatus::PartialSuccess, failure: None }
        } else {
            SimulationResultHelper { outcome: OutcomeStatus::Failure, failure: None }
        }
    }

    fn compare_objects(&self, state: &EntityManifold, expected: &EntityManifold) -> usize {
        (state.active_count as isize - expected.active_count as isize).unsigned_abs()
    }

    fn compute_metrics(&self, intermediates: &[EntityManifold], _initial: &EntityManifold) -> SimulationMetrics {
        SimulationMetrics {
            steps_taken: intermediates.len().saturating_sub(1),
            objects_manipulated: 0,
            dimension_changes: 0,
            color_changes: 0,
            computational_cost: 1.0,
            epistemic_value: 0.5,
        }
    }

    fn promise_score(&self, result: &SimulationResult) -> f32 {
        match result.outcome {
            OutcomeStatus::Success => 1.0,
            OutcomeStatus::PartialSuccess => 0.7,
            OutcomeStatus::Failure => 0.3,
            OutcomeStatus::Catastrophic => 0.0,
            OutcomeStatus::Timeout => 0.1,
        }
    }

    fn branch_score(&self, branch: &Branch) -> f32 {
        let outcome_score = match &branch.result {
            SequenceResult::Complete(r) => self.promise_score(r),
            SequenceResult::PreconditionViolated { .. } | SequenceResult::CatastrophicFailure { .. } => 0.0,
            SequenceResult::Diverging { divergence_score, .. } => 1.0 - divergence_score,
        };
        outcome_score - branch.cumulative_cost * 0.1
    }

    fn check_preconditions(&self, _axiom: &Axiom, _state: &EntityManifold) -> Option<String> { None }
    fn is_catastrophic(&self, _state: &EntityManifold) -> bool { false }
    fn estimate_divergence(&self, _state: &EntityManifold, _expected: &EntityManifold, _step_idx: usize) -> f32 { 0.5 }
    fn estimate_recovery(&self, _state: &EntityManifold, _expected: &EntityManifold) -> usize { 1 }
    fn are_compatible(&self, _first: &Axiom, _second: &Axiom, _state: &EntityManifold) -> bool { true }
}

struct SimulationResultHelper {
    outcome: OutcomeStatus,
    failure: Option<FailureMode>,
}
