use crate::core::entity_manifold::EntityManifold;
use std::collections::HashMap;
use crate::reasoning::structures::{StructuralSignature, StructuralDelta, TaskClass, TopologyHint, Axiom};

pub type TierId = u8;

pub struct SkillOntology {
    pub capabilities: HashMap<TierId, TierCapability>,
    pub composition_rules: Vec<CompositionRule>,
    pub applicability_cache: HashMap<StructuralSignature, Vec<TierId>>,
}

#[derive(Clone)]
pub struct TierCapability {
    pub tier_id: TierId,
    pub name: String,
    pub input_requirements: Vec<PropertyRequirement>,
    pub output_guarantees: Vec<PropertyGuarantee>,
    pub side_effects: Vec<SideEffect>,
    pub computational_cost: f32,
    pub activation_signature: StructuralSignature,
}

impl TierCapability {
    pub fn to_axiom(&self) -> Axiom {
        use crate::core::config::GLOBAL_DIMENSION;
        use ndarray::Array1;
        Axiom::new(&self.name, self.tier_id, Array1::zeros(GLOBAL_DIMENSION), Array1::zeros(GLOBAL_DIMENSION), 0.0, 0.0)
    }
}

#[derive(Clone)]
pub struct CompositionRule;
#[derive(Clone)]
pub struct SideEffect;

#[derive(Clone, PartialEq)]
pub enum PropertyRequirement {
    HasObjects,
    MinObjects(usize),
    DimensionAbove(u8, u8),
    HasColor(u8),
    Topology(TopologyHint),
}

#[derive(Clone, PartialEq)]
pub enum PropertyGuarantee {
    DimensionChange,
    ObjectsPreserved,
    ObjectsAdded(usize),
    ObjectsRemoved(usize),
    ColorTransformed(Vec<(u8, u8)>),
}

pub enum PlanningStrategy {
    GeometricDirect,
    ObjectBasedSearch { max_depth: usize },
    TemplateDriven,
}

impl SkillOntology {
    pub fn new() -> Self {
        Self {
            capabilities: HashMap::new(),
            composition_rules: Vec::new(),
            applicability_cache: HashMap::new(),
        }
    }

    pub fn introspect(&self, input_signature: &StructuralSignature) -> Vec<&TierCapability> {
        if let Some(ids) = self.applicability_cache.get(input_signature) {
            ids.iter().filter_map(|id| self.capabilities.get(id)).collect()
        } else {
            self.capabilities
                .values()
                .filter(|cap| cap.activation_signature.matches(input_signature))
                .collect()
        }
    }

    pub fn can_solve(&self, delta: &StructuralDelta) -> Option<PlanningStrategy> {
        match delta.classify() {
            TaskClass::PureGeometry => Some(PlanningStrategy::GeometricDirect),
            TaskClass::ObjectManipulation => {
                let available: Vec<_> = self.introspect(&delta.to_signature())
                    .into_iter()
                    .filter(|c| c.tier_id <= 5)
                    .collect();
                if available.len() >= 2 {
                    Some(PlanningStrategy::ObjectBasedSearch { max_depth: 3 })
                } else {
                    Some(PlanningStrategy::ObjectBasedSearch { max_depth: 3 }) // fallback
                }
            },
            TaskClass::StructuralTransform => {
                if self.capabilities.contains_key(&7) {
                    Some(PlanningStrategy::TemplateDriven)
                } else {
                    Some(PlanningStrategy::TemplateDriven) // fallback
                }
            },
            _ => None,
        }
    }

    pub fn get_capabilities_for(&self, _subgoal: &crate::reasoning::hierarchical_planner::SubgoalType) -> Vec<&TierCapability> {
        self.capabilities.values().collect()
    }
}

#[derive(Clone)]
pub struct TaskMemory {
    pub initial_state: EntityManifold,
    pub expected_state: EntityManifold,
    pub solution_path: Vec<Axiom>,
}

impl TaskMemory {
    pub fn random_color_swap(&self) -> Vec<(u8, u8)> {
        vec![(1, 2)]
    }
}
