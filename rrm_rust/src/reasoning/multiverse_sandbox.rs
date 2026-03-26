use crate::core::entity_manifold::EntityManifold;
use crate::core::fhrr::FHRR;
use ndarray::Array1;

pub struct MultiverseSandbox {
    pub active_universes: usize,
}

impl Default for MultiverseSandbox {
    fn default() -> Self {
        Self::new()
    }
}

impl MultiverseSandbox {
    pub fn new() -> Self {
        Self {
            active_universes: 1, // Start with Universe 0
        }
    }

    /// Terapkan Dual-Axiom (Translasi Spasial + Mutasi Semantik + Geometri) ke Universe
    pub fn apply_axiom(
        u: &mut EntityManifold,
        condition_tensor: &Option<Array1<f32>>,
        delta_spatial: &Array1<f32>,
        delta_semantic: &Array1<f32>,
        delta_x: f32,
        delta_y: f32,
        physics_tier: u8,
        axiom_type: &str, // Digunakan untuk parsing operator geometri jika Tier 4
    ) {
        let base_abs_dx = delta_x.round();
        let base_abs_dy = delta_y.round();

        // Cari Objek Jangkar Relasional (Jika Tier 3)
        // Di Tier 3, delta_x berisi ID warna target (Target Color)
        let mut anchor_found = false;
        let mut anchor_cx = 0.0;
        let mut anchor_cy = 0.0;

        if physics_tier == 3 {
            let target_color = delta_x as i32;
            for a in 0..u.active_count {
                if u.masses[a] > 0.0 && u.tokens[a] == target_color {
                    anchor_cx = u.centers_x[a];
                    anchor_cy = u.centers_y[a];
                    anchor_found = true;
                    break; // Ambil jangkar pertama yang cocok (Naive Swarm anchor)
                }
            }
        }

        // Hitung bounding box universe jika ada operasi geometri
        let mut min_x = 9999.0;
        let mut max_x = -9999.0;
        let mut min_y = 9999.0;
        let mut max_y = -9999.0;

        if physics_tier == 4 {
            for e in 0..u.active_count {
                if u.masses[e] == 0.0 { continue; }
                let cx = u.centers_x[e];
                let cy = u.centers_y[e];
                if cx < min_x { min_x = cx; }
                if cx > max_x { max_x = cx; }
                if cy < min_y { min_y = cy; }
                if cy > max_y { max_y = cy; }
            }
        }

        for e in 0..u.active_count {
            if u.masses[e] == 0.0 {
                continue;
            }

            // QUANTUM IF-STATEMENT (Conditional Resonance)
            let mut matches_condition = true;
            if let Some(cond) = condition_tensor {
                let sem = u.get_semantic_tensor(e);
                let sim = FHRR::similarity(&sem, cond);
                if sim < 0.8 {
                    matches_condition = false;
                }
            }

            if matches_condition {
                let mut apply_dx = base_abs_dx;
                let mut apply_dy = base_abs_dy;

                // Hitung Dynamic Delta jika ini adalah Relational Move
                if physics_tier == 3 {
                    if anchor_found {
                        // Menuju Jangkar, kita asumsikan geser mendekat (misal -1 jika jangkar di atas)
                        // Untuk titik tepat sasaran, ini sangat heuristik, tapi kita coba:
                        apply_dx = anchor_cx - u.centers_x[e];
                        apply_dy = anchor_cy - u.centers_y[e];

                        // Batasi gerakan ke arah objek (jangan menimpa tepat di atasnya jika kita memindah ke sebelahnya)
                        // Biasanya di ARC gerakannya adalah 1 langkah sebelum nabrak.
                        if apply_dx > 0.0 { apply_dx -= 1.0; }
                        else if apply_dx < 0.0 { apply_dx += 1.0; }

                        if apply_dy > 0.0 { apply_dy -= 1.0; }
                        else if apply_dy < 0.0 { apply_dy += 1.0; }
                    } else {
                        // Jangkar tidak ditemukan di map ini, skip pergerakan.
                        continue;
                    }
                }

                // GEOMETRY TIER
                if physics_tier == 4 {
                    let cx = u.centers_x[e];
                    let cy = u.centers_y[e];
                    if axiom_type.contains("MIRROR_X") {
                        // Mirror horizontal: flip sumbu X
                        // x_baru = max_x - (cx - min_x)
                        u.centers_x[e] = max_x - (cx - min_x);
                    } else if axiom_type.contains("MIRROR_Y") {
                        u.centers_y[e] = max_y - (cy - min_y);
                    } else if axiom_type.contains("ROTATE_90") {
                        // Asumsi putar kanan terhadap center bbox
                        let center_x = (min_x + max_x) / 2.0;
                        let center_y = (min_y + max_y) / 2.0;
                        let rx = cx - center_x;
                        let ry = cy - center_y;
                        u.centers_x[e] = center_x - ry;
                        u.centers_y[e] = center_y + rx;
                    } else if axiom_type.contains("ROTATE_180") {
                        let center_x = (min_x + max_x) / 2.0;
                        let center_y = (min_y + max_y) / 2.0;
                        let rx = cx - center_x;
                        let ry = cy - center_y;
                        u.centers_x[e] = center_x - rx;
                        u.centers_y[e] = center_y - ry;
                    } else if axiom_type.contains("ROTATE_270") {
                        let center_x = (min_x + max_x) / 2.0;
                        let center_y = (min_y + max_y) / 2.0;
                        let rx = cx - center_x;
                        let ry = cy - center_y;
                        u.centers_x[e] = center_x + ry;
                        u.centers_y[e] = center_y - rx;
                    }

                    // Pastikan tetap bilangan bulat
                    u.centers_x[e] = u.centers_x[e].round();
                    u.centers_y[e] = u.centers_y[e].round();
                }

                // 1. Spasial Tensor Binding
                // Di Swarm, kita bypass Tensor math untuk kecepatan murni karena kita tidak pakai Macro Tensor.
                // Tapi kita tetep re-bind untuk konsistensi VSA.
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
                if physics_tier != 4 {
                    u.centers_x[e] += apply_dx;
                    u.centers_y[e] += apply_dy;
                }

                // MURNI UNTUK SWARM: Update token untuk Decoder
                // Karena kita langsung nge-print token dari list di decoder Swarm
                // Untuk POC ini kita override secara manual jika mutasi warna (tidak dipakai untuk translasi):
                if physics_tier == 0 && (delta_semantic[0] < 0.99 || delta_semantic[crate::core::config::GLOBAL_DIMENSION - 1] < 0.99) {
                    // Logic pembaruan warna token tidak tercover di sini tanpa Oracle Inverse.
                    // Biarkan kosong untuk POC Relasional Translation.
                }
            }
        }
    }
}
