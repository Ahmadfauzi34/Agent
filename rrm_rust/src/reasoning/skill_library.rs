use crate::reasoning::quantum_search::WaveNode;
use std::collections::HashMap;

#[derive(Clone)]
pub struct MacroSkill {
    pub id: String,
    pub sequence: Vec<WaveNode>,
    pub utility_score: f32,
}

pub struct SkillLibrary {
    pub macros: HashMap<String, MacroSkill>,
}

impl SkillLibrary {
    pub fn new() -> Self {
        Self {
            macros: HashMap::new(),
        }
    }

    pub fn register_chunk(&mut self, winning_path: &[WaveNode]) {
        if winning_path.len() <= 1 {
            return;
        }

        // We can't map h.description directly since WaveNode doesn't have it.
        // Instead, we use axiom_type (the sequence of strings) of the FINAL winning node!
        // A single WaveNode that won already stores its full history inside `axiom_type: Vec<String>`.
        // So `winning_path` might just be a single node, let's look at its axiom_type path.
        let final_node = winning_path.last().unwrap();

        // Filter out ROOT_START
        let path: Vec<String> = final_node
            .axiom_type
            .iter()
            .filter(|s| *s != "ROOT_START")
            .cloned()
            .collect();

        if path.len() <= 1 {
            return;
        } // Need at least 2 steps to form a macro

        let id = path.join("|");

        let entry = self.macros.entry(id.clone()).or_insert(MacroSkill {
            id: format!("MACRO:{}", id),
            sequence: winning_path.to_vec(), // Original node reference
            utility_score: 0.0,
        });

        entry.utility_score += 1.0; // Hebbian Learning: neurons that fire together, wire together
    }

    pub fn inject_macros_as_hypotheses(&self) -> Vec<WaveNode> {
        self.macros
            .values()
            .map(|macro_skill| {
                let first_axiom = &macro_skill.sequence[0];

                WaveNode {
                    condition_tensor: first_axiom.condition_tensor.clone(),
                    tensor_spatial: first_axiom.tensor_spatial.clone(),
                    tensor_semantic: first_axiom.tensor_semantic.clone(),
                    probability: 10.0, // VIP Pass: Sangat memprioritaskan prosedur yang sudah terbukti
                    axiom_type: vec![macro_skill.id.clone()],
                    delta_x: 0.0,
                    delta_y: 0.0,
                    depth: 0,
                    physics_tier: 8, // Tier Makro
                    state_manifolds: first_axiom.state_manifolds.clone(),
                    state_modified: false,
                }
            })
            .collect()
    }
}
