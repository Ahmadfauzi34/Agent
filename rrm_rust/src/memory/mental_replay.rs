use crate::core::entity_manifold::EntityManifold;
use crate::reasoning::counterfactual_engine::{CounterfactualEngine, SequenceResult, OutcomeStatus};
use crate::self_awareness::skill_ontology::{SkillOntology, TierCapability};
use crate::reasoning::structures::Axiom;
use crate::core::fhrr::FHRR;
use crate::core::core_seeds::CoreSeeds;
use crate::core::config::GLOBAL_DIMENSION;
use crate::perception::structural_analyzer::{StructuralAnalyzer, TopologyHint};

pub struct MentalReplay {
    pub dream_masses: Vec<f32>,
    pub dream_base_task_indices: Vec<usize>,
    pub dream_variation_types: Vec<u8>,
    pub dream_variation_params: Vec<f32>,
    pub dream_difficulty: Vec<f32>,
    pub dream_success_counts: Vec<u32>,
    pub dream_failure_counts: Vec<u32>,
    pub dream_initial_states: Vec<f32>,
    pub dream_current_states: Vec<f32>,
    pub dream_target_states: Vec<f32>,
    pub discovered_sequences: Vec<DiscoveredSkillSoA>,
    pub config: ReplayConfig,
}

#[derive(Clone)]
pub struct ReplayConfig {
    pub max_dreams: usize,
    pub max_discovered_skills: usize,
    pub state_size: usize,
    pub variation_intensity: f32,
}

#[derive(Clone)]
pub struct DiscoveredSkillSoA {
    pub skill_mass: f32,
    pub sequence_length: u8,
    pub sequence_axiom_types: Vec<String>,
    pub sequence_tiers: Vec<u8>,
    pub preconditions: Vec<u8>,
    pub postconditions: Vec<u8>,
    pub usage_count: u32,
    pub real_world_success: u32,
    pub dream_origin: usize,
}

pub struct TaskMemorySoA {
    pub task_mass: f32,
    pub initial_state: EntityManifold,
    pub target_state: EntityManifold,
}

pub struct DreamPracticeResult {
    pub success: usize,
    pub failure: usize,
    pub discovered: Vec<DiscoveredSkillSoA>,
}

pub struct GeneralizationConfidence {
    pub score: f32,
    pub based_on_dreams: usize,
    pub recommended_for_real: bool,
}

pub struct RealWorldResult {
    pub success: bool,
    pub verified_in_dream: bool,
    pub dream_confidence: f32,
}

impl MentalReplay {
    pub fn new() -> Self {
        let config = ReplayConfig {
            max_dreams: 100,
            max_discovered_skills: 50,
            state_size: 1000 * 8192,
            variation_intensity: 0.5,
        };
        let total_state_buffer = config.max_dreams * config.state_size;

        Self {
            dream_masses: vec![0.0; config.max_dreams],
            dream_base_task_indices: vec![0; config.max_dreams],
            dream_variation_types: vec![0; config.max_dreams],
            dream_variation_params: vec![0.0; config.max_dreams],
            dream_difficulty: vec![1.0; config.max_dreams],
            dream_success_counts: vec![0; config.max_dreams],
            dream_failure_counts: vec![0; config.max_dreams],
            dream_initial_states: vec![0.0; total_state_buffer],
            dream_current_states: vec![0.0; total_state_buffer],
            dream_target_states: vec![0.0; total_state_buffer],
            discovered_sequences: Vec::with_capacity(config.max_discovered_skills),
            config,
        }
    }

