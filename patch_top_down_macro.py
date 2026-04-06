import re

with open('rrm_rust/src/reasoning/top_down_axiomator.rs', 'r') as f:
    content = f.read()

target = """        // Phase 1: Micro-Relational Axioms (e.g. RAY_CAST, TOUCHING)
        for i in 0..relational_state.active_edges {"""

replacement = """        // Phase 3: Macro-Architectural Axioms (Extremes & Alignment)
        if let Some(idx) = relational_state.largest_obj_idx {
            let token = relational_state.obj_tokens[idx];
            axioms.push(crate::reasoning::structures::Axiom::new(
                &format!("KEEP_LARGEST_OBJECT_COLOR_{}", token),
                7, // Crop/Filter Tier
                ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                0.0,
                0.0,
            ));
        }

        if let Some(token) = relational_state.rarest_color {
            axioms.push(crate::reasoning::structures::Axiom::new(
                &format!("ISOLATE_RAREST_COLOR_{}", token),
                7, // Crop/Filter Tier
                ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                0.0,
                0.0,
            ));
        }

        // Phase 1: Micro-Relational Axioms (e.g. RAY_CAST, TOUCHING)
        for i in 0..relational_state.active_edges {"""

target2 = """            if rel_type == crate::perception::relational_engine::RelationType::Touching as u8 {
                axioms.push(crate::reasoning::structures::Axiom::new(
                    &format!("IF_TOUCHING_{}_THEN_SYNC_{}", source_token, target_token),
                    8, // Macro Skill Tier
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    0.0,
                    0.0,
                ));
            }"""

replacement2 = """            if rel_type == crate::perception::relational_engine::RelationType::Touching as u8 {
                axioms.push(crate::reasoning::structures::Axiom::new(
                    &format!("IF_TOUCHING_{}_THEN_SYNC_{}", source_token, target_token),
                    8, // Macro Skill Tier
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    0.0,
                    0.0,
                ));
            }

            if rel_type == crate::perception::relational_engine::RelationType::AlignedHorizontally as u8 {
                axioms.push(crate::reasoning::structures::Axiom::new(
                    &format!("CONNECT_ALIGNED_HORIZONTALLY_{}_{}", source_token, target_token),
                    8, // Macro Skill Tier
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    0.0,
                    0.0,
                ));
            }"""

if "KEEP_LARGEST_OBJECT_COLOR_" not in content:
    content = content.replace(target, replacement)

if "CONNECT_ALIGNED_HORIZONTALLY_" not in content:
    content = content.replace(target2, replacement2)

with open('rrm_rust/src/reasoning/top_down_axiomator.rs', 'w') as f:
    f.write(content)
