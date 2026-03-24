use crate::core::config::GLOBAL_DIMENSION;
use crate::core::entity_manifold::EntityManifold;
use crate::core::fhrr::FHRR;
use ndarray::Array1;

pub struct TopologicalMatch {
    pub source_index: usize,
    pub target_index: i32, // -1 jika tidak ada
    pub similarity: f32,
    pub delta_spatial: Array1<f32>,
    pub delta_semantic: Array1<f32>,
    pub delta_x: f32,
    pub delta_y: f32,
    pub axiom_type: String,
    pub physics_tier: u8,
}

pub struct TopologicalAligner;

impl TopologicalAligner {
    pub fn align(
        source_manifold: &EntityManifold,
        target_manifold: &EntityManifold,
    ) -> Vec<TopologicalMatch> {
        let mut matches = Vec::with_capacity(source_manifold.active_count);
        let mut used_targets = vec![false; target_manifold.active_count];

        for s_idx in 0..source_manifold.active_count {
            if source_manifold.masses[s_idx] == 0.0 {
                continue;
            }

            // Gunakan Spatial Tensor murni untuk Topologi Shape/Posisi
            let src_spatial = source_manifold.get_spatial_tensor(s_idx);
            let src_semantic = source_manifold.get_semantic_tensor(s_idx);
            let src_cx = source_manifold.centers_x[s_idx];
            let src_cy = source_manifold.centers_y[s_idx];
            let src_token = source_manifold.tokens[s_idx];

            let mut best_sim = -999.0;
            let mut best_target_idx: i32 = -1;
            let mut best_dx = 0.0;
            let mut best_dy = 0.0;
            let mut best_axiom_type = String::from("IDENTITY");

            for t_idx in 0..target_manifold.active_count {
                if used_targets[t_idx] || target_manifold.masses[t_idx] == 0.0 {
                    continue;
                }

                let tgt_spatial = target_manifold.get_spatial_tensor(t_idx);
                let tgt_cx = target_manifold.centers_x[t_idx];
                let tgt_cy = target_manifold.centers_y[t_idx];

                // MURNI KESAMAAN SPASIAL (BENTUK DAN POSISI)
                // Warnanya tidak lagi mempengaruhi kemungkinan objek ini adalah objek yang sama!
                let sim = FHRR::similarity(&src_spatial, &tgt_spatial);

                if sim > best_sim {
                    best_sim = sim;
                    best_target_idx = t_idx as i32;
                    best_dx = tgt_cx - src_cx;
                    best_dy = tgt_cy - src_cy;

                    let tgt_token = target_manifold.tokens[t_idx];
                    best_axiom_type = if src_token != tgt_token {
                        format!(
                            "TRANS_{}_{}+COLOR({}->{})",
                            best_dx, best_dy, src_token, tgt_token
                        )
                    } else {
                        format!("TRANS_{}_{}", best_dx, best_dy)
                    };
                }
            }

            let mut d_spatial = Array1::<f32>::zeros(GLOBAL_DIMENSION);
            let mut d_semantic = Array1::<f32>::zeros(GLOBAL_DIMENSION);
            d_spatial[0] = 1.0;
            d_spatial[GLOBAL_DIMENSION - 1] = 1.0; // Identity Tensor
            d_semantic[0] = 1.0;
            d_semantic[GLOBAL_DIMENSION - 1] = 1.0; // Identity Tensor

            if best_target_idx != -1 {
                used_targets[best_target_idx as usize] = true;

                let tgt_spatial = target_manifold.get_spatial_tensor(best_target_idx as usize);
                let tgt_semantic = target_manifold.get_semantic_tensor(best_target_idx as usize);

                let tgt_token = target_manifold.tokens[best_target_idx as usize];

                // 1. Ekstraksi Delta Spasial (Mirror / Rotasi jika ada, disini kita default Identity untuk test base)
                // Seharusnya diekstrak dari Probe Geometric Axiom seperti di TS.
                // Untuk simulasi ini kita biarkan Identity karena `delta_x/y` skalar momentum yang memindahkan objek.
                // (Atau bisa d_spatial = FHRR::bind(&tgt_spatial, &FHRR::inverse(&src_spatial)) jika mau Full VSA Translation).

                // 2. Ekstraksi Delta Semantik (Warna murni, 100% bebas dari Spasial)
                if src_token != tgt_token {
                    d_semantic = FHRR::bind(&tgt_semantic, &FHRR::inverse(&src_semantic));
                }
            }

            matches.push(TopologicalMatch {
                source_index: s_idx,
                target_index: best_target_idx,
                similarity: best_sim,
                delta_spatial: d_spatial,
                delta_semantic: d_semantic,
                delta_x: best_dx,
                delta_y: best_dy,
                axiom_type: best_axiom_type,
                physics_tier: 0, // Fallback to instant
            });
        }

        matches
    }
}
