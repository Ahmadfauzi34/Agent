use crate::core::entity_manifold::EntityManifold;
use crate::perception::structural_analyzer::*;
use crate::self_awareness::skill_ontology::*;

pub struct SelfReflection {
    ontology: SkillOntology,
    current_context: Option<StructuralSignature>,
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

impl SelfReflection {
    pub fn new(ontology: SkillOntology) -> Self {
        Self {
            ontology,
            current_context: None,
        }
    }

    pub fn assess_situation(&mut self, delta: &StructuralDelta) -> IntrospectionReport {
        self.current_context = Some(delta.signature.clone());

        let class = StructuralAnalyzer::classify_task_class(delta);
        let available = self.ontology.introspect(&delta.signature);
        let strategy = self.ontology.can_solve(delta);

        IntrospectionReport {
            situation_assessment: self.describe_situation(delta, &class),
            available_skills: available
                .iter()
                .map(|cap| self.explain_skill(cap, delta))
                .collect(),
            recommended_strategy: self.describe_strategy(&strategy),
            confidence_explanation: self.explain_confidence(&strategy, &available),
            alternative_approaches: self.suggest_alternatives(delta, &strategy),
        }
    }

    pub fn explain_decision(&self, chosen_skill: u8, rejected: &[u8]) -> String {
        let chosen = self
            .ontology
            .capabilities
            .get(&chosen_skill)
            .expect("Invalid skill ID");

        let mut explanation = format!("Saya memilih {} karena:\n", chosen.name);

        explanation.push_str("- Situasi cocok dengan kondisi aktivasi:\n");
        for trigger in &chosen.activation_triggers {
            explanation.push_str(&format!("  • {}\n", self.describe_trigger(trigger)));
        }

        if !rejected.is_empty() {
            explanation.push_str("\nAlternatif yang saya pertimbangkan tapi tolak:\n");
            for &rej_id in rejected {
                if let Some(rej) = self.ontology.capabilities.get(&rej_id) {
                    let reason = self.explain_rejection(rej, chosen);
                    explanation.push_str(&format!("- {}: {}\n", rej.name, reason));
                }
            }
        }

        explanation.push_str(&format!(
            "\nPerforma historis skill ini: {:.0}% sukses",
            chosen.historical_success_rate * 100.0
        ));

        explanation
    }

    pub fn predict_consequences(
        &self,
        skill_id: u8,
        current: &EntityManifold,
    ) -> ConsequencePrediction {
        let skill = self
            .ontology
            .capabilities
            .get(&skill_id)
            .expect("Invalid skill");

        ConsequencePrediction {
            guaranteed_effects: skill.postconditions.clone(),
            likely_side_effects: skill.side_effects.clone(),
            possible_risks: self.identify_risks(skill, current),
            estimated_success_probability: skill.historical_success_rate,
        }
    }

    fn describe_situation(&self, delta: &StructuralDelta, class: &TaskClass) -> String {
        let sig = &delta.signature;

        format!(
            "Task ini menunjukkan: {}. \
             Dimensi {} ({} → {}), \
             {} objek ({} → {}), \
             topologi berubah dari {:?} ke {:?}. \
             {} template frame.",
            self.class_name(class),
            self.describe_dim_change(&sig.dim_relation),
            delta.input_stats.bounding_box.0,
            delta.output_stats.bounding_box.0,
            self.describe_object_change(&sig.object_delta),
            delta.input_stats.count,
            delta.output_stats.count,
            sig.topology_in,
            sig.topology_out,
            if sig.has_template_frame {
                "Ada"
            } else {
                "Tidak ada"
            }
        )
    }

    fn explain_skill(&self, cap: &TierCapability, _delta: &StructuralDelta) -> SkillExplanation {
        SkillExplanation {
            name: cap.name.clone(),
            why_applicable: self.match_triggers(&cap.activation_triggers, _delta),
            expected_outcome: self.describe_postconditions(&cap.postconditions),
            risks: cap
                .side_effects
                .iter()
                .map(|se| self.describe_side_effect(se))
                .collect(),
            historical_performance: cap.historical_success_rate,
        }
    }

    fn identify_risks(&self, skill: &TierCapability, current: &EntityManifold) -> Vec<String> {
        let mut risks = Vec::new();

        for side_effect in &skill.side_effects {
            match side_effect {
                SideEffect::BackgroundRemoved => {
                    if current.active_count > 10 {
                        risks.push(
                            "Mungkin menghapus objek penting sebagai 'background'".to_string(),
                        );
                    }
                }
                SideEffect::TemplateMarkerLost => {
                    risks.push(
                        "Frame/template akan hilang, tidak bisa digunakan untuk alignment"
                            .to_string(),
                    );
                }
                SideEffect::PositionReset => {
                    risks.push(
                        "Koordinat akan berubah, relational positioning mungkin gagal".to_string(),
                    );
                }
                _ => {}
            }
        }

        risks
    }

    fn class_name(&self, class: &TaskClass) -> String {
        format!("{:?}", class)
    }

    fn describe_dim_change(&self, change: &DimensionRelation) -> String {
        format!("{:?}", change)
    }

    fn describe_object_change(&self, change: &ObjectDelta) -> String {
        format!("{:?}", change)
    }

    fn match_triggers(&self, _triggers: &[ActivationTrigger], _delta: &StructuralDelta) -> String {
        "Matched structural attributes".to_string()
    }

    fn describe_postconditions(&self, _posts: &[Postcondition]) -> String {
        "Expected changes".to_string()
    }

    fn describe_side_effect(&self, effect: &SideEffect) -> String {
        match effect {
            SideEffect::BackgroundRemoved => "Background removed".to_string(),
            SideEffect::TemplateMarkerLost => "Template marker lost".to_string(),
            SideEffect::PositionReset => "Position reset".to_string(),
            SideEffect::BoundingBoxChanged => "Bounding box changed".to_string(),
        }
    }

    fn describe_strategy(&self, strategy: &Option<SolutionStrategy>) -> String {
        if strategy.is_some() {
            "Available".to_string()
        } else {
            "None".to_string()
        }
    }

    fn explain_confidence(
        &self,
        _strategy: &Option<SolutionStrategy>,
        _available: &[&TierCapability],
    ) -> String {
        "Estimated via heuristic".to_string()
    }

    fn suggest_alternatives(
        &self,
        _delta: &StructuralDelta,
        _strategy: &Option<SolutionStrategy>,
    ) -> Vec<String> {
        vec![]
    }

    fn describe_trigger(&self, _trigger: &ActivationTrigger) -> String {
        "Trigger".to_string()
    }

    fn explain_rejection(&self, _rej: &TierCapability, _chosen: &TierCapability) -> String {
        "Lower score".to_string()
    }
}
