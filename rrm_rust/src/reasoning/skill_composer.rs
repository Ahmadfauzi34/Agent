use crate::self_awareness::skill_ontology::{Precondition as PropertyRequirement, Postcondition as PropertyGuarantee, SkillOntology};
use crate::reasoning::structures::Axiom;
use crate::reasoning::quantum_search::WaveNode;
use crate::core::fhrr::FHRR;
use ndarray::Array1;
use chrono::Utc;
use std::fs;
use std::path::PathBuf;

pub struct SkillComposer {
    pub primitives: Vec<PrimitiveSkill>,
    pub composed: Vec<ComposedSkill>,
    pub composition_history: Vec<CompositionAttempt>,
}

#[derive(Clone)]
pub struct PrimitiveSkill {
    pub name: String,
    pub tier: u8,
    pub output_guarantees: Vec<PropertyGuarantee>,
}

impl PrimitiveSkill {
    pub fn to_axiom(&self) -> Axiom {
        use crate::core::config::GLOBAL_DIMENSION;
        use ndarray::Array1;
        Axiom::new(&self.name, self.tier, Array1::zeros(GLOBAL_DIMENSION), Array1::zeros(GLOBAL_DIMENSION), 0.0, 0.0)
    }
}

pub struct ComposedSkill {
    pub sequence: Vec<PrimitiveSkill>,
    pub preconditions: Vec<PropertyRequirement>,
    pub postconditions: Vec<PropertyGuarantee>,
    pub emergence_properties: Vec<EmergenceProperty>,
    pub usage_count: usize,
    pub success_rate: f32,
}

pub struct CompositionAttempt;

pub enum EmergenceProperty {
    TemplateAwareRotation,
    ContextAwareFill,
}

impl SkillComposer {
    pub fn new() -> Self {
        Self {
            primitives: Vec::new(),
            composed: Vec::new(),
            composition_history: Vec::new(),
        }
    }

    pub fn compose_binary(&mut self, ontology: &SkillOntology) {
        let mut new_composed = Vec::new();
        for a in &self.primitives {
            for b in &self.primitives {
                if self.are_semantically_compatible(a, b, ontology) {
                    let composed = ComposedSkill {
                        sequence: vec![a.clone(), b.clone()],
                        preconditions: self.merge_preconditions(a, b),
                        postconditions: self.infer_postconditions(a, b),
                        emergence_properties: self.detect_emergence(a, b),
                        usage_count: 0,
                        success_rate: 0.0,
                    };
                    new_composed.push(composed);
                }
            }
        }
        self.composed.extend(new_composed);
    }

    fn are_semantically_compatible(
        &self,
        a: &PrimitiveSkill,
        b: &PrimitiveSkill,
        _ontology: &SkillOntology,
    ) -> bool {
        match (a.tier, b.tier) {
            (7, 4) => true,
            (4, 7) => a.output_guarantees.contains(&PropertyGuarantee::ObjectsPreserved),
            (6, 7) => true,
            (7, 6) => true,
            (4, 4) => self.are_commutative(a, b),
            _ => true,
        }
    }

    fn detect_emergence(&self, a: &PrimitiveSkill, b: &PrimitiveSkill) -> Vec<EmergenceProperty> {
        let mut emergent = Vec::new();
        if a.tier == 7 && b.tier == 4 {
            emergent.push(EmergenceProperty::TemplateAwareRotation);
        }
        if a.tier == 6 && b.tier == 7 {
            emergent.push(EmergenceProperty::ContextAwareFill);
        }
        emergent
    }

    fn are_commutative(&self, _a: &PrimitiveSkill, _b: &PrimitiveSkill) -> bool { true }

    fn merge_preconditions(&self, _a: &PrimitiveSkill, _b: &PrimitiveSkill) -> Vec<PropertyRequirement> { vec![] }

    fn infer_postconditions(&self, _a: &PrimitiveSkill, _b: &PrimitiveSkill) -> Vec<PropertyGuarantee> { vec![] }

