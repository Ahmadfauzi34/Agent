import re

file_path = "rrm_rust/src/reasoning/hierarchical_planner.rs"
with open(file_path, "r") as f:
    content = f.read()

# Make the Enums compatible with Clone and Debug
# Then introduce PhaseContext and PhaseGate
new_structures = """
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum SubgoalType {
    NormalizeDimension,
    ArrangeObjects,
    ModifyObjects,
    FinalizeGeometry,
}

#[derive(Debug, Clone)]
pub enum ValidationCheck {
    ExactMatch,
}

#[derive(Debug, Clone)]
pub struct PhaseContext {
    pub phase: SubgoalType,
    pub input_snapshot: crate::core::entity_manifold::EntityManifold,
    pub axioms_used: Vec<Axiom>,
    pub confidence: f32,
    pub rollback_point: NodeIndex,
}

#[derive(Debug, Clone)]
pub struct PhaseGate {
    pub phase: SubgoalType,
    pub required_state: ndarray::Array1<f32>, // FHRR Signature
    pub similarity_threshold: f32,
    pub on_fail: FailAction,
}

#[derive(Debug, Clone)]
pub enum FailAction {
    Retry,
    RollbackTo(SubgoalType),
    SkipTo(SubgoalType),
    AlternativePath(Vec<SubgoalType>),
}

pub struct HierarchicalPlanner {
    pub task_graph: DiGraph<PlanningNode, PlanningEdge>,
    pub root: NodeIndex,
    pub current_frontier: Vec<NodeIndex>,
    pub checkpoints: std::collections::HashMap<SubgoalType, PhaseContext>, // Fase Rollback State
}

#[derive(Debug, Clone)]
pub enum PlanningNode {
    Goal(crate::perception::structural_analyzer::StructuralDelta),
    Subgoal(SubgoalType),
    Operator(Axiom),
    Validation(ValidationCheck),
    PhaseGate(PhaseGate),
}

#[derive(Debug, Clone)]
pub enum PlanningEdge {
    Sequential,
    Alternative,
}
"""

content = re.sub(
    r"pub struct HierarchicalPlanner \{\n.*?pub task_graph: DiGraph<PlanningNode, PlanningEdge>,\n.*?pub root: NodeIndex,\n.*?pub current_frontier: Vec<NodeIndex>,\n.*?\}\n\n.*?pub enum PlanningNode \{\n.*?Goal\(crate::perception::structural_analyzer::StructuralDelta\),\n.*?Subgoal\(SubgoalType\),\n.*?Operator\(Axiom\),\n.*?Validation\(ValidationCheck\),\n.*?\}\n\n.*?pub enum PlanningEdge \{\n.*?Sequential,\n.*?Alternative,\n.*?\}\n\n.*?pub enum SubgoalType \{\n.*?NormalizeDimension,\n.*?ArrangeObjects,\n.*?ModifyObjects,\n.*?FinalizeGeometry,\n.*?\}\n\n.*?pub enum ValidationCheck \{\n.*?ExactMatch,\n.*?\}",
    new_structures,
    content,
    flags=re.DOTALL
)

with open(file_path, "w") as f:
    f.write(content)
