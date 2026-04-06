import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = """let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;"""
replacement = """
        // Try discovered skills in real world if a plan failed to complete natively
        if plan.is_none() {
            let mut best_skill: Option<usize> = None;
            let mut best_confidence = 0.0;

            let discovered = self.mental_replay.get_all_discovered_skills();
            for (i, _) in discovered.iter().enumerate() {
                let gen = self.mental_replay.generalize_skill(i);
                if gen.recommended_for_real && gen.score > best_confidence {
                    best_confidence = gen.score;
                    best_skill = Some(i);
                }
            }

            if let Some(skill_idx) = best_skill {
                println!("🎯 Trying dream skill {} in real world...", skill_idx);
                let mut test_state = test_input.clone();
                let real_result = self.mental_replay.try_skill_in_real(
                    skill_idx,
                    &mut test_state,
                    &train_pairs[0].1,
                    &mut self.counterfactual_engine,
                );

                if real_result.success {
                    println!("✅ Dream skill works in real world!");
                    return self.decoder.collapse_to_grid(&test_state, test_state.global_width as usize, test_state.global_height as usize, 0.5);
                }
            }
        }

        let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;
"""

if "if let Some(skill_idx) = best_skill" not in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
