use crate::core::entity_manifold::EntityManifold;
use crate::perception::structural_analyzer::StructuralSignature;
use crate::reasoning::counterfactual_engine::{
    CounterfactualEngine, OutcomeStatus, SequenceResult,
};
use crate::reasoning::structures::Axiom;
use crate::self_awareness::skill_ontology::SkillOntology;
// no DreamScenarioSoA import needed
use crate::core::config::GLOBAL_DIMENSION;

pub struct SkillComposer {
    pub primitive_indices: Vec<u8>,
    pub primitive_count: usize,

    pub composition_masses: Vec<f32>,
    pub composition_lengths: Vec<u8>,
    pub composition_step_data: Vec<u8>,
    pub composition_tiers: Vec<u8>,

    pub compatibility_matrix: Vec<f32>,

    pub composition_dream_success: Vec<u32>,
    pub composition_dream_failure: Vec<u32>,
    pub composition_real_success: Vec<u32>,
    pub composition_real_failure: Vec<u32>,

    pub emergence_flags: Vec<u8>,

    pub config: ComposerConfig,
}

#[derive(Clone)]
pub struct ComposerConfig {
    pub max_primitives: usize,
    pub max_compositions: usize,
    pub max_steps_per_composition: usize,
    pub min_validation_threshold: f32,
}

pub struct ValidationSummary {
    pub total_compositions: usize,
    pub validated: usize,
    pub rejected: usize,
    pub pending: usize,
}

pub struct MacroSkillSoA {
    pub name: String,
    pub pattern: Vec<u8>,
    pub expansion_factor: u8,
    pub mass: f32,
}

impl SkillComposer {
    pub fn new() -> Self {
        let config = ComposerConfig {
            max_primitives: 256,
            max_compositions: 10000,
            max_steps_per_composition: 16,
            min_validation_threshold: 0.7,
        };
        let max_steps_total = config.max_compositions * config.max_steps_per_composition;

        Self {
            primitive_indices: Vec::with_capacity(config.max_primitives),
            primitive_count: 0,

            composition_masses: vec![0.0; config.max_compositions],
            composition_lengths: vec![0; config.max_compositions],
            composition_step_data: vec![0; max_steps_total],
            composition_tiers: vec![0; config.max_compositions],

            compatibility_matrix: vec![-1.0; config.max_primitives * config.max_primitives],

            composition_dream_success: vec![0; config.max_compositions],
            composition_dream_failure: vec![0; config.max_compositions],
            composition_real_success: vec![0; config.max_compositions],
            composition_real_failure: vec![0; config.max_compositions],

            emergence_flags: vec![0; config.max_compositions],

            config,
        }
    }

    pub fn register_primitives(&mut self, ontology: &SkillOntology) {
        for (tier_id, cap) in ontology.capabilities.iter() {
            if self.primitive_count >= self.config.max_primitives {
                break;
            }

            self.primitive_indices.push(*tier_id);
            self.primitive_count += 1;
        }

        println!(
            "🔧 [SkillComposer] Registered {} primitives",
            self.primitive_count
        );
        self.compute_compatibility_matrix(ontology);
    }

    fn compute_compatibility_matrix(&mut self, ontology: &SkillOntology) {
        let n = self.primitive_count;

        for i in 0..n {
            for j in 0..n {
                let idx = i * self.config.max_primitives + j;
                let tier_i = self.primitive_indices[i];
                let tier_j = self.primitive_indices[j];

                let compat = if tier_i == tier_j {
                    1.0
                } else if self.are_commutative(tier_i, tier_j, ontology) {
                    1.0
                } else if self.are_sequential_safe(tier_i, tier_j, ontology) {
                    0.8
                } else if self.are_conditional(tier_i, tier_j, ontology) {
                    0.5
                } else if self.are_never_compatible(tier_i, tier_j, ontology) {
                    0.0
                } else {
                    -1.0
                };

                self.compatibility_matrix[idx] = compat;
            }
        }
    }

