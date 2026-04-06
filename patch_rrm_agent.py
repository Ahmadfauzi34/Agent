import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = """        let plan = planner.plan_with_validation(
            &mut self.counterfactual_engine,
            &train_pairs[0].0,
            &train_pairs[0].1,
        );"""

replacement = """        println!("🧠 [Mental Simulation] Memulai counterfactual exploration...");

        let (input, expected) = &train_pairs[0];

        // === STEP 1: Introspect available skills ===
        let delta = &consensus_delta;
        let candidates_caps = self.ontology.introspect(&delta.signature);

        println!("  {} skill kandidat ditemukan", candidates_caps.len());

        let candidates: Vec<crate::reasoning::structures::Axiom> = candidates_caps.into_iter().map(|cap| crate::reasoning::structures::Axiom::from_capability(cap)).collect();

        // === STEP 2: Pre-filter dengan "what if" cepat ===
        println!("  🔮 Simulasi single-step...");
        let mut promising = Vec::new();

        for axiom in &candidates {
            if let Some(failure) = self.counterfactual_engine.recall_similar_failure(input, axiom) {
                println!("    ⏭️  Skip {}: pernah gagal ({}), saran: {:?}",
                    axiom.short_name(),
                    failure.failure_mode.description(),
                    failure.suggested_correction
                );
                continue;
            }

            let result = self.counterfactual_engine.what_if(axiom, input, expected);

            match result.outcome {
                crate::reasoning::counterfactual_engine::OutcomeStatus::Success => {
                    println!("    ✅ {} langsung sukses!", axiom.short_name());
                    promising.push((axiom.clone(), result));
                },
                crate::reasoning::counterfactual_engine::OutcomeStatus::PartialSuccess => {
                    println!("    ⚠️  {} menjanjikan (divergensi: {:.2})",
                        axiom.short_name(),
                        result.metrics.epistemic_value
                    );
                    promising.push((axiom.clone(), result));
                },
                _ => {
                    println!("    ❌ {} tidak cocok", axiom.short_name());
                }
            }
        }

        // === STEP 3: Jika tidak ada yang langsung sukses, eksplor komposisi ===
        let mut plan = None;
        if promising.iter().all(|(_, r)| !matches!(r.outcome, crate::reasoning::counterfactual_engine::OutcomeStatus::Success)) {
            println!("  🌳 Tidak ada solusi single-step, eksplor tree...");

            let axioms_promising: Vec<_> = promising.into_iter().map(|(a, _)| a).collect();
            let branching = self.counterfactual_engine.explore_branches(&axioms_promising, input, expected, 2);

            println!("    {} branch dieksplorasi, coverage: {:.0}%",
                branching.branches.len(),
                branching.coverage * 100.0
            );

            if let Some(best) = branching.best_path {
                println!("    🎯 Path terbaik: {} langkah", best.len());

                let mut all_valid = true;
                for (inp, exp) in train_pairs {
                    let result = self.counterfactual_engine.what_if_sequence(&best, inp, exp);
                    if !result.is_success() {
                        all_valid = false;
                        println!("    ⚠️  Gagal validasi di pair lain");
                        break;
                    }
                }

                if all_valid {
                    plan = Some(best);
                }
            }
        } else {
            plan = Some(vec![promising.into_iter().find(|(_, r)| matches!(r.outcome, crate::reasoning::counterfactual_engine::OutcomeStatus::Success)).unwrap().0]);
        }

        // === STEP 4: Fallback ke hierarchical planner ===
        if plan.is_none() {
            println!("  🔄 Fallback ke hierarchical planning...");
            plan = planner.plan_with_validation(
                &mut self.counterfactual_engine,
                &train_pairs[0].0,
                &train_pairs[0].1,
            );
        }
"""

content = content.replace(target, replacement)
with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
