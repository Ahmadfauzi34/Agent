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

    /// Terapkan Dual-Axiom (Translasi Spasial + Mutasi Semantik) ke Universe
    pub fn apply_axiom(
        u: &mut EntityManifold,
        delta_spatial: &Array1<f32>,
        delta_semantic: &Array1<f32>,
        delta_x: f32,
        delta_y: f32,
        physics_tier: u8,
    ) {
        // Karena `centers_x/y` di Rust sekarang menggunakan Absolut Piksel, delta juga murni Absolut Piksel
        let abs_dx = delta_x;
        let abs_dy = delta_y;

        match physics_tier {
            0 => {
                for e in 0..u.active_count {
                    if u.masses[e] == 0.0 {
                        continue;
                    }

                    // 1. Spasial Tensor Binding
                    let mut sp_tensor = u.get_spatial_tensor_mut(e);
                    let original_sp = sp_tensor.to_owned();
                    let future_sp = FHRR::bind(&original_sp, delta_spatial);
                    sp_tensor.assign(&future_sp);

                    // 2. Semantik Tensor Binding
                    let mut sem_tensor = u.get_semantic_tensor_mut(e);
                    let original_sem = sem_tensor.to_owned();
                    let future_sem = FHRR::bind(&original_sem, delta_semantic);
                    sem_tensor.assign(&future_sem);

                    // 3. Scalar Momentum Update (Piksel Absolut)
                    u.centers_x[e] += abs_dx;
                    u.centers_y[e] += abs_dy;
                }
            }
            _ => {
                println!(
                    "[Rust Sandbox] Warning: Advanced Physics Tier {} not implemented yet.",
                    physics_tier
                );
            }
        }
    }
}
