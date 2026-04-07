import re

file_path = "rrm_rust/src/reasoning/top_down_axiomator.rs"

with open(file_path, "r") as f:
    content = f.read()

# Let's add quadrant detection to generate CROP_TO_QUADRANT axioms based on target content
# If we look at the StructuralAnalyzer, it doesn't natively have get_quadrants yet, so we'll just
# approximate it in TopDownAxiomator for now if it sees a cross of 0s.

quadrant_logic = """
        // --- CROP_TO_COLOR BBOX (Task 2dc579da fallback) ---
        // If there's a unique non-background color, try cropping to its BBOX explicitly
        for color in 1..=9 {
            if let Some(bbox) = crate::perception::structural_analyzer::StructuralAnalyzer::get_color_bbox(input, color) {
                let w = bbox[2] - bbox[0] + 1.0;
                let h = bbox[3] - bbox[1] + 1.0;

                let axiom = crate::reasoning::structures::Axiom::new(
                    &format!("CROP_TO_BBOX_COLOR_{}", color),
                    7,
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    w,
                    h,
                );
                axioms.push(axiom);
            }
        }
"""

content = content.replace("// Add a CROP_TO_LARGEST_OBJECT fallback heuristic if needed", quadrant_logic + "\n        // Add a CROP_TO_LARGEST_OBJECT fallback heuristic if needed")

with open(file_path, "w") as f:
    f.write(content)
print("TopDownAxiomator Quadrant/Color Patched!")