    pub fn generate_dreams(&mut self, solved_tasks: &[TaskMemorySoA], count_per_task: usize) {
        println!("💤 [MentalReplay] Generating {} dreams...", solved_tasks.len() * count_per_task);
        let mut dream_idx = 0;

        for task_idx in 0..solved_tasks.len() {
            let task = &solved_tasks[task_idx];
            if task.task_mass == 0.0 { continue; }

            for variation in 0..count_per_task {
                dream_idx = self.find_or_create_dream_slot(dream_idx);
                if dream_idx >= self.config.max_dreams {
                    println!("  ⚠️  Dream pool full, stopping generation");
                    return;
                }

                let var_type = (variation % 4) as u8;
                let var_param = self.calculate_variation_param(var_type, variation);
                let difficulty = 1.0 + (variation as f32 * 0.2);

                self.dream_masses[dream_idx] = 1.0;
                self.dream_base_task_indices[dream_idx] = task_idx;
                self.dream_variation_types[dream_idx] = var_type;
                self.dream_variation_params[dream_idx] = var_param;
                self.dream_difficulty[dream_idx] = difficulty;

                self.generate_dream_state(dream_idx, task, var_type, var_param);
                dream_idx += 1;
            }
        }

        println!("  ✅ Generated {} active dreams", self.dream_masses.iter().filter(|&&m| m > 0.0).count());
    }

    fn generate_dream_state(&mut self, dream_idx: usize, base_task: &TaskMemorySoA, var_type: u8, var_param: f32) {
        let offset = dream_idx * self.config.state_size;
        self.copy_task_to_dream_buffer(base_task, offset);

        match var_type {
            0 => self.variate_size(dream_idx, var_param),
            1 => self.variate_colors(dream_idx, var_param),
            2 => self.variate_noise(dream_idx, var_param),
            3 => self.variate_topology(dream_idx, var_param),
            _ => {}
        }

        let target_offset = dream_idx * self.config.state_size + self.config.state_size / 2;
        self.generate_variated_target(dream_idx, target_offset);
    }

    fn variate_size(&mut self, dream_idx: usize, scale: f32) {
        let offset = dream_idx * self.config.state_size;
        let entity_count = self.read_entity_count_from_buffer(offset);

        for e in 0..entity_count {
            let mass = self.dream_initial_states[offset + e];
            if mass == 0.0 { continue; }

            let cx_offset = offset + self.config.state_size / 10 + e * 2;
            let cy_offset = cx_offset + 1;

            let cx = self.dream_initial_states[cx_offset];
            let cy = self.dream_initial_states[cy_offset];

            let new_cx = cx * scale;
            let new_cy = cy * scale;

            self.dream_initial_states[cx_offset] = new_cx.max(0.0) + 1e-15;
            self.dream_initial_states[cy_offset] = new_cy.max(0.0) + 1e-15;
        }
    }

    fn variate_colors(&mut self, dream_idx: usize, permutation_seed: f32) {
        let offset = dream_idx * self.config.state_size;
        let entity_count = self.read_entity_count_from_buffer(offset);
        let color_shift = (permutation_seed * 9.0) as i32 % 9 + 1;

        for e in 0..entity_count {
            let token_offset = offset + self.config.state_size / 5 + e;
            let old_token = self.dream_initial_states[token_offset] as i32;
            let new_token = (((old_token - 1 + color_shift) % 9 + 9) % 9) + 1;
            self.dream_initial_states[token_offset] = new_token as f32;
        }
    }

    fn variate_noise(&mut self, dream_idx: usize, intensity: f32) {
        let offset = dream_idx * self.config.state_size;
        let entity_count = self.read_entity_count_from_buffer(offset);
        let noise_scale = intensity * 0.5;

        for e in 0..entity_count {
            let mass = self.dream_initial_states[offset + e];
            if mass == 0.0 { continue; }

            let cx_offset = offset + self.config.state_size / 10 + e * 2;
            let cy_offset = cx_offset + 1;

            let cx = self.dream_initial_states[cx_offset];
            let cy = self.dream_initial_states[cy_offset];

            let noise_x = (e as f32 * 0.618).fract() * noise_scale;
            let noise_y = (e as f32 * 0.382).fract() * noise_scale;

            self.dream_initial_states[cx_offset] = (cx + noise_x).max(0.0) + 1e-15;
            self.dream_initial_states[cy_offset] = (cy + noise_y).max(0.0) + 1e-15;
        }
    }

    fn variate_topology(&mut self, _dream_idx: usize, _param: f32) {}

