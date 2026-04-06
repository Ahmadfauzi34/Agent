import re

with open('rrm_rust/src/reasoning/top_down_axiomator.rs', 'r') as f:
    content = f.read()

target = "        axioms.push(crate::reasoning::structures::Axiom::new("
replacement = """        // Generate CROP_TO_CHAMBER axioms
        let chambers = crate::perception::structural_analyzer::StructuralAnalyzer::get_chamber_bboxes(input);
        for (i, bbox) in chambers.iter().enumerate() {
            let width = bbox[2] - bbox[0] + 1.0;
            let height = bbox[3] - bbox[1] + 1.0;
            let axiom = crate::reasoning::structures::Axiom::new(
                &format!("CROP_TO_CHAMBER_{}", i),
                7,
                ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                width,
                height,
            );
            axioms.push(axiom);
        }

        axioms.push(crate::reasoning::structures::Axiom::new("""

content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/top_down_axiomator.rs', 'w') as f:
    f.write(content)
