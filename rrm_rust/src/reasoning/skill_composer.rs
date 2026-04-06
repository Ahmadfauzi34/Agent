use crate::memory::skill_ontology::{PropertyRequirement, PropertyGuarantee, SkillOntology};
use crate::reasoning::structures::Axiom;

pub struct SkillComposer {
    pub primitives: Vec<PrimitiveSkill>,
    pub composed: Vec<ComposedSkill>,
    pub composition_history: Vec<CompositionAttempt>,
}

#[derive(Clone)]
pub struct PrimitiveSkill {
    pub name: String,
    pub tier: u8,
    pub output_guarantees: Vec<PropertyGuarantee>,
}

impl PrimitiveSkill {
    pub fn to_axiom(&self) -> Axiom {
        use crate::core::config::GLOBAL_DIMENSION;
        use ndarray::Array1;
        Axiom::new(&self.name, self.tier, Array1::zeros(GLOBAL_DIMENSION), Array1::zeros(GLOBAL_DIMENSION), 0.0, 0.0)
    }
}

pub struct ComposedSkill {
    pub sequence: Vec<PrimitiveSkill>,
    pub preconditions: Vec<PropertyRequirement>,
    pub postconditions: Vec<PropertyGuarantee>,
    pub emergence_properties: Vec<EmergenceProperty>,
    pub usage_count: usize,
    pub success_rate: f32,
}

pub struct CompositionAttempt;

pub enum EmergenceProperty {
    TemplateAwareRotation,
    ContextAwareFill,
}

impl SkillComposer {
    pub fn new() -> Self {
        Self {
            primitives: Vec::new(),
            composed: Vec::new(),
            composition_history: Vec::new(),
        }
    }

    pub fn compose_binary(&mut self, ontology: &SkillOntology) {
        let mut new_composed = Vec::new();
        for a in &self.primitives {
            for b in &self.primitives {
                if self.are_semantically_compatible(a, b, ontology) {
                    let composed = ComposedSkill {
                        sequence: vec![a.clone(), b.clone()],
                        preconditions: self.merge_preconditions(a, b),
                        postconditions: self.infer_postconditions(a, b),
                        emergence_properties: self.detect_emergence(a, b),
                        usage_count: 0,
                        success_rate: 0.0,
                    };
                    new_composed.push(composed);
                }
            }
        }
        self.composed.extend(new_composed);
    }

    fn are_semantically_compatible(
        &self,
        a: &PrimitiveSkill,
        b: &PrimitiveSkill,
        _ontology: &SkillOntology,
    ) -> bool {
        match (a.tier, b.tier) {
            (7, 4) => true,
            (4, 7) => a.output_guarantees.contains(&PropertyGuarantee::ObjectsPreserved),
            (6, 7) => true,
            (7, 6) => true,
            (4, 4) => self.are_commutative(a, b),
            _ => true,
        }
    }

    fn detect_emergence(&self, a: &PrimitiveSkill, b: &PrimitiveSkill) -> Vec<EmergenceProperty> {
        let mut emergent = Vec::new();
        if a.tier == 7 && b.tier == 4 {
            emergent.push(EmergenceProperty::TemplateAwareRotation);
        }
        if a.tier == 6 && b.tier == 7 {
            emergent.push(EmergenceProperty::ContextAwareFill);
        }
        emergent
    }

    fn are_commutative(&self, _a: &PrimitiveSkill, _b: &PrimitiveSkill) -> bool { true }

    fn merge_preconditions(&self, _a: &PrimitiveSkill, _b: &PrimitiveSkill) -> Vec<PropertyRequirement> { vec![] }

    fn infer_postconditions(&self, _a: &PrimitiveSkill, _b: &PrimitiveSkill) -> Vec<PropertyGuarantee> { vec![] }

    pub fn generate_novel_combinations(&self, _ontology: &SkillOntology, _base: &[Axiom]) -> Vec<ComposedSkill> {
        vec![]
    }
}