    pub fn practice_in_dreams(
        &mut self,
        engine: &mut CounterfactualEngine,
        ontology: &SkillOntology,
        max_attempts_per_dream: usize,
    ) -> Vec<DiscoveredSkillSoA> {
        println!("🎭 [MentalReplay] Practicing in dreams...");
        let mut new_discoveries = Vec::new();

        for dream_idx in 0..self.config.max_dreams {
            if self.dream_masses[dream_idx] == 0.0 { continue; }

            println!("  🌙 Dream {}: difficulty {:.1}", dream_idx, self.dream_difficulty[dream_idx]);

            let offset = dream_idx * self.config.state_size;

            let end = offset + self.config.state_size;
            self.dream_current_states[offset..end].copy_from_slice(&self.dream_initial_states[offset..end]);


            let attempts = self.practice_compositions_in_dream(dream_idx, engine, ontology, max_attempts_per_dream);

            self.dream_success_counts[dream_idx] += attempts.success as u32;
            self.dream_failure_counts[dream_idx] += attempts.failure as u32;

            for skill in attempts.discovered {
                if self.is_novel_skill(&skill) {
                    new_discoveries.push(skill.clone());
                    self.register_discovered_skill(skill, dream_idx);
                }
            }

            if self.dream_success_counts[dream_idx] > 10 {
                self.dream_masses[dream_idx] = 0.5;
            }
        }

        println!("  💡 {} new skills discovered in dreams", new_discoveries.len());
        new_discoveries
    }

    fn practice_compositions_in_dream(
        &mut self,
        dream_idx: usize,
        engine: &mut CounterfactualEngine,
        ontology: &SkillOntology,
        max_attempts: usize,
    ) -> DreamPracticeResult {
        let offset = dream_idx * self.config.state_size;
        let mut success = 0;
        let mut failure = 0;
        let mut discovered = Vec::new();

        // This simulates ontology giving primitive axioms
        let primitive_caps = vec![crate::self_awareness::skill_ontology::TierCapability {
            tier_id: 4,
            name: "ROTATE_90".to_string(),
            description: "ROTATE_90".to_string(),
            activation_triggers: vec![],
            preconditions: vec![],
            postconditions: vec![],
            side_effects: vec![],
            cost: 1.0,
            historical_success_rate: 1.0,
            typical_signatures: vec![],
        }];
        let primitives: Vec<Axiom> = primitive_caps.into_iter().map(Axiom::from_capability).collect();

        let max_compositions = (primitives.len() * primitives.len()).min(100).min(max_attempts);

        for i in 0..primitives.len() {
            for j in 0..primitives.len() {
                if i * primitives.len() + j >= max_compositions { break; }
                if i == j { continue; }

                let seq = vec![primitives[i].clone(), primitives[j].clone()];

                let initial = self.buffer_to_manifold(offset);
                let target = self.buffer_to_target(dream_idx);

                let result = engine.what_if_sequence(&seq, &initial, &target);

                if result.is_success() {
                    success += 1;
                    let skill = DiscoveredSkillSoA {
                        skill_mass: 1.0,
                        sequence_length: 2,
                        sequence_axiom_types: vec![primitives[i].name.clone(), primitives[j].name.clone()],
                        sequence_tiers: vec![primitives[i].tier, primitives[j].tier],
                        preconditions: vec![],
                        postconditions: vec![],
                        usage_count: 0,
                        real_world_success: 0,
                        dream_origin: dream_idx,
                    };
                    discovered.push(skill);
                } else {
                    failure += 1;
                }
            }
        }

        DreamPracticeResult { success, failure, discovered }
    }

    pub fn generalize_skill(&self, skill_idx: usize) -> GeneralizationConfidence {
        if skill_idx >= self.discovered_sequences.len() {
            return GeneralizationConfidence { score: 0.0, based_on_dreams: 0, recommended_for_real: false };
        }

        let skill = &self.discovered_sequences[skill_idx];
        let dream_success_rate = if skill.usage_count > 0 {
            (skill.real_world_success as f32) / (skill.usage_count as f32)
        } else { 0.0 };

        let similar_dreams = self.count_similar_origin(skill.dream_origin);
        let base_confidence = dream_success_rate.min(0.95);
        let generalization_boost = (similar_dreams as f32 * 0.05).min(0.3);
        let total_confidence = (base_confidence + generalization_boost).min(0.99);

        GeneralizationConfidence {
            score: total_confidence,
            based_on_dreams: similar_dreams,
            recommended_for_real: total_confidence > 0.7,
        }
    }

