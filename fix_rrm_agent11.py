import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = "let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;"
replacement = """
        let mut phase_count = 0;
        let max_phases = 20;
        let mut temp_manifold_buffer = test_input.clone();

        loop {
            phase_count += 1;
            if phase_count > max_phases {
                println!("⚠️  Phase limit reached");
                break;
            }

            let result = planner.execute_next_phase_soa(
                &mut temp_manifold_buffer,
                expected,
                &mut self.counterfactual_engine,
            );

            if result.is_complete() {
                println!("✅ Complete!");
                break;
            }

            if result.is_terminal_failure() {
                println!("💀 Terminal failure, fallback to dreaming");
                self.mental_replay.generate_dreams(10);
                let _discovered = self.mental_replay.practice_in_dreams(
                    &mut self.counterfactual_engine,
                    &self.ontology,
                );
                break;
            }

            if result.needs_retry() {
                println!("🔄 Retrying phase with adjustments...");
                continue;
            }
        }

        let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;
"""

if "let mut temp_manifold_buffer = test_input.clone();" not in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
