use crate::core::config::GLOBAL_DIMENSION;
use crate::core::entity_manifold::EntityManifold;
use crate::core::fhrr::FHRR;
use ndarray::Array1;
use std::collections::{HashMap, HashSet};

pub struct EntitySegmenter;

struct ParsedKey {
    x: usize,
    y: usize,
    token: i32,
}

impl EntitySegmenter {
    pub fn segment_stream(
        stream: &HashMap<String, (Array1<f32>, Array1<f32>)>, // Tuple: (Spatial, Semantic)
        manifold: &mut EntityManifold,
        similarity_threshold: f32,
    ) {
        let mut visited = HashSet::new();
        let mut global_width = 1;
        let mut global_height = 1;

        let parse_key = |key: &str| -> ParsedKey {
            let parts: Vec<&str> = key.split("_t").collect();
            let coords: Vec<&str> = parts[0].split(",").collect();
            ParsedKey {
                x: coords[0].parse().unwrap(),
                y: coords[1].parse().unwrap(),
                token: parts[1].parse().unwrap(),
            }
        };

        let mut entity_counter = 1;
        let mut token_groups: HashMap<i32, Vec<(String, Array1<f32>, Array1<f32>, ParsedKey)>> =
            HashMap::new();

        for (key, (spatial_tensor, semantic_tensor)) in stream.iter() {
            let parsed = parse_key(key);
            global_width = usize::max(global_width, parsed.x + 1);
            global_height = usize::max(global_height, parsed.y + 1);

            token_groups
                .entry(parsed.token)
                .or_insert_with(Vec::new)
                .push((
                    key.clone(),
                    spatial_tensor.clone(),
                    semantic_tensor.clone(),
                    parsed,
                ));
        }

        manifold.global_width = global_width as f32;
        manifold.global_height = global_height as f32;

        let mut manifold_idx = 0;

        // Kita clustering murni berdasarkan Spasial (Bentuk/Posisi terdekat)
        // Karena iterasi sudah dikelompokkan oleh `token_groups`, warnanya pasti seragam.
        for (_, group) in token_groups.iter() {
            for (key, sp_tensor, sem_tensor, parsed) in group.iter() {
                if visited.contains(key) {
                    continue;
                }

                let mut current_cluster = vec![(
                    key.clone(),
                    sp_tensor.clone(),
                    sem_tensor.clone(),
                    parsed.x,
                    parsed.y,
                    parsed.token,
                )];
                visited.insert(key.clone());

                let mut keep_growing = true;
                while keep_growing {
                    keep_growing = false;
                    for (cand_key, cand_sp_tensor, cand_sem_tensor, cand_parsed) in group.iter() {
                        if visited.contains(cand_key) {
                            continue;
                        }

                        let mut best_sim = -1.0;
                        for (_, core_sp_tensor, _, _, _, _) in current_cluster.iter() {
                            // Bandingkan kesamaan BENTUK dan POSISI (Spatial Tensor), bebas dari bias warna!
                            let sim = FHRR::similarity(core_sp_tensor, cand_sp_tensor);
                            if sim > best_sim {
                                best_sim = sim;
                            }
                        }

                        if best_sim >= similarity_threshold {
                            current_cluster.push((
                                cand_key.clone(),
                                cand_sp_tensor.clone(),
                                cand_sem_tensor.clone(),
                                cand_parsed.x,
                                cand_parsed.y,
                                cand_parsed.token,
                            ));
                            visited.insert(cand_key.clone());
                            keep_growing = true;
                        }
                    }
                }

                // Compile Entity to SoA Manifold
                if manifold_idx >= crate::core::config::MAX_ENTITIES {
                    println!("[Rust EntitySegmenter] Warning: MAX_ENTITIES limit reached.");
                    break;
                }

                let mut super_sp_tensor = Array1::zeros(GLOBAL_DIMENSION);
                let mut super_sem_tensor = Array1::zeros(GLOBAL_DIMENSION);

                let mut min_x = f32::MAX;
                let mut max_x = f32::MIN;
                let mut min_y = f32::MAX;
                let mut max_y = f32::MIN;
                let mass = current_cluster.len() as f32;
                let token = current_cluster[0].5;

                for (_, c_sp, c_sem, cx, cy, _) in current_cluster.iter() {
                    for d in 0..GLOBAL_DIMENSION {
                        super_sp_tensor[d] += c_sp[d];
                        super_sem_tensor[d] += c_sem[d];
                    }
                    min_x = f32::min(min_x, *cx as f32);
                    max_x = f32::max(max_x, *cx as f32);
                    min_y = f32::min(min_y, *cy as f32);
                    max_y = f32::max(max_y, *cy as f32);
                }

                // Normalisasi Spatial Tensor
                let mut mag_sp: f32 = 0.0;
                let mut mag_sem: f32 = 0.0;
                for d in 0..GLOBAL_DIMENSION {
                    mag_sp += super_sp_tensor[d] * super_sp_tensor[d];
                    mag_sem += super_sem_tensor[d] * super_sem_tensor[d];
                }

                let inv_mag_sp = 1.0 / (mag_sp.sqrt() + 1e-15);
                let inv_mag_sem = 1.0 / (mag_sem.sqrt() + 1e-15);

                for d in 0..GLOBAL_DIMENSION {
                    super_sp_tensor[d] *= inv_mag_sp;
                    super_sem_tensor[d] *= inv_mag_sem;
                }

                let center_x = ((min_x + max_x) / 2.0) / f32::max(1.0, manifold.global_width - 1.0);
                let center_y =
                    ((min_y + max_y) / 2.0) / f32::max(1.0, manifold.global_height - 1.0);

                let id_str = format!("ENT_{}", entity_counter);
                entity_counter += 1;

                manifold.ids[manifold_idx] = id_str;
                manifold.masses[manifold_idx] = mass;
                manifold.tokens[manifold_idx] = token;
                manifold.centers_x[manifold_idx] = center_x;
                manifold.centers_y[manifold_idx] = center_y;
                manifold.spans_x[manifold_idx] = (max_x - min_x) + 1.0;
                manifold.spans_y[manifold_idx] = (max_y - min_y) + 1.0;

                let mut dest_sp = manifold.get_spatial_tensor_mut(manifold_idx);
                dest_sp.assign(&super_sp_tensor);

                let mut dest_sem = manifold.get_semantic_tensor_mut(manifold_idx);
                dest_sem.assign(&super_sem_tensor);

                manifold_idx += 1;
            }
        }

        manifold.active_count = manifold_idx;
    }
}
