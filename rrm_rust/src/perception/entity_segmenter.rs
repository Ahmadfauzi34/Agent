use std::collections::{HashMap, HashSet};
use ndarray::Array1;
use crate::core::entity_manifold::EntityManifold;
use crate::core::fhrr::FHRR;
use crate::core::config::GLOBAL_DIMENSION;

pub struct EntitySegmenter;

struct ParsedKey {
    x: usize,
    y: usize,
    token: i32,
}

impl EntitySegmenter {
    pub fn segment_stream(
        stream: &HashMap<String, Array1<f32>>,
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
        let mut token_groups: HashMap<i32, Vec<(String, Array1<f32>, ParsedKey)>> = HashMap::new();

        for (key, tensor) in stream.iter() {
            let parsed = parse_key(key);
            global_width = usize::max(global_width, parsed.x + 1);
            global_height = usize::max(global_height, parsed.y + 1);

            token_groups
                .entry(parsed.token)
                .or_insert_with(Vec::new)
                .push((key.clone(), tensor.clone(), parsed));
        }

        manifold.global_width = global_width as f32;
        manifold.global_height = global_height as f32;

        let mut manifold_idx = 0;

        for (_, group) in token_groups.iter() {
            for (key, tensor, parsed) in group.iter() {
                if visited.contains(key) {
                    continue;
                }

                let mut current_cluster = vec![(key.clone(), tensor.clone(), parsed.x, parsed.y, parsed.token)];
                visited.insert(key.clone());

                let mut keep_growing = true;
                while keep_growing {
                    keep_growing = false;
                    for (cand_key, cand_tensor, cand_parsed) in group.iter() {
                        if visited.contains(cand_key) {
                            continue;
                        }

                        let mut best_sim = -1.0;
                        for (_, core_tensor, _, _, _) in current_cluster.iter() {
                            let sim = FHRR::similarity(core_tensor, cand_tensor);
                            if sim > best_sim {
                                best_sim = sim;
                            }
                        }

                        if best_sim >= similarity_threshold {
                            current_cluster.push((
                                cand_key.clone(),
                                cand_tensor.clone(),
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

                let mut super_tensor = Array1::zeros(GLOBAL_DIMENSION);
                let mut min_x = f32::MAX;
                let mut max_x = f32::MIN;
                let mut min_y = f32::MAX;
                let mut max_y = f32::MIN;
                let mass = current_cluster.len() as f32;
                let token = current_cluster[0].4;

                for (_, c_tensor, cx, cy, _) in current_cluster.iter() {
                    for d in 0..GLOBAL_DIMENSION {
                        super_tensor[d] += c_tensor[d];
                    }
                    min_x = f32::min(min_x, *cx as f32);
                    max_x = f32::max(max_x, *cx as f32);
                    min_y = f32::min(min_y, *cy as f32);
                    max_y = f32::max(max_y, *cy as f32);
                }

                // Normalisasi
                let mut mag: f32 = 0.0;
                for d in 0..GLOBAL_DIMENSION {
                    mag += super_tensor[d] * super_tensor[d];
                }
                let inv_mag = 1.0 / (mag.sqrt() + 1e-15);
                for d in 0..GLOBAL_DIMENSION {
                    super_tensor[d] *= inv_mag;
                }

                let center_x = ((min_x + max_x) / 2.0) / f32::max(1.0, manifold.global_width - 1.0);
                let center_y = ((min_y + max_y) / 2.0) / f32::max(1.0, manifold.global_height - 1.0);

                let id_str = format!("ENT_{}", entity_counter);
                entity_counter += 1;

                manifold.ids[manifold_idx] = id_str;
                manifold.masses[manifold_idx] = mass;
                manifold.tokens[manifold_idx] = token;
                manifold.centers_x[manifold_idx] = center_x;
                manifold.centers_y[manifold_idx] = center_y;
                manifold.spans_x[manifold_idx] = (max_x - min_x) + 1.0;
                manifold.spans_y[manifold_idx] = (max_y - min_y) + 1.0;

                let mut dest_tensor = manifold.get_tensor_mut(manifold_idx);
                dest_tensor.assign(&super_tensor);

                manifold_idx += 1;
            }
        }

        manifold.active_count = manifold_idx;
    }
}