    pub fn compose_binary(&mut self, _ontology: &SkillOntology) -> usize {
        println!("🧬 [SkillComposer] Generating binary compositions...");

        let mut created = 0;
        let n = self.primitive_count;

        for i in 0..n {
            for j in 0..n {
                let slot = self.find_ghost_composition();
                if slot >= self.config.max_compositions {
                    println!("  ⚠️  Composition pool full");
                    return created;
                }

                let compat_idx = i * self.config.max_primitives + j;
                let compat = self.compatibility_matrix[compat_idx];

                if compat == 0.0 {
                    continue;
                }

                let tier_i = self.primitive_indices[i];
                let tier_j = self.primitive_indices[j];
                let max_tier = tier_i.max(tier_j);

                self.composition_masses[slot] = 1.0;
                self.composition_lengths[slot] = 2;
                self.composition_tiers[slot] = max_tier;

                let step_offset = slot * self.config.max_steps_per_composition;
                self.composition_step_data[step_offset] = i as u8;
                self.composition_step_data[step_offset + 1] = j as u8;

                self.emergence_flags[slot] = self.detect_emergence(tier_i, tier_j);

                created += 1;
            }
        }

        println!("  ✅ Created {} binary compositions", created);
        created
    }

    pub fn compose_ternary(
        &mut self,
        _engine: &mut CounterfactualEngine,
        _ontology: &SkillOntology,
    ) -> usize {
        println!("🧬 [SkillComposer] Extending to ternary compositions...");

        let mut created = 0;

        for bin_idx in 0..self.config.max_compositions {
            if self.composition_masses[bin_idx] == 0.0 {
                continue;
            }
            if self.composition_masses[bin_idx] < 0.7 {
                continue;
            }

            for k in 0..self.primitive_count {
                let slot = self.find_ghost_composition();
                if slot >= self.config.max_compositions {
                    return created;
                }

                let tier_k = self.primitive_indices[k];
                let max_tier = self.composition_tiers[bin_idx].max(tier_k);

                let last_step_tier = self.get_last_step_tier(bin_idx);
                let compat = self.check_compatibility(last_step_tier, tier_k);

                if compat < 0.5 {
                    continue;
                }

                self.composition_masses[slot] = 1.0;
                self.composition_lengths[slot] = 3;
                self.composition_tiers[slot] = max_tier;

                let src_offset = bin_idx * self.config.max_steps_per_composition;
                let dst_offset = slot * self.config.max_steps_per_composition;

                self.composition_step_data[dst_offset] = self.composition_step_data[src_offset];
                self.composition_step_data[dst_offset + 1] =
                    self.composition_step_data[src_offset + 1];
                self.composition_step_data[dst_offset + 2] = k as u8;

                created += 1;
            }
        }

        println!("  ✅ Created {} ternary compositions", created);
        created
    }

    fn detect_emergence(&self, tier_a: u8, tier_b: u8) -> u8 {
        let mut flags: u8 = 0;
        if tier_a == 7 && tier_b == 4 {
            flags |= 0b00000001;
        }
        if tier_a == 4 && tier_b == 7 {
            flags |= 0b00000010;
        }
        if tier_a == 6 && tier_b == 7 {
            flags |= 0b00000100;
        }
        if tier_a == 7 && tier_b == 6 {
            flags |= 0b00001000;
        }
        if tier_a == 0 && tier_b == 0 {
            flags |= 0b00010000;
        }
        if tier_a == 0 && tier_b == 4 {
            flags |= 0b00100000;
        }
        flags
    }

    pub fn explain_emergence(&self, composition_idx: usize) -> String {
        let flags = self.emergence_flags[composition_idx];
        let mut explanations = Vec::new();

        if flags & 0b00000001 != 0 {
            explanations.push("Template-Aware: CROP kemudian GEOMETRY");
        }
        if flags & 0b00000010 != 0 {
            explanations.push("Risky: GEOMETRY kemudian CROP, bbox berubah");
        }
        if flags & 0b00000100 != 0 {
            explanations.push("Context-Aware: SPAWN di area yang akan di-CROP");
        }
        if flags & 0b00001000 != 0 {
            explanations.push("Smart Canvas: CROP kemudian SPAWN");
        }
        if flags & 0b00010000 != 0 {
            explanations.push("Cumulative: Translasi bertambah");
        }
        if flags & 0b00100000 != 0 {
            explanations.push("Color-Preserving: Warna dijaga saat geometry");
        }

        if explanations.is_empty() {
            "No special emergent properties".to_string()
        } else {
            explanations.join("; ")
        }
    }

