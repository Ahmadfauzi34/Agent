use crate::core::fhrr::FHRR;
use ndarray::Array1;

pub struct Hypothesis {
    pub condition_tensor: Option<Array1<f32>>, // SIAPA yang dikenai rule ini?
    pub tensor_spatial: Array1<f32>,
    pub tensor_semantic: Array1<f32>,
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

impl Default for HamiltonianPruner {
    fn default() -> Self {
        Self::new()
    }
}

impl HamiltonianPruner {
    pub fn new() -> Self {
        Self {
            hypotheses: Vec::new(),
            max_branches: 1024,
        }
    }

    pub fn inject_hypothesis(
        &mut self,
        desc: &str,
        condition: Option<Array1<f32>>,
        t_spatial: &Array1<f32>,
        t_semantic: &Array1<f32>,
        dx: f32,
        dy: f32,
        energy: f32,
        depth: u32,
        physics_tier: u8,
    ) {
        // Cek duplikasi
        for hyp in &self.hypotheses {
            let sim_sp = FHRR::similarity(&hyp.tensor_spatial, t_spatial);
            let sim_sem = FHRR::similarity(&hyp.tensor_semantic, t_semantic);

            let mut cond_match = false;
            if let (Some(c1), Some(c2)) = (&hyp.condition_tensor, &condition) {
                if FHRR::similarity(c1, c2) > 0.99 { cond_match = true; }
            } else if hyp.condition_tensor.is_none() && condition.is_none() {
                cond_match = true;
            }

            if sim_sp > 0.99
                && sim_sem > 0.99
                && cond_match
                && hyp.delta_x == dx
                && hyp.delta_y == dy
                && hyp.physics_tier == physics_tier
            {
                return; // Sudah ada
            }
        }

        self.hypotheses.push(Hypothesis {
            condition_tensor: condition,
            tensor_spatial: t_spatial.clone(),
            tensor_semantic: t_semantic.clone(),
            free_energy: energy,
            description: desc.to_string(),
            delta_x: dx,
            delta_y: dy,
            depth,
            physics_tier,
        });

        self.enforce_dissipation();
    }

    pub fn calculate_free_energy(actual: &Vec<Vec<i32>>, expected: &Vec<Vec<i32>>) -> f32 {
        let mut energy = 0.0;

        if actual.len() != expected.len() || (!actual.is_empty() && actual[0].len() != expected[0].len()) {
            energy += 9999.0;
            return energy;
        }

        let height = actual.len();
        let width = if height > 0 { actual[0].len() } else { 0 };

        for y in 0..height {
            for x in 0..width {
                if actual[y][x] != expected[y][x] {
                    energy += 1.0;
                }
            }
        }

        energy
    }

    pub fn enforce_dissipation(&mut self) {
        self.hypotheses.sort_by(|a, b| a.free_energy.partial_cmp(&b.free_energy).unwrap());
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
