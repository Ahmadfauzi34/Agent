use crate::core::entity_manifold::EntityManifold;
use crate::perception::universal_manifold::UniversalManifold;
use ndarray::Array1;
use std::collections::HashMap;

pub struct EntitySegmenter;

struct ParsedKey {
    x: usize,
    y: usize,
    token: i32,
}

impl EntitySegmenter {
    pub fn segment_stream(
        stream: &HashMap<String, (Array1<f32>, Array1<f32>)>, // Tuple: (GlobalSpatial, Semantic)
        manifold: &mut EntityManifold,
        _similarity_threshold: f32, // Tidak dipakai di Swarm (Tidak ada Clustering)
        perceiver: &UniversalManifold,
    ) {
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
        let mut manifold_idx = 0;

        // SWARM PARADIGM (1 Piksel = 1 Entitas Murni, 100% Lossless Phase).
        // Tidak ada lagi Clustering/Bundling Makroskopis.
        // Kita meruntuhkan ilusi bentuk abstrak, karena ARC mensyaratkan Pixel-Perfect Precision.

        for (key, (spatial_tensor, semantic_tensor)) in stream.iter() {
            let parsed = parse_key(key);
            global_width = usize::max(global_width, parsed.x + 1);
            global_height = usize::max(global_height, parsed.y + 1);

            if manifold_idx >= crate::core::config::MAX_ENTITIES {
                println!("[Rust EntitySegmenter] Warning: MAX_ENTITIES limit reached.");
                break;
            }

            let abs_cx = parsed.x as f32;
            let abs_cy = parsed.y as f32;

            manifold.ids[manifold_idx] = format!("PX_{}", entity_counter);
            entity_counter += 1;

            manifold.masses[manifold_idx] = 1.0; // Tiap piksel punya massa 1
            manifold.tokens[manifold_idx] = parsed.token;
            manifold.centers_x[manifold_idx] = abs_cx;
            manifold.centers_y[manifold_idx] = abs_cy;

            // Bentang benda ini adalah 1 Piksel murni
            manifold.spans_x[manifold_idx] = 1.0;
            manifold.spans_y[manifold_idx] = 1.0;

            // Simpan Tensor Global Center
            let mut dest_sp = manifold.get_spatial_tensor_mut(manifold_idx);
            dest_sp.assign(spatial_tensor);

            // Simpan Holographic Shape (Piksel ini berbentuk titik di (0,0) lokalnya)
            // Relatifnya ke dirinya sendiri = (0.0, 0.0)
            let local_shape = perceiver.build_local_shape_tensor(0.0, 0.0);
            let mut dest_shape = manifold.get_shape_tensor_mut(manifold_idx);
            dest_shape.assign(&local_shape);

            // Simpan Warna
            let mut dest_sem = manifold.get_semantic_tensor_mut(manifold_idx);
            dest_sem.assign(semantic_tensor);

            manifold_idx += 1;
        }

        manifold.global_width = global_width as f32;
        manifold.global_height = global_height as f32;
        manifold.active_count = manifold_idx;
    }
}
