use crate::core::entity_manifold::EntityManifold;
use crate::core::fhrr::FHRR;
use crate::core::config::GLOBAL_DIMENSION;
use crate::core::core_seeds::CoreSeeds;
use ndarray::Array1;
use std::collections::HashMap;

pub struct TopologicalMatch {
    pub source_index: usize,
    pub target_index: i32,
    pub similarity: f32,
    pub condition_tensor: Option<Array1<f32>>, // IF(Condition)
    pub delta_spatial: Array1<f32>,
    pub delta_semantic: Array1<f32>,
    pub delta_x: f32,
    pub delta_y: f32,
    pub axiom_type: String,
    pub physics_tier: u8,
}

pub struct TopologicalAligner;

impl TopologicalAligner {
    pub fn align(source_manifold: &EntityManifold, target_manifold: &EntityManifold) -> Vec<TopologicalMatch> {
        let mut matches = Vec::new();

        // Menyimpan voting pergeseran berdasarkan Token Warna tertentu (Kondisional)
        // Format Key: "ColorToken|dx_dy" -> jumlah vote
        let mut conditional_trans_votes: HashMap<String, i32> = HashMap::new();
        // Menyimpan voting perubahan warna secara spesifik
        // Format Key: "ColorToken|targetColor" -> jumlah vote
        let mut conditional_color_votes: HashMap<String, i32> = HashMap::new();

        for s_idx in 0..source_manifold.active_count {
            let s_color = source_manifold.tokens[s_idx];
            let s_cx = source_manifold.centers_x[s_idx];
            let s_cy = source_manifold.centers_y[s_idx];

            for t_idx in 0..target_manifold.active_count {
                let t_color = target_manifold.tokens[t_idx];
                let t_cx = target_manifold.centers_x[t_idx];
                let t_cy = target_manifold.centers_y[t_idx];

                // Abaikan Background ARC (Warna 0 / Hitam)
                if s_color == 0 || t_color == 0 {
                    continue;
                }

                let dx = t_cx - s_cx;
                let dy = t_cy - s_cy;

                // Voting Translasi jika warnanya dipertahankan
                if s_color == t_color {
                    let key = format!("{}|{:.1}_{:.1}", s_color, dx, dy);
                    *conditional_trans_votes.entry(key).or_insert(0) += 1;
                }

                // Voting Warna jika posisinya dipertahankan
                if dx.abs() < 0.1 && dy.abs() < 0.1 && s_color != t_color {
                    let key = format!("{}|{}", s_color, t_color);
                    *conditional_color_votes.entry(key).or_insert(0) += 1;
                }
            }
        }

        // Identity Tensor
        let mut id_tensor = Array1::<f32>::zeros(GLOBAL_DIMENSION);
        id_tensor[0] = 1.0; id_tensor[GLOBAL_DIMENSION - 1] = 1.0;

        // Ambil Top Conditional Translations
        let mut sorted_trans: Vec<(&String, &i32)> = conditional_trans_votes.iter().collect();
        sorted_trans.sort_by(|a, b| b.1.cmp(a.1));

        for (idx, (key, _count)) in sorted_trans.iter().enumerate().take(5) {
            let p1: Vec<&str> = key.split('|').collect();
            let color: i32 = p1[0].parse().unwrap_or(0);

            let p2: Vec<&str> = p1[1].split('_').collect();
            let dx: f32 = p2[0].parse().unwrap_or(0.0);
            let dy: f32 = p2[1].parse().unwrap_or(0.0);

            let condition_phase = FHRR::fractional_bind(CoreSeeds::color_seed(), color as f32);

            matches.push(TopologicalMatch {
                source_index: 0,
                target_index: -1,
                similarity: 1.0 - (idx as f32 * 0.1),
                condition_tensor: Some(condition_phase),
                delta_spatial: id_tensor.clone(),
                delta_semantic: id_tensor.clone(),
                delta_x: dx,
                delta_y: dy,
                axiom_type: format!("IF_COLOR({})_THEN_TRANS_{}_{}", color, dx, dy),
                physics_tier: 0,
            });
        }

        // Ambil Top Conditional Color Mutations
        let mut sorted_color: Vec<(&String, &i32)> = conditional_color_votes.iter().collect();
        sorted_color.sort_by(|a, b| b.1.cmp(a.1));

        for (idx, (key, _count)) in sorted_color.iter().enumerate().take(3) {
            let parts: Vec<&str> = key.split('|').collect();
            let s_color: i32 = parts[0].parse().unwrap_or(0);
            let t_color: i32 = parts[1].parse().unwrap_or(0);

            let condition_phase = FHRR::fractional_bind(CoreSeeds::color_seed(), s_color as f32);
            let tgt_color_phase = FHRR::fractional_bind(CoreSeeds::color_seed(), t_color as f32);
            let d_semantic = FHRR::bind(&tgt_color_phase, &FHRR::inverse(&condition_phase));

            matches.push(TopologicalMatch {
                source_index: 0,
                target_index: -1,
                similarity: 1.0 - (idx as f32 * 0.1),
                condition_tensor: Some(condition_phase),
                delta_spatial: id_tensor.clone(),
                delta_semantic: d_semantic,
                delta_x: 0.0,
                delta_y: 0.0,
                axiom_type: format!("IF_COLOR({})_THEN_SHIFT(->{})", s_color, t_color),
                physics_tier: 0,
            });
        }

        // Hipotesis Global / Fallback (Tanpa Syarat)
        matches.push(TopologicalMatch {
            source_index: 0,
            target_index: -1,
            similarity: 0.1,
            condition_tensor: None,
            delta_spatial: id_tensor.clone(),
            delta_semantic: id_tensor.clone(),
            delta_x: 0.0,
            delta_y: 0.0,
            axiom_type: "IDENTITY_STATIC".to_string(),
            physics_tier: 0,
        });

        matches
    }
}
