import re

file_path = "rrm_rust/src/reasoning/hierarchical_planner.rs"
with open(file_path, "r") as f:
    content = f.read()

# Enhance HierarchicalPlanner with checkpoints and PhaseGate
new_structures = """
#[derive(Debug, Clone)]
pub struct PhaseContext {
    pub phase: SubgoalType,
    pub input_snapshot: crate::core::entity_manifold::EntityManifold,
    pub axioms_used: Vec<Axiom>,
    pub confidence: f32,           // How well this phase went
    pub rollback_point: NodeIndex, // Graph node untuk rollback
}

#[derive(Debug, Clone)]
pub struct PhaseGate {
    pub phase: SubgoalType,
    pub required_state: ndarray::Array1<f32>, // FHRR Signature
    pub similarity_threshold: f32, // 0.0 - 1.0, continuous evaluation
    pub on_fail: FailAction,
}

#[derive(Debug, Clone)]
pub enum FailAction {
    Retry,           // Coba lagi fase ini
    RollbackTo(SubgoalType),  // Balik ke fase sebelumnya
    SkipTo(SubgoalType),      // Lewati ke fase berikutnya
    AlternativePath(Vec<SubgoalType>),  // Jalur lain
}

pub struct HierarchicalPlanner {
    pub task_graph: DiGraph<PlanningNode, PlanningEdge>,
    pub root: NodeIndex,
    pub current_frontier: Vec<NodeIndex>,
    pub checkpoints: std::collections::HashMap<String, PhaseContext>, // Fase Rollback State
}

#[derive(Debug, Clone)]
pub enum PlanningNode {
    Goal(crate::perception::structural_analyzer::StructuralDelta),
    Subgoal(SubgoalType),
    Operator(Axiom),
    Validation(ValidationCheck),
    PhaseGate(PhaseGate), // New continuous evaluation node
}

#[derive(Debug, Clone)]
pub enum PlanningEdge {
    Sequential(f32), // Weighted sequence
    Alternative(f32),
    Resonant(f32),   // Continuous transition
}
"""

content = re.sub(
    r"pub struct HierarchicalPlanner \{\n.*?pub task_graph: DiGraph<PlanningNode, PlanningEdge>,\n.*?pub root: NodeIndex,\n.*?pub current_frontier: Vec<NodeIndex>,\n.*?\}\n\n.*?pub enum PlanningNode \{\n.*?Goal\(crate::perception::structural_analyzer::StructuralDelta\),\n.*?Subgoal\(SubgoalType\),\n.*?Operator\(Axiom\),\n.*?Validation\(ValidationCheck\),\n.*?\}\n\n.*?pub enum PlanningEdge \{\n.*?Sequential,\n.*?Alternative,\n.*?\}",
    new_structures,
    content,
    flags=re.DOTALL
)

with open(file_path, "w") as f:
    f.write(content)
