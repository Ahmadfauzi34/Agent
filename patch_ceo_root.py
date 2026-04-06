import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = """            let mut candidates_u16 = Vec::new();
            let mut axioms_map = Vec::new();

            for (i, ax) in high_confidence_axioms.iter().enumerate() {
                candidates_u16.push(i as u16);
                let ax_name = ax.axiom_type.last().cloned().unwrap_or_else(|| "".to_string());
                axioms_map.push(crate::reasoning::structures::Axiom::new(&ax_name, ax.physics_tier, ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION), ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION), 0.0, 0.0));
            }"""

replacement = """            let mut candidates_u16 = Vec::new();
            let mut axioms_map = Vec::new();

            // Phase 3 Meta-Prioritization: Push Smart Crop axioms FIRST
            let smart_crops = crate::reasoning::top_down_axiomator::TopDownAxiomator::generate_smart_crop_axioms(test_input);
            for ax in smart_crops {
                axioms_map.push(ax);
                candidates_u16.push((axioms_map.len() - 1) as u16);
            }

            for ax in high_confidence_axioms.iter() {
                let ax_name = ax.axiom_type.last().cloned().unwrap_or_else(|| "".to_string());
                axioms_map.push(crate::reasoning::structures::Axiom::new(&ax_name, ax.physics_tier, ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION), ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION), 0.0, 0.0));
                candidates_u16.push((axioms_map.len() - 1) as u16);
            }"""

content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
