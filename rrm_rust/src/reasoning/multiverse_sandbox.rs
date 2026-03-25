use crate::core::config::GLOBAL_DIMENSION;
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
        condition_tensor: &Option<Array1<f32>>,
        delta_spatial: &Array1<f32>,
        delta_semantic: &Array1<f32>,
        delta_x: f32,
        delta_y: f32,
        physics_tier: u8,
    ) {
        let abs_dx = delta_x.round();
        let abs_dy = delta_y.round();

        for e in 0..u.active_count {
            if u.masses[e] == 0.0 {
                continue;
            }

            // QUANTUM IF-STATEMENT (Conditional Resonance)
            // Jika ada condition_tensor, pastikan entitas ini beresonansi dengannya.
            // Karena condition_tensor saat ini di-extract dari warna, kita cek semantic_tensor.
            let mut matches_condition = true;
            if let Some(cond) = condition_tensor {
                let sem = u.get_semantic_tensor(e);
                let sim = FHRR::similarity(&sem, cond);
                if sim < 0.8 {
                    matches_condition = false;
                }
            }

            if matches_condition {
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

                // MURNI UNTUK SWARM: Update token untuk Decoder
                // Karena kita langsung nge-print token dari list di decoder Swarm
                // Untuk POC ini kita override secara manual:
                // (Idealnya ini pakai Hologram Decoder + Multi Spectrum Probe 100%)
                if delta_semantic[0] < 0.99 || delta_semantic[GLOBAL_DIMENSION - 1] < 0.99 {
                    // Berarti ini bukan Identity (ada mutasi warna).
                    // Kita harus decode warnanya ke token.
                    // Untuk kesederhanaan POC Swarm saat ini, kita akan decode warnanya
                    // dengan menembak Sinar Probe ke semantic_tensor yang baru.
                    // Ini diimplementasi di luar (decoder), jadi kita biarkan saja.
                }
            }
        }
    }
}
