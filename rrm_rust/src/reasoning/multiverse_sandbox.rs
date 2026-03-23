use crate::core::entity_manifold::EntityManifold;
use crate::core::fhrr::FHRR;
use ndarray::Array1;

pub struct MultiverseSandbox {
    pub active_universes: usize,
}

impl MultiverseSandbox {
    pub fn new() -> Self {
        Self {
            active_universes: 1, // Start with Universe 0
        }
    }

    /// Terapkan Aksioma (Translasi/Mutasi) ke Universe
    pub fn apply_axiom(
        u: &mut EntityManifold,
        axiom_vector: &Array1<f32>,
        delta_x: f32,
        delta_y: f32,
        physics_tier: u8,
    ) {
        let rel_dx = delta_x / f32::max(1.0, u.global_width - 1.0);
        let rel_dy = delta_y / f32::max(1.0, u.global_height - 1.0);

        match physics_tier {
            0 => {
                for e in 0..u.active_count {
                    if u.masses[e] == 0.0 {
                        continue;
                    }

                    // Tensor Binding
                    let mut entity_tensor = u.get_tensor_mut(e);
                    // Karena entity_tensor adalah view mutable 1D, kita ambil salinannya untuk argumen pertama
                    let original = entity_tensor.to_owned();
                    let future_state = FHRR::bind(&original, axiom_vector);

                    entity_tensor.assign(&future_state);

                    // Scalar Momentum Update
                    u.centers_x[e] += rel_dx;
                    u.centers_y[e] += rel_dy;
                }
            }
            _ => {
                // Tier 1 & 2 (Domino / Swarm) will be implemented here for continuous paths
                println!("[Rust Sandbox] Warning: Advanced Physics Tier {} not implemented yet.", physics_tier);
            }
        }
    }
}
