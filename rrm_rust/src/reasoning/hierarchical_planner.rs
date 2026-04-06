use crate::core::entity_manifold::EntityManifold;
use crate::perception::structural_analyzer::{StructuralDelta, TaskClass};
use crate::reasoning::counterfactual_engine::{CounterfactualEngine, SimulationOutcomeCode};
use crate::reasoning::structures::Axiom;
use crate::self_awareness::skill_ontology::SkillOntology;

#[derive(Clone, Copy, PartialEq)]
pub enum PlanningPhase {
    Phase1StructuralAnalysis = 1,
    Phase2StrategySelection = 2,
    Phase3MacroExecution = 3,
}

#[derive(Clone, Copy, PartialEq)]
pub enum SubgoalType {
    AnalyzeDimensionChange = 1,
}

pub struct HierarchicalPlanner {
    pub node_types: Vec<u8>,
    pub node_status: Vec<u8>,
    pub parent_indices: Vec<i32>,
    pub first_child_indices: Vec<i32>,
    pub next_sibling_indices: Vec<i32>,
    pub phase_data: Vec<PlanningPhase>,
    pub subgoal_data: Vec<SubgoalType>,
    pub axiom_data: Vec<Axiom>,
    pub max_nodes: usize,
    pub active_node_count: usize,
}

pub enum PhaseResultSoA {
    Success {
        next_phase: Option<usize>,
    },
    PartialSuccess {
        issues: Vec<PhaseIssueSoA>,
        suggested_retry: bool,
    },
    Failure {
        reason: String,
        recoverable: bool,
    },
    Complete,
}

pub enum PhaseIssueSoA {
    PreconditionFailed(u8),
}

impl PhaseResultSoA {
    pub fn is_complete(&self) -> bool {
        matches!(self, PhaseResultSoA::Complete)
    }

    pub fn is_terminal_failure(&self) -> bool {
        matches!(
            self,
            PhaseResultSoA::Failure {
                recoverable: false,
                ..
            }
        )
    }

    pub fn needs_retry(&self) -> bool {
        matches!(
            self,
            PhaseResultSoA::PartialSuccess {
                suggested_retry: true,
                ..
            }
        )
    }
}

impl HierarchicalPlanner {
    pub fn new(max_nodes: usize) -> Self {
        Self {
            node_types: vec![6; max_nodes],
            node_status: vec![0; max_nodes],
            parent_indices: vec![-1; max_nodes],
            first_child_indices: vec![-1; max_nodes],
            next_sibling_indices: vec![-1; max_nodes],
            phase_data: vec![PlanningPhase::Phase1StructuralAnalysis; max_nodes],
            subgoal_data: vec![SubgoalType::AnalyzeDimensionChange; max_nodes],
            axiom_data: Vec::with_capacity(max_nodes),
            max_nodes,
            active_node_count: 0,
        }
    }

    pub fn from_delta(_delta: &StructuralDelta, _ontology: &SkillOntology) -> Self {
        Self::new(1000)
    }

    pub fn plan_with_validation(
        &mut self,
        _engine: &mut CounterfactualEngine,
        _initial: &EntityManifold,
        _expected: &EntityManifold,
    ) -> Option<Vec<Axiom>> {
        None
    }

    pub fn build_plan_soa(&mut self, _delta: &StructuralDelta, _ontology: &SkillOntology) {
        let root = self.alloc_node(0).unwrap_or(0);
        self.node_status[root] = 2; // Ready
        self.phase_data[root] = PlanningPhase::Phase1StructuralAnalysis;
    }