    pub fn validate_in_dreams(
        &mut self,
        engine: &mut CounterfactualEngine,
        dream_scenarios: &[crate::memory::mental_replay::TaskMemorySoA],
    ) -> ValidationSummary {
        println!("🔮 [SkillComposer] Validating compositions in dreams...");
        let mut total_tests = 0;
        let mut successes = 0;

        for comp_idx in 0..self.config.max_compositions {
            if self.composition_masses[comp_idx] == 0.0 {
                continue;
            }

            let mut scenario_success = 0;
            let mut scenario_failure = 0;

            for dream in dream_scenarios.iter().take(5) {
                if dream.task_mass == 0.0 {
                    continue;
                }

                let sequence = self.composition_to_axioms(comp_idx);
                let result =
                    engine.what_if_sequence(&sequence, &dream.initial_state, &dream.target_state);
                total_tests += 1;

                match result {
                    SequenceResult::Complete(r) if matches!(r.outcome, OutcomeStatus::Success) => {
                        scenario_success += 1;
                    }
                    _ => {
                        scenario_failure += 1;
                    }
                }
            }

            self.composition_dream_success[comp_idx] = scenario_success as u32;
            self.composition_dream_failure[comp_idx] = scenario_failure as u32;

            let total = scenario_success + scenario_failure;
            let rate = if total > 0 {
                (scenario_success as f32) / (total as f32 + 1e-15)
            } else {
                0.0
            };

            if rate >= self.config.min_validation_threshold {
                self.composition_masses[comp_idx] = 0.8;
                successes += 1;
            } else if rate < 0.2 {
                self.composition_masses[comp_idx] = 0.0;
            }
        }

        println!(
            "  ✅ {} compositions validated ({} tests run)",
            successes, total_tests
        );

        ValidationSummary {
            total_compositions: self.count_active_compositions(),
            validated: successes,
            rejected: self.count_ghost_compositions(),
            pending: self.count_pending_compositions(),
        }
    }

    pub fn score_composition(&self, comp_idx: usize) -> f32 {
        if self.composition_masses[comp_idx] == 0.0 {
            return -999.0;
        }

        let dream_s = self.composition_dream_success[comp_idx] as f32;
        let dream_f = self.composition_dream_failure[comp_idx] as f32;
        let dream_total = dream_s + dream_f + 1e-15;
        let dream_rate = dream_s / dream_total;

        let real_s = self.composition_real_success[comp_idx] as f32;
        let real_f = self.composition_real_failure[comp_idx] as f32;
        let real_total = real_s + real_f;

        let real_rate = if real_total > 0.0 {
            real_s / (real_total + 1e-15)
        } else {
            0.5
        };
        let length_penalty = (self.composition_lengths[comp_idx] as f32) * 0.05;
        let emergence_bonus = if self.emergence_flags[comp_idx] > 0 {
            0.1
        } else {
            0.0
        };

        (dream_rate * 0.4 + real_rate * 0.5 + emergence_bonus - length_penalty)
            .max(0.0)
            .min(0.99)
    }

    pub fn select_for_situation(
        &self,
        signature: &StructuralSignature,
        ontology: &SkillOntology,
    ) -> Option<usize> {
        let mut best_idx: usize = 0;
        let mut best_score: f32 = -999.0;
        let mut found = false;

        for i in 0..self.config.max_compositions {
            if self.composition_masses[i] < 0.7 {
                continue;
            }
            let match_score = self.match_to_signature(i, signature, ontology);
            if match_score < 0.5 {
                continue;
            }

            let score = self.score_composition(i) * match_score;
            if score > best_score {
                best_score = score;
                best_idx = i;
                found = true;
            }
        }

        if found {
            Some(best_idx)
        } else {
            None
        }
    }

    fn find_ghost_composition(&self) -> usize {
        for i in 0..self.config.max_compositions {
            if self.composition_masses[i] == 0.0 {
                return i;
            }
        }
        self.config.max_compositions
    }

    fn count_active_compositions(&self) -> usize {
        self.composition_masses.iter().filter(|&&m| m > 0.0).count()
    }
    fn count_ghost_compositions(&self) -> usize {
        self.composition_masses
            .iter()
            .filter(|&&m| m == 0.0)
            .count()
    }
    fn count_pending_compositions(&self) -> usize {
        self.composition_masses
            .iter()
            .filter(|&&m| m > 0.0 && m < 0.7)
            .count()
    }

