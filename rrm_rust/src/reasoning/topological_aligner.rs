use crate::core::entity_manifold::EntityManifold;
use crate::core::fhrr::FHRR;
use crate::core::config::GLOBAL_DIMENSION;
use ndarray::Array1;
use std::collections::HashMap;

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
    pub fn align(source_manifold: &EntityManifold, target_manifold: &EntityManifold) -> Vec<TopologicalMatch> {
        let mut matches = Vec::with_capacity(source_manifold.active_count);

        // TRUE SWARM CONSENSUS (Hebbian Voting Kaku)
        // Agar bentuk tidak "drift" seperti pasir/fluida, kita paksa sebuah konsensus
        // pergerakan massal untuk setiap warna benda.

        let mut votes: HashMap<String, i32> = HashMap::new();

        for s_idx in 0..source_manifold.active_count {
            let s_color = source_manifold.tokens[s_idx];
            let s_cx = source_manifold.centers_x[s_idx];
            let s_cy = source_manifold.centers_y[s_idx];

            for t_idx in 0..target_manifold.active_count {
                let t_color = target_manifold.tokens[t_idx];

                if s_color == t_color {
                    let t_cx = target_manifold.centers_x[t_idx];
                    let t_cy = target_manifold.centers_y[t_idx];

                    let dx = t_cx - s_cx;
                    let dy = t_cy - s_cy;

                    let key = format!("{:.1}_{:.1}", dx, dy);
                    *votes.entry(key).or_insert(0) += 1;
                }
            }
        }

        // Temukan Gerakan Konsensus Paling Dominan (Hebbian Max)
        let mut best_dx = 0.0;
        let mut best_dy = 0.0;
        let mut max_votes = 0;

        for (key, count) in votes {
            if count > max_votes {
                max_votes = count;
                let parts: Vec<&str> = key.split('_').collect();
                best_dx = parts[0].parse().unwrap_or(0.0);
                best_dy = parts[1].parse().unwrap_or(0.0);
            }
        }

        // Pindahkan semua partikel SEARAH DAN SEJAUH konsensus ini,
        // sehingga bentuk aslinya tetap kaku tanpa drift piksel individual.
        for s_idx in 0..source_manifold.active_count {
            if source_manifold.masses[s_idx] == 0.0 {
                continue;
            }

            let mut d_spatial = Array1::<f32>::zeros(GLOBAL_DIMENSION);
            let mut d_semantic = Array1::<f32>::zeros(GLOBAL_DIMENSION);
            d_spatial[0] = 1.0; d_spatial[GLOBAL_DIMENSION - 1] = 1.0;
            d_semantic[0] = 1.0; d_semantic[GLOBAL_DIMENSION - 1] = 1.0;

            matches.push(TopologicalMatch {
                source_index: s_idx,
                target_index: -1,
                similarity: 1.0,
                delta_spatial: d_spatial,
                delta_semantic: d_semantic,
                delta_x: best_dx,
                delta_y: best_dy,
                axiom_type: format!("SWARM_RIGID_{}_{}", best_dx, best_dy),
                physics_tier: 0,
            });
        }

        matches
    }
}
