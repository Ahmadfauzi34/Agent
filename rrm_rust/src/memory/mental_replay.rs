use crate::self_awareness::skill_ontology::{TaskMemory, SkillOntology};
use crate::reasoning::structures::TopologyHint;
use crate::reasoning::skill_composer::{SkillComposer, ComposedSkill};
use crate::reasoning::counterfactual_engine::CounterfactualEngine;

pub struct MentalReplay {
    pub solved_tasks: Vec<TaskMemory>,
    pub dream_scenarios: Vec<CounterfactualScenario>,
    pub skill_composer: SkillComposer,
}

pub struct CounterfactualScenario {
    pub base_task: TaskMemory,
    pub variation: ScenarioVariation,
    pub difficulty_modifier: f32,
}

impl CounterfactualScenario {
    pub fn apply_variation(&self, state: &crate::core::entity_manifold::EntityManifold) -> crate::core::entity_manifold::EntityManifold {
        state.clone() // Placeholder
    }
}

pub enum ScenarioVariation {
    SizeScaling(f32),
    ColorPermutation(Vec<(u8, u8)>),
    NoiseInjection(f32),
    TopologyChange(TopologyHint),
}

impl MentalReplay {
    pub fn new() -> Self {
        Self {
            solved_tasks: Vec::new(),
            dream_scenarios: Vec::new(),
            skill_composer: SkillComposer::new(),
        }
    }

    pub fn generate_dreams(&mut self, count: usize) {
        for task in self.solved_tasks.iter() {
            for i in 0..count {
                let variation = match i % 4 {
                    0 => ScenarioVariation::SizeScaling(1.5 + (i as f32 * 0.5)),
                    1 => ScenarioVariation::ColorPermutation((vec![(1, 2)])),
                    2 => ScenarioVariation::NoiseInjection(0.1 * (i as f32)),
                    _ => ScenarioVariation::TopologyChange(TopologyHint::random()),
                };

                let dream = CounterfactualScenario {
                    base_task: crate::self_awareness::skill_ontology::TaskMemory::clone(task),

                    variation,
                    difficulty_modifier: 1.0 + (i as f32 * 0.2),
                };

                self.dream_scenarios.push(dream);
            }
        }
    }

    pub fn practice_in_dreams(
        &mut self,
        engine: &mut CounterfactualEngine,
        ontology: &SkillOntology,
    ) -> Vec<ComposedSkill> {
        let mut discovered_skills = Vec::new();

        for scenario in &self.dream_scenarios {
            let novel_compositions = self.skill_composer
                .generate_novel_combinations(ontology, &scenario.base_task.solution_path);

            for composition in novel_compositions {
                let dream_state = scenario.base_task.initial_state.clone();

                // Needs conversion from PrimitiveSkill -> Axiom
                let axioms: Vec<_> = composition.sequence.iter().map(|p| p.to_axiom()).collect();

                let result = engine.what_if_sequence(
                    &axioms,
                    &dream_state,
                    &scenario.apply_variation(&scenario.base_task.expected_state),
                );

                if result.is_success() {
                    discovered_skills.push(composition);
                }
            }
        }

        discovered_skills
    }
}
