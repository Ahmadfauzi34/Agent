import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = "let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;"
replacement = """
        // Try generative learning if no skills work
        if plan.is_none() {
            println!("🧬 Phase 3: Generative Composition...");
            self.skill_composer.register_primitives(&self.ontology);
            let _binary = self.skill_composer.compose_binary(&self.ontology);
            let dream_scenarios = vec![]; // We'd get this from MentalReplay
            let validation = self.skill_composer.validate_in_dreams(&mut self.counterfactual_engine, &dream_scenarios);

            if validation.validated > 10 {
                self.skill_composer.compose_ternary(&mut self.counterfactual_engine, &self.ontology);
            }

            let _macros = self.skill_composer.abstract_patterns();

            if let Some(best_comp) = self.skill_composer.select_for_situation(&delta.signature, &self.ontology) {
                let sequence = self.skill_composer.composition_to_axioms(best_comp);
                let pre_check = self.counterfactual_engine.what_if_sequence(&sequence, test_input, &train_pairs[0].1);

                if pre_check.is_success() {
                    let mut state = test_input.clone();
                    for axiom in sequence {
                        MultiverseSandbox::apply_axiom(&mut state, &axiom.condition_tensor, &axiom.delta_spatial, &axiom.delta_semantic, axiom.delta_x, axiom.delta_y, axiom.tier, &axiom.name);
                    }
                    self.skill_composer.record_real_success(best_comp);
                    return self.decoder.collapse_to_grid(&state, state.global_width as usize, state.global_height as usize, 0.5);
                }
            }
        }

        let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;
"""

if "println!(\"🧬 Phase 3: Generative Composition...\");" not in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