    pub fn generate_novel_combinations(&self, _ontology: &SkillOntology, _base: &[Axiom]) -> Vec<ComposedSkill> {
        vec![]
    }
}


/// Autopoietic Synthesizer: Menghasilkan kode Rust generatif dari Quantum Crossover
pub struct AutopoieticSynthesizer;

impl AutopoieticSynthesizer {
    pub fn on_catastrophic_failure(dead_waves: &[WaveNode], trigger_task: &str) -> Option<String> {
        if dead_waves.len() < 2 {
            return None; // Butuh minimal 2 kegagalan untuk crossover
        }

        // 1. Quantum Crossover: Superposisi dari 2 ide terbaik yang gagal
        let node_a = &dead_waves[0];
        let node_b = &dead_waves[1];

        let mut novel_spatial = &node_a.tensor_spatial * 0.6 + &node_b.tensor_spatial * 0.4;

        // Manual branchless L2 renormalization
        let mut sq_sum = 0.0;
        for &v in novel_spatial.iter() {
            sq_sum += v * v;
        }
        let inv_mag = 1.0 / (sq_sum.sqrt() + 1e-15);
        for v in novel_spatial.iter_mut() {
            *v *= inv_mag;
        }


        let mut novel_semantic = &node_a.tensor_semantic * 0.5 + &node_b.tensor_semantic * 0.5;

        let mut sq_sum2 = 0.0;
        for &v in novel_semantic.iter() {
            sq_sum2 += v * v;
        }
        let inv_mag2 = 1.0 / (sq_sum2.sqrt() + 1e-15);
        for v in novel_semantic.iter_mut() {
            *v *= inv_mag2;
        }


        // 2. Format Tensor ke String Rust (Hanya ambil 5 dimensi pertama sbg representasi)
        let tensor_str = novel_spatial.iter().take(5).map(|v| format!("{:.4}", v)).collect::<Vec<_>>().join(", ");

        let skill_id = format!("synthesized_crossover_{}", Utc::now().format("%Y%m%d_%H%M%S"));

        // 3. Generate Markdown & Kode Rust (Git-style)
        let md_content = format!(r#"---
id: {}
type: synthesized
confidence: 0.50
parent: mcts_fallback
---

## Origin
Generated from catastrophic failure.
- Trigger Task: {}
- Method: Quantum Crossover of failed WaveNodes.
- Parents: [{:?}, {:?}]

## Synthesis Tensor Approximation (First 5 dims)
[{}]

## Autopoietic Algorithm
```rust
use crate::core::entity_manifold::EntityManifold;
use crate::core::fhrr::FHRR;
use ndarray::Array1;

pub fn execute_novel_skill(input: &mut EntityManifold) -> Result<(), String> {{
    // Apply Novel Spatial Tensor generated by Autopoietic Crossover
    // The actual tensor applies a non-linear continuous shift
    println!("🧬 Menerapkan aksioma yang disintesis sendiri: {}");

    // (Pondasi untuk apply tensor_spatial ke manifold)
    Ok(())
}}
```

## Validation
- [ ] Sandbox Test
- [ ] Benchmarked
"#,
            skill_id,
            trigger_task,
            node_a.axiom_type.last().unwrap_or(&"UNKNOWN".to_string()),
            node_b.axiom_type.last().unwrap_or(&"UNKNOWN".to_string()),
            tensor_str,
            skill_id
        );

        // 4. Tulis ke Wiki (File System)
        let out_dir = PathBuf::from("knowledge/skills/auto");
        let _ = fs::create_dir_all(&out_dir);
        let out_path = out_dir.join(format!("{}.md", skill_id));
        let _ = fs::write(&out_path, &md_content);

        println!("🧬 [Autopoiesis] Kode genetik baru berhasil ditulis ke {:?}", out_path);

        Some(skill_id)
    }
}
