use crate::core::entity_manifold::EntityManifold;
use crate::core::fhrr::FHRR;
use ndarray::Array1;
use std::sync::Arc;

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
        // 🌟 FISIKA TIER 8: REKURSI MACRO (Interpreter Siklus Otot/Skill) 🌟
        if physics_tier == 8 {
            if axiom_type == "MACRO:EXTRACT_ANOMALY" {
                // native fallback logic from extract_anomalous_quadrant
                let temp = crate::perception::anomalous_extractor::extract_anomalous_quadrant(u);

                // apply changes in-place to u to mutate current universe branch
                u.active_count = temp.active_count;
                u.global_width = temp.global_width;
                u.global_height = temp.global_height;

                let mut cow_mut = None;
                if let Some(ref mut c) = u.cow_grid {
                    // Update cow dimensions, maybe just wipe it to None and sync_to_cow later
                    cow_mut = Some(c.clone()); // just a dummy, let sync_to_cow handle it natively later
                }
                u.cow_grid = None;

                let mut sp_mut = std::sync::Arc::make_mut(&mut u.spatial_tensors);
                let mut sh_mut = std::sync::Arc::make_mut(&mut u.shape_tensors);
                let mut se_mut = std::sync::Arc::make_mut(&mut u.semantic_tensors);

                sp_mut.clear(); sp_mut.extend(temp.spatial_tensors.iter());
                sh_mut.clear(); sh_mut.extend(temp.shape_tensors.iter());
                se_mut.clear(); se_mut.extend(temp.semantic_tensors.iter());

                let mut id_mut = std::sync::Arc::make_mut(&mut u.ids);
                let mut ma_mut = std::sync::Arc::make_mut(&mut u.masses);
                let mut to_mut = std::sync::Arc::make_mut(&mut u.tokens);
                let mut sx_mut = std::sync::Arc::make_mut(&mut u.spans_x);
                let mut sy_mut = std::sync::Arc::make_mut(&mut u.spans_y);
                let mut cx_mut = std::sync::Arc::make_mut(&mut u.centers_x);
                let mut cy_mut = std::sync::Arc::make_mut(&mut u.centers_y);

                id_mut.clear(); id_mut.extend(temp.ids.iter().cloned());
                ma_mut.clear(); ma_mut.extend(temp.masses.iter());
                to_mut.clear(); to_mut.extend(temp.tokens.iter());
                sx_mut.clear(); sx_mut.extend(temp.spans_x.iter());
                sy_mut.clear(); sy_mut.extend(temp.spans_y.iter());
                cx_mut.clear(); cx_mut.extend(temp.centers_x.iter());
                cy_mut.clear(); cy_mut.extend(temp.centers_y.iter());

                return;
            }

            if let Some(macro_content) = axiom_type.strip_prefix("MACRO:") {
                let sub_axioms: Vec<&str> = macro_content.split('|').collect();
                for sub_axiom_str in sub_axioms {
                    // Heuristik parsing tier
                    let sub_tier = match sub_axiom_str {
                        s if s.contains("CROP") => 7,
                        s if s.contains("SPAWN") || s.contains("FILL") => 6,
                        s if s.contains("ROTATE") || s.contains("MIRROR") => 4,
                        s if s.contains("MOVE_TO") => 3,
                        _ => 0,
                    };

                    Self::apply_axiom(
                        u,
                        condition_tensor,
                        delta_spatial,
                        delta_semantic,
                        delta_x,
                        delta_y,
                        sub_tier,
                        sub_axiom_str,
                    );
                }
            }
            return;
        }

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

        // TIER 6: SPAWN / FILL (Membangkitkan Dark Matter)
        // Kita tangani SPAWN sebelum loop update reguler agar partikel baru tidak ter-update dua kali.
        if physics_tier == 6 && axiom_type.contains("SPAWN") {
            // Karena ini adalah "Create", `delta_x` dan `delta_y` menyimpan koordinat relatif
            // berdasarkan bounding box. Untuk saat ini kita asumsikan SPAWN mengisi seluruh BBox.
            // BBox kita cari dari kondisi (Warna tertentu). Jika tanpa kondisi, error.
            if let Some(cond) = condition_tensor {
                let mut min_x = 9999.0;
                let mut max_x = -9999.0;
                let mut min_y = 9999.0;
                let mut max_y = -9999.0;
                let mut found = false;

                // 1. Temukan bounding box dari target (anchor)
                for e in 0..u.active_count {
                    if u.masses[e] == 0.0 {
                        continue;
                    }
                    let sem = u.get_semantic_tensor(e);
                    if FHRR::similarity(&sem, cond) >= 0.8 {
                        found = true;
                        let cx = u.centers_x[e];
                        let cy = u.centers_y[e];
                        if cx < min_x {
                            min_x = cx;
                        }
                        if cx > max_x {
                            max_x = cx;
                        }
                        if cy < min_y {
                            min_y = cy;
                        }
                        if cy > max_y {
                            max_y = cy;
                        }
                    }
                }

                // 2. Bangkitkan Dark Matter di setiap titik dalam kotak BBox tersebut
                if found {
                    let min_xi = min_x.round() as i32;
                    let max_xi = max_x.round() as i32;
                    let min_yi = min_y.round() as i32;
                    let max_yi = max_y.round() as i32;

                    let target_color = delta_x as i32; // Warna target di simpan di delta_x
                    let new_sem_tensor = FHRR::fractional_bind(
                        &crate::core::core_seeds::CoreSeeds::color_seed(),
                        target_color as f32,
                    );

                    for spawn_y in min_yi..=max_yi {
                        for spawn_x in min_xi..=max_xi {
                            // Cek apakah posisi ini sudah terisi (jangan timpa)
                            let mut occupied = false;
                            for e in 0..u.active_count {
                                if u.masses[e] > 0.0
                                    && (u.centers_x[e] - spawn_x as f32).abs() < 0.1
                                    && (u.centers_y[e] - spawn_y as f32).abs() < 0.1
                                {
                                    occupied = true;
                                    break;
                                }
                            }

                            if !occupied {
                                // Temukan slot Dark Matter pertama atau spawn baru secara dinamis
                                let mut dm_idx = u.active_count;
                                // Loop until we find mass == 0.0 (if any)
                                for m_idx in 0..u.active_count {
                                    if u.masses[m_idx] == 0.0 {
                                        dm_idx = m_idx;
                                        break;
                                    }
                                }

                                u.ensure_scalar_capacity(dm_idx + 1);

                                // Bangkitkan!
                                Arc::make_mut(&mut u.masses)[dm_idx] = 1.0;
                                Arc::make_mut(&mut u.centers_x)[dm_idx] = spawn_x as f32;
                                Arc::make_mut(&mut u.centers_y)[dm_idx] = spawn_y as f32;
                                Arc::make_mut(&mut u.tokens)[dm_idx] = target_color;

                                // Update Tensors
                                let mut sem_tensor = u.get_semantic_tensor_mut(dm_idx);
                                sem_tensor.assign(&new_sem_tensor);

                                if dm_idx >= u.active_count {
                                    u.active_count = dm_idx + 1;
                                }
                            }
                        }
                    }
                }
            }
            // Karena ini operasi SPAWN murni, kita bisa langsung return dari fungsi.
            return;
        }

        // 🌟 FISIKA TIER 7: CROP / PEMOTONGAN DIMENSI (FULL OPTIMIZED) 🌟
        if physics_tier == 7 {
            let mut min_x = 0.0;
            let mut max_x = 0.0;
            let mut min_y = 0.0;
            let mut max_y = 0.0;
            let mut target_w = 0.0;
            let mut target_h = 0.0;
            let mut found = false;

            // 1. Evaluasi logika Bounding-Box atau Anchor-Window untuk mendapatkan min_x, max_x, dsb.
            if axiom_type.starts_with("CROP_WINDOW_AROUND(") {
                let start = axiom_type.find('(').unwrap() + 1;
                let end = axiom_type.find(')').unwrap();
                let anchor_color = axiom_type[start..end].parse::<i32>().unwrap_or(-1);

                // Dikte ukuran (Opsi A) dipatuhi oleh Sandbox dari `delta_x/y`
                target_w = delta_x;
                target_h = delta_y;

                if anchor_color != -1 {
                    // Cari Center of Mass dari Jangkar (Anchor)
                    let mut sum_x = 0.0;
                    let mut sum_y = 0.0;
                    let mut count = 0.0;

                    for e in 0..u.active_count {
                        if u.masses[e] > 0.0 && u.tokens[e] == anchor_color {
                            sum_x += u.centers_x[e];
                            sum_y += u.centers_y[e];
                            count += 1.0;
                        }
                    }

                    if count > 0.0 {
                        found = true;
                        let anchor_cx = (sum_x / count).round();
                        let anchor_cy = (sum_y / count).round();

                        // Pusatkan jendela (Window) baru ini mengitari titik anchor sesuai ukuran kognitif (Oracle)
                        min_x = (anchor_cx - (target_w / 2.0)).floor();
                        min_y = (anchor_cy - (target_h / 2.0)).floor();

                        // Opsional: cegah out-of-bounds negatif
                        if min_x < 0.0 {
                            min_x = 0.0;
                        }
                        if min_y < 0.0 {
                            min_y = 0.0;
                        }

                        max_x = min_x + target_w - 1.0;
                        max_y = min_y + target_h - 1.0;
                    }
                }
            } else if axiom_type.starts_with("CROP_TO_QUADRANT_") {
                let mode = "ANCHOR_COG"; // We default to Anchor CoG for task 2dc579da
                let mut mask: u8 = 0;

                if axiom_type.contains("_TL") {
                    mask |= 0b0001;
                }
                if axiom_type.contains("_TR") {
                    mask |= 0b0010;
                }
                if axiom_type.contains("_BL") {
                    mask |= 0b0100;
                }
                if axiom_type.contains("_BR") {
                    mask |= 0b1000;
                }

                // Extract anchor color if provided e.g. CROP_TO_QUADRANT_TL_2
                let parts: Vec<&str> = axiom_type.split('_').collect();
                let anchor_color = if parts.len() > 4 {
                    parts[4].parse::<i32>().unwrap_or(0)
                } else {
                    0
                };

                Self::crop_to_quadrant(u, anchor_color, mask, mode, 0.0);
                return;
            } else if axiom_type.starts_with("CROP_TO_COLOR(") {
                let start = axiom_type.find('(').unwrap() + 1;
                let end = axiom_type.find(')').unwrap();
                let target_color = axiom_type[start..end].parse::<i32>().unwrap_or(-1);

                if target_color != -1 {
                    min_x = 9999.0;
                    max_x = -9999.0;
                    min_y = 9999.0;
                    max_y = -9999.0;

                    for e in 0..u.active_count {
                        if u.masses[e] > 0.0 && u.tokens[e] == target_color {
                            found = true;
                            let cx = u.centers_x[e];
                            let cy = u.centers_y[e];
                            if cx < min_x {
                                min_x = cx;
                            }
                            if cx > max_x {
                                max_x = cx;
                            }
                            if cy < min_y {
                                min_y = cy;
                            }
                            if cy > max_y {
                                max_y = cy;
                            }
                        }
                    }

                    if found {
                        // Presisi Mutlak (Mencegah Floating Point Trap)
                        let new_w = (max_x - min_x).round() + 1.0;
                        let new_h = (max_y - min_y).round() + 1.0;

                        // Update dimensi kosmos
                        u.global_width = new_w;
                        u.global_height = new_h;

                        let x_seed = crate::core::core_seeds::CoreSeeds::x_axis_seed().clone();
                        let y_seed = crate::core::core_seeds::CoreSeeds::y_axis_seed().clone();

                        // Translasi seluruh entitas (menjadikan min_x dan min_y sebagai titik 0,0)
                        for e in 0..u.active_count {
                            if u.masses[e] > 0.0 {
                                let nx = (u.centers_x[e] - min_x).round();
                                let ny = (u.centers_y[e] - min_y).round();

                                // 🌟 ANNIHILASI DEBRIS KOSMIK & Sinkronisasi Tensor 🌟
                                if nx >= 0.0 && nx < new_w && ny >= 0.0 && ny < new_h {
                                    Arc::make_mut(&mut u.centers_x)[e] = nx;
                                    Arc::make_mut(&mut u.centers_y)[e] = ny;

                                    let new_spatial_tensor =
                                        FHRR::fractional_bind_2d(&x_seed, nx, &y_seed, ny);

                                    let mut sp_tensor_mut = u.get_spatial_tensor_mut(e);
                                    sp_tensor_mut.assign(&new_spatial_tensor);
                                } else {
                                    Arc::make_mut(&mut u.masses)[e] = 0.0; // Hancurkan
                                }
                            }
                        }
                    }
                }
            }
            return;
        }

        // Hitung bounding box universe jika ada operasi geometri
        let mut min_x = 9999.0;
        let mut max_x = -9999.0;
        let mut min_y = 9999.0;
        let mut max_y = -9999.0;

        if physics_tier == 4 {
            for e in 0..u.active_count {
                if u.masses[e] == 0.0 {
                    continue;
                }
                let cx = u.centers_x[e];
                let cy = u.centers_y[e];
                if cx < min_x {
                    min_x = cx;
                }
                if cx > max_x {
                    max_x = cx;
                }
                if cy < min_y {
                    min_y = cy;
                }
                if cy > max_y {
                    max_y = cy;
                }
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
                        if apply_dx > 0.0 {
                            apply_dx -= 1.0;
                        } else if apply_dx < 0.0 {
                            apply_dx += 1.0;
                        }

                        if apply_dy > 0.0 {
                            apply_dy -= 1.0;
                        } else if apply_dy < 0.0 {
                            apply_dy += 1.0;
                        }
                    } else {
                        // Jangkar tidak ditemukan di map ini, skip pergerakan.
                        continue;
                    }
                }

                // TIER 5: ANNIHILATION (DESTROY)
                // Mengembalikan partikel ke dalam Dark Matter
                if physics_tier == 5 && axiom_type.contains("ERASE") {
                    Arc::make_mut(&mut u.masses)[e] = 0.0;
                    // Lanjutkan ke entitas berikutnya, tidak perlu binding.
                    continue;
                }

                // GEOMETRY TIER
                if physics_tier == 4 {
                    let cx = u.centers_x[e];
                    let cy = u.centers_y[e];
                    if axiom_type.contains("MIRROR_X") {
                        // Mirror horizontal: flip sumbu X
                        // x_baru = max_x - (cx - min_x)
                        Arc::make_mut(&mut u.centers_x)[e] = max_x - (cx - min_x);
                    } else if axiom_type.contains("MIRROR_Y") {
                        Arc::make_mut(&mut u.centers_y)[e] = max_y - (cy - min_y);
                    } else if axiom_type.contains("ROTATE_90") {
                        // Asumsi putar kanan terhadap center bbox
                        let center_x = (min_x + max_x) / 2.0;
                        let center_y = (min_y + max_y) / 2.0;
                        let rx = cx - center_x;
                        let ry = cy - center_y;
                        Arc::make_mut(&mut u.centers_x)[e] = center_x - ry;
                        Arc::make_mut(&mut u.centers_y)[e] = center_y + rx;
                    } else if axiom_type.contains("ROTATE_180") {
                        let center_x = (min_x + max_x) / 2.0;
                        let center_y = (min_y + max_y) / 2.0;
                        let rx = cx - center_x;
                        let ry = cy - center_y;
                        Arc::make_mut(&mut u.centers_x)[e] = center_x - rx;
                        Arc::make_mut(&mut u.centers_y)[e] = center_y - ry;
                    } else if axiom_type.contains("ROTATE_270") {
                        let center_x = (min_x + max_x) / 2.0;
                        let center_y = (min_y + max_y) / 2.0;
                        let rx = cx - center_x;
                        let ry = cy - center_y;
                        Arc::make_mut(&mut u.centers_x)[e] = center_x + ry;
                        Arc::make_mut(&mut u.centers_y)[e] = center_y - rx;
                    }

                    // Pastikan tetap bilangan bulat
                    Arc::make_mut(&mut u.centers_x)[e] = u.centers_x[e].round();
                    Arc::make_mut(&mut u.centers_y)[e] = u.centers_y[e].round();
                }

                // 1. Spasial Tensor Binding
                // Mengkonversi Tensor FHRR murni menjadi "Physical Hands" / translasi absolut
                let mut sp_tensor = u.get_spatial_tensor_mut(e);
                let original_sp = sp_tensor.to_owned();
                let future_sp = FHRR::bind(&original_sp, delta_spatial);
                sp_tensor.assign(&future_sp);

                // 2. Semantik Tensor Binding
                let mut sem_tensor = u.get_semantic_tensor_mut(e);
                let original_sem = sem_tensor.to_owned();
                let future_sem = FHRR::bind(&original_sem, delta_semantic);
                sem_tensor.assign(&future_sem);

                // 3. Menghubungkan FHRR murni dengan Grid Fisik (Scalar Momentum)
                if physics_tier != 4 {
                    // Jika Axiom ini merupakan hasil dari Quantum Synthesis (maka akan punya delta_x/delta_y), kita gunakan nilainya:
                    let real_dx = if delta_x != 0.0 {
                        delta_x.round()
                    } else {
                        apply_dx
                    };
                    let real_dy = if delta_y != 0.0 {
                        delta_y.round()
                    } else {
                        apply_dy
                    };

                    Arc::make_mut(&mut u.centers_x)[e] += real_dx;
                    Arc::make_mut(&mut u.centers_y)[e] += real_dy;
                }

                // MURNI UNTUK SWARM: Update token untuk Decoder
                // Karena kita langsung nge-print token dari list di decoder Swarm
                // Untuk POC ini kita override secara manual jika mutasi warna (tidak dipakai untuk translasi):
                if physics_tier == 0
                    && (delta_semantic[0] < 0.99
                        || delta_semantic[crate::core::config::GLOBAL_DIMENSION - 1] < 0.99)
                {
                    // Logic pembaruan warna token tidak tercover di sini tanpa Oracle Inverse.
                    // Biarkan kosong untuk POC Relasional Translation.
                }
            }
        }
    }

    // === Tier 7.5: QUADRANT CROP SYSTEM (Hukum 2, 4, 5, 6) ===
    pub fn crop_to_quadrant(
        u: &mut EntityManifold,
        anchor_color: i32,
        quadrant_mask: u8,
        mode: &str,
        _padding: f32,
    ) {
        let mut pivot_x = 0.0;
        let mut pivot_y = 0.0;
        let mut _density_w = u.global_width;
        let mut _density_h = u.global_height;

        if mode == "ANCHOR_COG" {
            let mut sum_x = 0.0f32;
            let mut sum_y = 0.0f32;
            let mut count = 0.0f32;

            for e in 0..u.active_count {
                let is_target = if u.tokens[e] == anchor_color && u.masses[e] > 0.0 {
                    1.0
                } else {
                    0.0
                };
                sum_x += u.centers_x[e] * is_target;
                sum_y += u.centers_y[e] * is_target;
                count += is_target;
            }

            let inv_count = 1.0 / (count + 1e-15);
            pivot_x = sum_x * inv_count;
            pivot_y = sum_y * inv_count;

            let mut max_dx = 0.0f32;
            let mut max_dy = 0.0f32;
            for e in 0..u.active_count {
                let is_target = if u.tokens[e] == anchor_color && u.masses[e] > 0.0 {
                    1.0
                } else {
                    0.0
                };
                let dx = (u.centers_x[e] - pivot_x).abs();
                let dy = (u.centers_y[e] - pivot_y).abs();
                if is_target > 0.0 {
                    max_dx = if dx > max_dx { dx } else { max_dx };
                    max_dy = if dy > max_dy { dy } else { max_dy };
                }
            }
            _density_w = max_dx * 2.0;
            _density_h = max_dy * 2.0;
        } else if mode == "DENSITY" {
            let mut min_x = 9999.0f32;
            let mut max_x = -9999.0f32;
            let mut min_y = 9999.0f32;
            let mut max_y = -9999.0f32;

            for e in 0..u.active_count {
                let active = if u.masses[e] > 0.0 { 1.0 } else { 0.0 };
                let cx = u.centers_x[e];
                let cy = u.centers_y[e];
                if active > 0.0 {
                    min_x = if cx < min_x { cx } else { min_x };
                    max_x = if cx > max_x { cx } else { max_x };
                    min_y = if cy < min_y { cy } else { min_y };
                    max_y = if cy > max_y { cy } else { max_y };
                }
            }

            pivot_x = (min_x + max_x) * 0.5;
            pivot_y = (min_y + max_y) * 0.5;
            _density_w = max_x - min_x;
            _density_h = max_y - min_y;
        } else {
            pivot_x = u.global_width * 0.5;
            pivot_y = u.global_height * 0.5;
        }

        let mut q_min_x = -9999.0f32;
        let mut q_max_x = 9999.0f32;
        let mut q_min_y = -9999.0f32;
        let mut q_max_y = 9999.0f32;

        let has_left = if (quadrant_mask & 0b0101) != 0 {
            1.0
        } else {
            0.0
        };
        let has_right = if (quadrant_mask & 0b1010) != 0 {
            1.0
        } else {
            0.0
        };
        let left_only = has_left * (1.0 - has_right);
        let right_only = has_right * (1.0 - has_left);

        q_max_x = if left_only > 0.5 { pivot_x } else { q_max_x };
        q_min_x = if right_only > 0.5 { pivot_x } else { q_min_x };

        let has_top = if (quadrant_mask & 0b0011) != 0 {
            1.0
        } else {
            0.0
        };
        let has_bottom = if (quadrant_mask & 0b1100) != 0 {
            1.0
        } else {
            0.0
        };
        let top_only = has_top * (1.0 - has_bottom);
        let bottom_only = has_bottom * (1.0 - has_top);

        q_max_y = if top_only > 0.5 { pivot_y } else { q_max_y };
        q_min_y = if bottom_only > 0.5 { pivot_y } else { q_min_y };

        let actual_min_x = if q_min_x < 0.0 { 0.0 } else { q_min_x };
        let actual_min_y = if q_min_y < 0.0 { 0.0 } else { q_min_y };
        let actual_max_x = if q_max_x > u.global_width {
            u.global_width
        } else {
            q_max_x
        };
        let actual_max_y = if q_max_y > u.global_height {
            u.global_height
        } else {
            q_max_y
        };

        let new_w = (actual_max_x - actual_min_x).round().max(1.0);
        let new_h = (actual_max_y - actual_min_y).round().max(1.0);

        u.global_width = new_w;
        u.global_height = new_h;

        let x_seed = crate::core::core_seeds::CoreSeeds::x_axis_seed().clone();
        let y_seed = crate::core::core_seeds::CoreSeeds::y_axis_seed().clone();

        for e in 0..u.active_count {
            if u.masses[e] == 0.0 {
                continue;
            }
            let cx = u.centers_x[e];
            let cy = u.centers_y[e];

            let inside_x = if cx >= q_min_x && cx <= q_max_x {
                1.0
            } else {
                0.0
            };
            let inside_y = if cy >= q_min_y && cy <= q_max_y {
                1.0
            } else {
                0.0
            };
            let inside = inside_x * inside_y;

            Arc::make_mut(&mut u.masses)[e] *= inside;

            if inside > 0.5 {
                let nx = (cx - actual_min_x).round();
                let ny = (cy - actual_min_y).round();
                Arc::make_mut(&mut u.centers_x)[e] = nx;
                Arc::make_mut(&mut u.centers_y)[e] = ny;

                let new_spatial_tensor =
                    crate::core::fhrr::FHRR::fractional_bind_2d(&x_seed, nx, &y_seed, ny);
                let mut sp_tensor = u.get_spatial_tensor_mut(e);
                sp_tensor.assign(&new_spatial_tensor);
            }
        }
        u.sync_to_cow();
    }
}