    pub fn composition_to_axioms(&self, comp_idx: usize) -> Vec<Axiom> {
        let len = self.composition_lengths[comp_idx] as usize;
        let offset = comp_idx * self.config.max_steps_per_composition;
        let mut axioms = Vec::with_capacity(len);
        for i in 0..len {
            let prim_idx = self.composition_step_data[offset + i] as usize;
            let tier = self.primitive_indices[prim_idx];
            axioms.push(Axiom::new(
                "COMP",
                tier,
                ndarray::Array1::zeros(GLOBAL_DIMENSION),
                ndarray::Array1::zeros(GLOBAL_DIMENSION),
                0.0,
                0.0,
            ));
        }
        axioms
    }

    pub fn abstract_patterns(&self) -> Vec<MacroSkillSoA> {
        let mut macros = Vec::new();
        if let Some((pattern_seq, repeat_count)) = self.find_repeated_pattern() {
            macros.push(MacroSkillSoA {
                name: format!("Repeated_{}x", repeat_count),
                pattern: pattern_seq,
                expansion_factor: repeat_count as u8,
                mass: 1.0,
            });
        }
        macros
    }

    fn find_repeated_pattern(&self) -> Option<(Vec<u8>, usize)> {
        for len in 2..=4 {
            for comp_idx in 0..self.config.max_compositions {
                if self.composition_masses[comp_idx] == 0.0 {
                    continue;
                }
                let comp_len = self.composition_lengths[comp_idx] as usize;
                if comp_len < len * 2 {
                    continue;
                }
                let offset = comp_idx * self.config.max_steps_per_composition;
                let steps = &self.composition_step_data[offset..offset + comp_len];
                let first = &steps[0..len];
                let mut is_repeat = true;
                for i in len..comp_len {
                    if steps[i] != first[i % len] {
                        is_repeat = false;
                        break;
                    }
                }
                if is_repeat {
                    return Some((first.to_vec(), comp_len / len));
                }
            }
        }
        None
    }

    pub fn compose_recursive(&mut self, depth: usize, _engine: &mut CounterfactualEngine) -> usize {
        if depth == 0 {
            return 0;
        }
        let mut created = 0;
        let validated: Vec<usize> = (0..self.config.max_compositions)
            .filter(|&i| self.composition_masses[i] >= 0.8)
            .collect();

        for &i in &validated {
            for &j in &validated {
                let slot = self.find_ghost_composition();
                if slot >= self.config.max_compositions {
                    return created;
                }

                let len_i = self.composition_lengths[i] as usize;
                let len_j = self.composition_lengths[j] as usize;
                let new_len = len_i + len_j;

                if new_len > self.config.max_steps_per_composition {
                    continue;
                }

                self.composition_masses[slot] = 1.0;
                self.composition_lengths[slot] = new_len as u8;

                let offset_i = i * self.config.max_steps_per_composition;
                let offset_j = j * self.config.max_steps_per_composition;
                let offset_new = slot * self.config.max_steps_per_composition;

                for k in 0..len_i {
                    self.composition_step_data[offset_new + k] =
                        self.composition_step_data[offset_i + k];
                }
                for k in 0..len_j {
                    self.composition_step_data[offset_new + len_i + k] =
                        self.composition_step_data[offset_j + k];
                }

                created += 1;
            }
        }
        created
    }

    pub fn count_validated_compositions(&self) -> usize {
        self.composition_masses
            .iter()
            .filter(|&&m| m >= 0.8)
            .count()
    }

    pub fn record_real_success(&mut self, comp_idx: usize) {
        if comp_idx < self.config.max_compositions {
            self.composition_real_success[comp_idx] += 1;
        }
    }

    fn are_commutative(&self, _tier_i: u8, _tier_j: u8, _ontology: &SkillOntology) -> bool {
        true
    }
    fn are_sequential_safe(&self, _tier_i: u8, _tier_j: u8, _ontology: &SkillOntology) -> bool {
        true
    }
    fn are_conditional(&self, _tier_i: u8, _tier_j: u8, _ontology: &SkillOntology) -> bool {
        false
    }
    fn are_never_compatible(&self, _tier_i: u8, _tier_j: u8, _ontology: &SkillOntology) -> bool {
        false
    }
    fn get_last_step_tier(&self, _bin_idx: usize) -> u8 {
        0
    }
    fn check_compatibility(&self, _tier_a: u8, _tier_b: u8) -> f32 {
        1.0
    }
    fn match_to_signature(
        &self,
        _comp_idx: usize,
        _signature: &StructuralSignature,
        _ontology: &SkillOntology,
    ) -> f32 {
        1.0
    }
}