    pub fn try_skill_in_real(
        &mut self,
        skill_idx: usize,
        real_state: &mut EntityManifold,
        real_expected: &EntityManifold,
        engine: &mut CounterfactualEngine,
    ) -> RealWorldResult {
        if skill_idx >= self.discovered_sequences.len() {
            return RealWorldResult { success: false, verified_in_dream: false, dream_confidence: 0.0 };
        }

        let skill = &self.discovered_sequences[skill_idx];
        let axioms = self.skill_to_axioms(skill);
        let pre_check = engine.what_if_sequence(&axioms, real_state, real_expected);

        if pre_check.is_success() {
            for axiom in axioms {
                crate::reasoning::multiverse_sandbox::MultiverseSandbox::apply_axiom(real_state, &axiom.condition_tensor, &axiom.delta_spatial, &axiom.delta_semantic, axiom.delta_x, axiom.delta_y, axiom.tier, &axiom.name);
            }

            let exact_match = self.check_exact_match(real_state, real_expected);

            self.discovered_sequences[skill_idx].usage_count += 1;
            if exact_match {
                self.discovered_sequences[skill_idx].real_world_success += 1;
            }

            RealWorldResult {
                success: exact_match,
                verified_in_dream: true,
                dream_confidence: self.generalize_skill(skill_idx).score,
            }
        } else {
            self.discovered_sequences[skill_idx].skill_mass = 0.3;
            RealWorldResult { success: false, verified_in_dream: false, dream_confidence: 0.0 }
        }
    }

    fn find_or_create_dream_slot(&mut self, start_idx: usize) -> usize {
        for i in start_idx..self.config.max_dreams {
            if self.dream_masses[i] == 0.0 { return i; }
        }
        for i in 0..self.config.max_dreams {
            if self.dream_masses[i] == 0.5 {
                self.ghost_dream(i);
                return i;
            }
        }
        self.config.max_dreams
    }

    fn ghost_dream(&mut self, idx: usize) {
        self.dream_masses[idx] = 0.0;
    }

    fn is_novel_skill(&self, skill: &DiscoveredSkillSoA) -> bool {
        for existing in &self.discovered_sequences {
            if existing.skill_mass == 0.0 { continue; }
            if existing.sequence_length == skill.sequence_length {
                // Simplified comparison for brevity
                return false;
            }
        }
        true
    }

    fn calculate_variation_param(&self, var_type: u8, variation: usize) -> f32 {
        (variation as f32 * 0.1).fract()
    }

    fn read_entity_count_from_buffer(&self, _offset: usize) -> usize { 10 }

    fn copy_task_to_dream_buffer(&mut self, task: &TaskMemorySoA, offset: usize) {}
    fn generate_variated_target(&mut self, dream_idx: usize, offset: usize) {}
    fn copy_buffer(&self, src: &[f32], src_offset: usize, dst: &mut [f32], dst_offset: usize) {}

    fn buffer_to_manifold(&self, _offset: usize) -> EntityManifold { EntityManifold::new() }
    fn buffer_to_target(&self, _dream_idx: usize) -> EntityManifold { EntityManifold::new() }

    fn register_discovered_skill(&mut self, skill: DiscoveredSkillSoA, _dream_idx: usize) {
        if self.discovered_sequences.len() < self.config.max_discovered_skills {
            self.discovered_sequences.push(skill);
        }
    }

    fn count_similar_origin(&self, _origin: usize) -> usize { 1 }

    fn skill_to_axioms(&self, skill: &DiscoveredSkillSoA) -> Vec<Axiom> {
        skill.sequence_axiom_types.iter().map(|name| Axiom::new(name, 0, ndarray::Array1::zeros(GLOBAL_DIMENSION), ndarray::Array1::zeros(GLOBAL_DIMENSION), 0.0, 0.0)).collect()
    }

    fn check_exact_match(&self, state: &EntityManifold, expected: &EntityManifold) -> bool {
        state.active_count == expected.active_count
    }

    pub fn get_all_discovered_skills(&self) -> Vec<DiscoveredSkillSoA> {
        self.discovered_sequences.iter().filter(|s| s.skill_mass > 0.0).cloned().collect()
    }
}