    pub fn execute_next_phase_soa(
        &mut self,
        current_state: &mut EntityManifold,
        expected: &EntityManifold,
        engine: &mut CounterfactualEngine,
    ) -> PhaseResultSoA {
        let phase_idx = match self.find_ready_phase() {
            Some(idx) => idx,
            None => return PhaseResultSoA::Complete,
        };

        let phase = self.phase_data[phase_idx];

        if phase == PlanningPhase::Phase1StructuralAnalysis {
            return self.execute_phase_1_soa(phase_idx, current_state, expected);
        }
        if phase == PlanningPhase::Phase2StrategySelection {
            return self.execute_phase_2_soa(phase_idx, current_state, expected, engine);
        }
        if phase == PlanningPhase::Phase3MacroExecution {
            return self.execute_phase_3_soa(phase_idx, current_state, expected, engine);
        }

        PhaseResultSoA::Failure {
            reason: "Unknown phase".to_string(),
            recoverable: false,
        }
    }

    fn find_ready_phase(&self) -> Option<usize> {
        for i in 0..self.active_node_count {
            if self.node_status[i] == 2 {
                return Some(i);
            }
        }
        None
    }

    fn alloc_node(&mut self, node_type: u8) -> Option<usize> {
        if self.active_node_count < self.max_nodes {
            let idx = self.active_node_count;
            self.node_types[idx] = node_type;
            self.node_status[idx] = 0;
            self.active_node_count += 1;
            Some(idx)
        } else {
            self.compact_and_realloc(node_type)
        }
    }

    fn compact_and_realloc(&mut self, node_type: u8) -> Option<usize> {
        for i in 0..self.active_node_count {
            if self.node_status[i] == 4 {
                self.node_status[i] = 6;
            }
        }
        for i in 0..self.active_node_count {
            if self.node_status[i] == 6 {
                self.node_types[i] = node_type;
                self.node_status[i] = 0;
                return Some(i);
            }
        }
        None
    }

    fn execute_phase_1_soa(
        &mut self,
        phase_idx: usize,
        _state: &EntityManifold,
        _exp: &EntityManifold,
    ) -> PhaseResultSoA {
        self.node_status[phase_idx] = 4; // Complete
        PhaseResultSoA::Success { next_phase: None }
    }

    fn execute_phase_2_soa(
        &mut self,
        phase_idx: usize,
        current_state: &EntityManifold,
        expected: &EntityManifold,
        engine: &mut CounterfactualEngine,
    ) -> PhaseResultSoA {
        let candidates = self.generate_strategy_candidates(phase_idx);
        let mut results = Vec::with_capacity(candidates.len());

        for candidate in candidates.iter() {
            if !self.validate_candidate(candidate) {
                results.push(SimulationOutcomeCode::Failure);
                continue;
            }
            let outcome = engine.what_if(candidate, current_state, expected);
            results
                .push(unsafe { std::mem::transmute::<u8, SimulationOutcomeCode>(outcome.code()) });
        }

        let mut best_idx = 0;
        let mut best_score: f32 = -999.0;

        for (i, code) in results.iter().enumerate() {
            let score = match code {
                SimulationOutcomeCode::Success => 1.0,
                SimulationOutcomeCode::PartialSuccess => 0.5,
                _ => -1.0,
            };
            if score > best_score {
                best_score = score;
                best_idx = i;
            }
        }

        if best_score > 0.0 {
            self.install_strategy(best_idx, phase_idx);
            self.node_status[phase_idx] = 4;
            PhaseResultSoA::Success { next_phase: None }
        } else {
            PhaseResultSoA::Failure {
                reason: "No viable strategy".to_string(),
                recoverable: true,
            }
        }
    }

