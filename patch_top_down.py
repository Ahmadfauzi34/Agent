import re

with open('rrm_rust/src/reasoning/top_down_axiomator.rs', 'r') as f:
    content = f.read()

target = "pub fn generate_axioms"
replacement = """    pub fn generate_smart_crop_axioms(input: &EntityManifold) -> Vec<crate::reasoning::structures::Axiom> {
        let mut axioms = Vec::new();

        let crop_targets = crate::perception::structural_analyzer::StructuralAnalyzer::identify_crop_targets(input);

        for color in crop_targets {
            if let Some(bbox) = crate::perception::structural_analyzer::StructuralAnalyzer::get_color_bbox(input, color) {
                // Generate a CROP_TO_BBOX axiom for this color
                let width = bbox[2] - bbox[0] + 1.0;
                let height = bbox[3] - bbox[1] + 1.0;
                let axiom = crate::reasoning::structures::Axiom::new(
                    &format!("CROP_TO_BBOX_COLOR_{}", color),
                    7,
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    width,
                    height,
                );
                axioms.push(axiom);
            }
        }

        // Add a CROP_TO_LARGEST_OBJECT fallback heuristic if needed
        axioms.push(crate::reasoning::structures::Axiom::new(
            "CROP_TO_CONTENT",
            7,
            ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
            ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
            0.0,
            0.0,
        ));

        axioms
    }

    pub fn generate_axioms"""

content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/top_down_axiomator.rs', 'w') as f:
    f.write(content)
