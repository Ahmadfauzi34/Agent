import re

with open('rrm_rust/src/reasoning/top_down_axiomator.rs', 'r') as f:
    content = f.read()

target = "pub fn generate_smart_crop_axioms(input: &EntityManifold) -> Vec<crate::reasoning::structures::Axiom> {"
replacement = """    pub fn generate_relational_axioms(relational_state: &crate::perception::relational_engine::RelationalStateSoA) -> Vec<crate::reasoning::structures::Axiom> {
        let mut axioms = Vec::new();

        // Phase 2: Meso-Structural Axioms (e.g. FILL_HOLLOW)
        for i in 0..relational_state.active_objects {
            if relational_state.obj_masses[i] == 0.0 { continue; }

            // If the object is hollow (genus >= 1)
            if relational_state.obj_euler_chars[i] == 0 {
                let token = relational_state.obj_tokens[i];
                axioms.push(crate::reasoning::structures::Axiom::new(
                    &format!("FILL_HOLLOW_COLOR_{}", token),
                    6, // Topology Tier
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    0.0,
                    0.0,
                ));
            }
        }

        // Phase 1: Micro-Relational Axioms (e.g. RAY_CAST, TOUCHING)
        for i in 0..relational_state.active_edges {
            if relational_state.edge_masses[i] == 0.0 { continue; }

            let rel_type = relational_state.edge_relation_type[i];
            let source = relational_state.edge_source_idx[i] as usize;
            let target = relational_state.edge_target_idx[i] as usize;

            let source_token = relational_state.obj_tokens[source];
            let target_token = relational_state.obj_tokens[target];

            if rel_type == crate::perception::relational_engine::RelationType::RayHit as u8 {
                axioms.push(crate::reasoning::structures::Axiom::new(
                    &format!("EXTEND_RAY_{}_TO_{}", source_token, target_token),
                    5, // Geometric Tier
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    0.0,
                    0.0,
                ));
            }

            if rel_type == crate::perception::relational_engine::RelationType::Touching as u8 {
                axioms.push(crate::reasoning::structures::Axiom::new(
                    &format!("IF_TOUCHING_{}_THEN_SYNC_{}", source_token, target_token),
                    8, // Macro Skill Tier
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    ndarray::Array1::zeros(crate::core::config::GLOBAL_DIMENSION),
                    0.0,
                    0.0,
                ));
            }
        }

        axioms
    }

    pub fn generate_smart_crop_axioms(input: &EntityManifold) -> Vec<crate::reasoning::structures::Axiom> {"""

content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/top_down_axiomator.rs', 'w') as f:
    f.write(content)
