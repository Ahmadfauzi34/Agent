use crate::core::config::GLOBAL_DIMENSION;
use crate::core::fhrr::FHRR;
use ndarray::Array1;

pub struct Hypothesis {
    pub tensor_rule: Array1<f32>,
    pub free_energy: f32,
    pub description: String,
    pub delta_x: f32,
    pub delta_y: f32,
    pub depth: u32,
    pub physics_tier: u8,
}

pub struct HamiltonianPruner {
    pub hypotheses: Vec<Hypothesis>,
    pub max_branches: usize,
}

impl HamiltonianPruner {
    pub fn new() -> Self {
        Self {
            hypotheses: Vec::new(),
            max_branches: 128,
        }
    }

    pub fn inject_hypothesis(
        &mut self,
        desc: &str,
        tensor: &Array1<f32>,
        dx: f32,
        dy: f32,
        energy: f32,
        depth: u32,
        physics_tier: u8,
    ) {
        // Cek duplikasi
        for hyp in &self.hypotheses {
            let sim = FHRR::similarity(&hyp.tensor_rule, tensor);
            if sim > 0.99
                && hyp.delta_x == dx
                && hyp.delta_y == dy
                && hyp.physics_tier == physics_tier
            {
                return; // Sudah ada
            }
        }

        self.hypotheses.push(Hypothesis {
            tensor_rule: tensor.clone(),
            free_energy: energy,
            description: desc.to_string(),
            delta_x: dx,
            delta_y: dy,
            depth,
            physics_tier,
        });

        self.enforce_dissipation();
    }

    pub fn apply_active_cross_validation(
        &mut self,
        test_tensor: &Array1<f32>,
        test_dx: f32,
        test_dy: f32,
        is_entangled: bool,
    ) {
        for hyp in &mut self.hypotheses {
            // Evaluasi Kesamaan (Cos Sim)
            let sim = FHRR::similarity(&hyp.tensor_rule, test_tensor);

            // Cek kesamaan momentum (dx, dy)
            let momentum_match = if hyp.delta_x == test_dx && hyp.delta_y == test_dy {
                1.0
            } else {
                0.0
            };

            // The Eraser: Jika gerakan tidak match (padahal seharusnya), hancurkan energinya
            if momentum_match == 0.0 && !is_entangled {
                hyp.free_energy += 999.0;
            } else if sim < 0.6 {
                // Decay termodinamika
                hyp.free_energy += (1.0 - sim) * 5.0;
            } else {
                // Reward untuk rule yang bagus
                hyp.free_energy -= sim;
                hyp.free_energy = f32::max(0.0, hyp.free_energy);
            }
        }

        self.enforce_dissipation();
    }

    fn enforce_dissipation(&mut self) {
        // Sort ascending by energy
        self.hypotheses
            .sort_by(|a, b| a.free_energy.partial_cmp(&b.free_energy).unwrap());

        // Buang yang lebih dari max branches atau energy tinggi
        self.hypotheses.retain(|h| h.free_energy < 50.0);
        if self.hypotheses.len() > self.max_branches {
            self.hypotheses.truncate(self.max_branches);
        }
    }

    pub fn clear_all(&mut self) {
        self.hypotheses.clear();
    }

    pub fn extract_ground_state(&self) -> Option<&Hypothesis> {
        self.hypotheses.first()
    }
}
