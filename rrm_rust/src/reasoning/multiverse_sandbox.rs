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
                    if u.masses[e] == 0.0 { continue; }
                    let sem = u.get_semantic_tensor(e);
                    if FHRR::similarity(&sem, cond) >= 0.8 {
                        found = true;
                        let cx = u.centers_x[e];
                        let cy = u.centers_y[e];
                        if cx < min_x { min_x = cx; }
                        if cx > max_x { max_x = cx; }
                        if cy < min_y { min_y = cy; }
                        if cy > max_y { max_y = cy; }
                    }
                }

                // 2. Bangkitkan Dark Matter di setiap titik dalam kotak BBox tersebut
                if found {
                    let min_xi = min_x.round() as i32;
                    let max_xi = max_x.round() as i32;
                    let min_yi = min_y.round() as i32;
                    let max_yi = max_y.round() as i32;

                    let target_color = delta_x as i32; // Warna target di simpan di delta_x
                    let new_sem_tensor = FHRR::fractional_bind(&crate::core::core_seeds::CoreSeeds::color_seed(), target_color as f32);

                    for spawn_y in min_yi..=max_yi {
                        for spawn_x in min_xi..=max_xi {
                            // Cek apakah posisi ini sudah terisi (jangan timpa)
                            let mut occupied = false;
                            for e in 0..u.active_count {
                                if u.masses[e] > 0.0
                                    && (u.centers_x[e] - spawn_x as f32).abs() < 0.1
                                    && (u.centers_y[e] - spawn_y as f32).abs() < 0.1 {
                                    occupied = true;
                                    break;
                                }
                            }

                            if !occupied {
                                // Temukan slot Dark Matter pertama
                                let mut dm_idx = u.active_count;
                                // Exception Rule: Loop until we find mass == 0.0 or hit capacity
                                for m_idx in 0..crate::core::config::MAX_ENTITIES {
                                    if u.masses[m_idx] == 0.0 {
                                        dm_idx = m_idx;
                                        break;
                                    }
                                }

                                if dm_idx < crate::core::config::MAX_ENTITIES {
                                    // Bangkitkan!
                                    u.masses[dm_idx] = 1.0;
                                    u.centers_x[dm_idx] = spawn_x as f32;
                                    u.centers_y[dm_idx] = spawn_y as f32;
                                    u.tokens[dm_idx] = target_color;

                                    // Update Tensors
                                    let mut sem_tensor = u.get_semantic_tensor_mut(dm_idx);
                                    sem_tensor.assign(&new_sem_tensor);

                                    // Spatial Tensor di-assign Identity sementara (Karena True Swarm hanya baca center)
                                    // Atau idealnya bisa di-generate via UniversalManifold, tapi MCTS di Rust tidak
                                    // perlu tensor spasial persis jika decoder collapse via `centers_x/y`.

                                    if dm_idx >= u.active_count {
                                        u.active_count = dm_idx + 1;
                                    }
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
            let mut min_x = 0.0; let mut max_x = 0.0;
            let mut min_y = 0.0; let mut max_y = 0.0;
            let mut target_w = 0.0; let mut target_h = 0.0;
            let mut found = false;

            // 1. Evaluasi logika Bounding-Box atau Anchor-Window untuk mendapatkan min_x, max_x, dsb.
            if axiom_type.starts_with("CROP_WINDOW_AROUND(") {
                let start = axiom_type.find('(').unwrap() + 1;
                let end = axiom_type.find(')').unwrap();
                let anchor_color = axiom_type[start..end].parse::<i32>().unwrap_or(-1);

                target_w = delta_x;
                target_h = delta_y;

                if anchor_color != -1 {
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

                        min_x = (anchor_cx - (target_w / 2.0)).floor();
                        min_y = (anchor_cy - (target_h / 2.0)).floor();

                        if min_x < 0.0 { min_x = 0.0; }
                        if min_y < 0.0 { min_y = 0.0; }

                        max_x = min_x + target_w - 1.0;
                        max_y = min_y + target_h - 1.0;
                    }
                }
            } else if axiom_type.starts_with("CROP_TO_COLOR(") {
                let start = axiom_type.find('(').unwrap() + 1;
                let end = axiom_type.find(')').unwrap();
                let target_color = axiom_type[start..end].parse::<i32>().unwrap_or(-1);

                if target_color != -1 {
                    min_x = 9999.0; max_x = -9999.0;
                    min_y = 9999.0; max_y = -9999.0;

                    for e in 0..u.active_count {
                        if u.masses[e] > 0.0 && u.tokens[e] == target_color {
                            found = true;
                            let cx = u.centers_x[e];
                            let cy = u.centers_y[e];
                            if cx < min_x { min_x = cx; }
                            if cx > max_x { max_x = cx; }
                            if cy < min_y { min_y = cy; }
                            if cy > max_y { max_y = cy; }
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
                                    u.centers_x[e] = nx;
                                    u.centers_y[e] = ny;

                                    let new_x_phase = FHRR::fractional_bind(&x_seed, nx);
                                    let new_y_phase = FHRR::fractional_bind(&y_seed, ny);
                                    let new_spatial_tensor = FHRR::bind(&new_x_phase, &new_y_phase);

                                    let mut sp_tensor_mut = u.get_spatial_tensor_mut(e);
                                    sp_tensor_mut.assign(&new_spatial_tensor);
                                } else {
                                    u.masses[e] = 0.0; // Hancurkan
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

                // TIER 5: ANNIHILATION (DESTROY)
                // Mengembalikan partikel ke dalam Dark Matter
                if physics_tier == 5 && axiom_type.contains("ERASE") {
                    u.masses[e] = 0.0;
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
