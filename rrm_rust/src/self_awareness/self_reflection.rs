use crate::core::entity_manifold::EntityManifold;
use crate::perception::structural_analyzer::*;
use crate::self_awareness::skill_ontology::*;

#[derive(Debug, Clone, PartialEq)]
pub enum CognitiveState {
    Exploring,      // MCTS Fast Pass / Awal Pencarian
    LocalOptimum,   // Terjebak dalam energi stagnan
    Desperate,      // Mulai mencoba algoritma radikal (Grover/Anomaly Extractor)
    FineTuning,     // Counterfactual Engine / Deterministic Femto
    Solved,         // Ditemukan solusi dengan Error = 0.0
    Fatigued,       // Terlalu banyak iterasi tanpa hasil
}

pub struct SelfReflection {
    pub ontology: SkillOntology,
    pub current_context: Option<StructuralSignature>,

    // Metakognisi State
    pub current_state: CognitiveState,
    pub best_energy: f32,
    pub iterations_without_improvement: usize,
    pub total_iterations: usize,
}

impl SelfReflection {
    pub fn new(ontology: SkillOntology) -> Self {
        Self {
            ontology,
            current_context: None,
            current_state: CognitiveState::Exploring,
            best_energy: f32::MAX,
            iterations_without_improvement: 0,
            total_iterations: 0,
        }
    }

    pub fn assess_cognitive_health(&mut self, current_energy: f32) -> CognitiveState {
        self.total_iterations += 1;

        if current_energy == 0.0 {
            self.current_state = CognitiveState::Solved;
            return self.current_state.clone();
        }

        if current_energy < self.best_energy {
            self.best_energy = current_energy;
            self.iterations_without_improvement = 0;
            if self.current_state != CognitiveState::FineTuning && current_energy < 10.0 {
                println!("🧠 [Self-Awareness] Mendekati solusi! Mengubah mode ke Fine-Tuning.");
                self.current_state = CognitiveState::FineTuning;
            }
        } else {
            self.iterations_without_improvement += 1;
        }

        if self.iterations_without_improvement > 100 {
            if self.current_state == CognitiveState::Exploring {
                println!("🧠 [Self-Awareness] Energi stagnan di {}. Terjebak di Local Optimum. Mengubah state!", self.best_energy);
                self.current_state = CognitiveState::LocalOptimum;
            } else if self.iterations_without_improvement > 300 && self.current_state != CognitiveState::Desperate {
                println!("🧠 [Self-Awareness] Kelelahan / Frustrasi kognitif. Memerlukan intervensi algoritma radikal.");
                self.current_state = CognitiveState::Desperate;
            }
        }

        if self.total_iterations > 1000 {
            self.current_state = CognitiveState::Fatigued;
        }

        self.current_state.clone()
    }

    pub fn reflect_on_context(&mut self, context: StructuralSignature) {
        self.current_context = Some(context);
    }
}

pub struct IntrospectionReport {
    pub situation_assessment: String,
    pub available_skills: Vec<SkillExplanation>,
    pub recommended_strategy: String,
    pub confidence_explanation: String,
    pub alternative_approaches: Vec<String>,
}

pub struct SkillExplanation {
    pub name: String,
    pub why_applicable: String,
    pub expected_outcome: String,
    pub risks: Vec<String>,
    pub historical_performance: f32,
}

pub struct ConsequencePrediction {
    pub guaranteed_effects: Vec<Postcondition>,
    pub likely_side_effects: Vec<SideEffect>,
    pub possible_risks: Vec<String>,
    pub estimated_success_probability: f32,
}

pub enum Postcondition {
    PreservesDimension,
    PreservesTopology,
    AltersSymmetry,
    MovesPixels,
}

pub enum SideEffect {
    DestroysObjects,
    ClonesObjects,
    CreatesNoise,
}