    fn execute_phase_3_soa(
        &mut self,
        phase_idx: usize,
        current_state: &mut EntityManifold,
        _exp: &EntityManifold,
        _engine: &mut CounterfactualEngine,
    ) -> PhaseResultSoA {
        let primitives = self.get_primitives_for_phase(phase_idx);
        for (i, primitive_idx) in primitives.iter().enumerate() {
            let axiom = &self.axiom_data[*primitive_idx];
            if !self.check_preconditions_soa(axiom, current_state) {
                return PhaseResultSoA::PartialSuccess {
                    issues: vec![PhaseIssueSoA::PreconditionFailed(i as u8)],
                    suggested_retry: true,
                };
            }
            match axiom.tier {
                4 => self.apply_geometry_safe(axiom, current_state),
                _ => crate::reasoning::multiverse_sandbox::MultiverseSandbox::apply_axiom(
                    current_state,
                    &axiom.condition_tensor,
                    &axiom.delta_spatial,
                    &axiom.delta_semantic,
                    axiom.delta_x,
                    axiom.delta_y,
                    axiom.tier,
                    &axiom.name,
                ),
            }
            if self.count_valid_entities(current_state) == 0 {
                return PhaseResultSoA::Failure {
                    reason: "All entities ghosted".to_string(),
                    recoverable: false,
                };
            }
        }
        self.node_status[phase_idx] = 4;
        PhaseResultSoA::Success { next_phase: None }
    }

    fn apply_geometry_safe(&self, axiom: &Axiom, state: &mut EntityManifold) {
        let is_mirror_x = axiom.name.contains("MIRROR_X");
        let is_mirror_y = axiom.name.contains("MIRROR_Y");
        let is_rotate = axiom.name.contains("ROTATE");

        let width = state.global_width;
        let height = state.global_height;
        let center_x = width / 2.0;
        let center_y = height / 2.0;

        for e in 0..state.active_count {
            if state.masses[e] == 0.0 {
                continue;
            }

            let cx = state.centers_x[e];
            let cy = state.centers_y[e];

            let (new_cx, new_cy) = if is_mirror_x {
                (2.0 * center_x - cx, cy)
            } else if is_mirror_y {
                (cx, 2.0 * center_y - cy)
            } else if is_rotate {
                let dx = cx - center_x;
                let dy = cy - center_y;
                (center_x - dy, center_y + dx)
            } else {
                (cx, cy)
            };

            state.centers_x[e] = new_cx;
            state.centers_y[e] = new_cy;
        }
    }

    pub fn explain_plan_flat(&self) -> String {
        let mut explanation = String::with_capacity(1024);
        explanation.push_str("PLAN STRUCTURE (SoA):\n");
        for i in 0..self.active_node_count {
            if self.node_status[i] == 6 {
                continue;
            }
            let depth = self.calculate_depth(i);
            let indent = "  ".repeat(depth);
            let type_str = match self.node_types[i] {
                0 => "Goal",
                1 => "Phase",
                2 => "Subgoal",
                3 => "Method",
                4 => "Primitive",
                _ => "Unknown",
            };
            let status_str = match self.node_status[i] {
                0 => "Pending",
                1 => "Planning",
                2 => "Ready",
                3 => "Executing",
                4 => "Completed",
                5 => "Failed",
                _ => "Ghost",
            };
            explanation.push_str(&format!(
                "{}[{}] {} - {}\n",
                indent, i, type_str, status_str
            ));
        }
        explanation
    }

    fn calculate_depth(&self, node_idx: usize) -> usize {
        let mut depth = 0;
        let mut current = node_idx as i32;
        while current >= 0 {
            current = self.parent_indices[current as usize];
            depth += 1;
        }
        depth
    }

    fn generate_strategy_candidates(&self, _phase: usize) -> Vec<Axiom> {
        vec![]
    }
    fn validate_candidate(&self, _cand: &Axiom) -> bool {
        true
    }
    fn install_strategy(&mut self, _idx: usize, _phase: usize) {}
    fn get_primitives_for_phase(&self, _phase: usize) -> Vec<usize> {
        vec![]
    }
    fn check_preconditions_soa(&self, _axiom: &Axiom, _state: &EntityManifold) -> bool {
        true
    }
    fn count_valid_entities(&self, state: &EntityManifold) -> usize {
        state
            .masses
            .iter()
            .take(state.active_count)
            .filter(|&&m| m > 0.0)
            .count()
    }
}
