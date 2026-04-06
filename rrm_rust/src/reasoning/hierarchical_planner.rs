use petgraph::graph::{DiGraph, NodeIndex};
use crate::perception::structural_analyzer::{StructuralDelta, TaskClass};
use crate::reasoning::structures::Axiom;
use crate::self_awareness::skill_ontology::SkillOntology;
use crate::reasoning::counterfactual_engine::CounterfactualEngine;
use crate::core::entity_manifold::EntityManifold;

pub struct HierarchicalPlanner {
    pub task_graph: DiGraph<PlanningNode, PlanningEdge>,
    pub root: NodeIndex,
    pub current_frontier: Vec<NodeIndex>,
}

pub enum PlanningNode {
    Goal(crate::perception::structural_analyzer::StructuralDelta),
    Subgoal(SubgoalType),
    Operator(Axiom),
    Validation(ValidationCheck),
}

pub enum PlanningEdge {
    Sequential,
    Alternative,
}

pub enum SubgoalType {
    NormalizeDimension,
    ArrangeObjects,
    ModifyObjects,
    FinalizeGeometry,
}

pub enum ValidationCheck {
    ExactMatch,
}

impl HierarchicalPlanner {
    pub fn from_delta(delta: &crate::perception::structural_analyzer::StructuralDelta, ontology: &SkillOntology) -> Self {
        let mut graph = DiGraph::new();

        let root = graph.add_node(PlanningNode::Goal(delta.clone()));

        let subgoals = match crate::perception::structural_analyzer::StructuralAnalyzer::classify_task_class(delta) {
            TaskClass::StructuralTransform => vec![SubgoalType::NormalizeDimension, SubgoalType::ModifyObjects],
            TaskClass::ObjectManipulation => vec![SubgoalType::ModifyObjects],
            TaskClass::PureGeometry => vec![SubgoalType::FinalizeGeometry],
            _ => vec![
                SubgoalType::NormalizeDimension,
                SubgoalType::ArrangeObjects,
                SubgoalType::ModifyObjects,
                SubgoalType::FinalizeGeometry,
            ],
        };

        let mut prev = root;
        for subgoal in subgoals {
            let node = graph.add_node(PlanningNode::Subgoal(subgoal));
            graph.add_edge(prev, node, PlanningEdge::Sequential);

            // This is a bit hacky because we are moving the enum. Let's just hardcode the expansion
            let node_for_cap = node; // it's just an index

            // Re-fetch subgoal to avoid move issues
            let subg_type = match graph.node_weight(node).unwrap() {
                PlanningNode::Subgoal(ref st) => st,
                _ => unreachable!(),
            };

            let capabilities = ontology.get_capabilities_for(subg_type);
            for cap in capabilities {
                let op = graph.add_node(PlanningNode::Operator(crate::reasoning::structures::Axiom::new(&cap.name, cap.tier_id, ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION), ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION), 0.0, 0.0))); let _op_node = op;
                graph.add_edge(node_for_cap, op, PlanningEdge::Alternative);
            }

            prev = node_for_cap;
        }

        let validation = graph.add_node(PlanningNode::Validation(ValidationCheck::ExactMatch));
        graph.add_edge(prev, validation, PlanningEdge::Sequential);

        Self {
            task_graph: graph,
            root,
            current_frontier: vec![root],
        }
    }

    pub fn plan_with_validation(
        &self,
        engine: &mut CounterfactualEngine,
        input: &EntityManifold,
        expected: &EntityManifold,
    ) -> Option<Vec<Axiom>> {
        let mut best_path: Option<Vec<Axiom>> = None;
        let mut best_confidence = 0.0;

        self.dfs_with_pruning(
            self.root,
            vec![],
            input.clone(),
            &mut best_path,
            &mut best_confidence,
            engine,
            expected,
        );

        best_path
    }

    fn dfs_with_pruning(
        &self,
        _node: NodeIndex,
        _path: Vec<Axiom>,
        _state: EntityManifold,
        best_path: &mut Option<Vec<Axiom>>,
        _best_confidence: &mut f32,
        _engine: &mut CounterfactualEngine,
        _expected: &EntityManifold,
    ) {
        // Dummy implementation for now. Fallback to just empty if none found
        if best_path.is_none() {
            *best_path = Some(vec![]);
        }
    }
}
