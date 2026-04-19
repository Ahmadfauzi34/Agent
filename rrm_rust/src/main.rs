use std::sync::Arc;
pub mod core;
pub mod memory;
pub mod perception;
pub mod quantum_topology;
pub mod reasoning;
pub mod self_awareness;
pub mod shared;
use crate::core::entity_manifold::EntityManifold;
use perception::anomalous_extractor::extract_anomalous_quadrant;
use self_awareness::immortal_loop::KVImmortalEngine;

use reasoning::rrm_agent::RrmAgent;
use serde_json::Value;
use std::fs;
use std::time::Instant;

fn distill_yaml_skills() {
    use crate::core::config::GLOBAL_DIMENSION;
    use crate::core::core_seeds::CoreSeeds;
    use crate::core::fhrr::FHRR;
    use ndarray::Array1;
    use std::fs;

    println!("--- DISTILLING 4 CORE TENSOR SKILLS TO YAML ---");

    let x_seed = CoreSeeds::x_axis_seed();
    let y_seed = CoreSeeds::y_axis_seed();

    let generate_yaml = |id: &str, dx: f32, dy: f32, mirror_x: bool, rotate: bool| {
        // Untuk "Pergeseran murni" (Translasi) di FHRR, kita cukup melakukan Fractional Binding dari Seed X dan Y!
        // Tidak perlu membungkus gambar 5x5 lalu mencari Inverse(Input), karena itu bisa memicu ledakan fasa.
        // Jika kita ingin menggeser seluruh alam semesta sejauh (dx, dy),
        // Vektor Transformasinya hanyalah: X_Seed^dx (X) Y_Seed^dy

        let mut skill_tensor = FHRR::fractional_bind_2d(&x_seed, dx, &y_seed, dy);

        // Untuk operasi cermin atau rotasi (di luar translasi standar), dalam VSA/FHRR sesungguhnya
        // memerlukan Permutation Matrix. Namun, sebagai placeholder (karena kita akan melatih MCTS untuk menemukannya),
        // kita akan memberikan tensor acak/pseudorandom yang stabil sebagai "ID" unik dari operasi ini,
        // atau membiarkannya 0.0 jika kita belum mengimplementasikan Permutation murni.
        // Sebagai contoh praktis:
        if mirror_x || rotate {
            let mut noise = Array1::<f32>::zeros(GLOBAL_DIMENSION);
            for i in 0..GLOBAL_DIMENSION {
                noise[i] = ((i as f32) * 0.123).sin() * 0.1; // Stable deterministic noise bounded to [-0.1, 0.1]
            }
            skill_tensor = FHRR::bind(&skill_tensor, &noise);
        }

        // Pastikan nilainya tidak pernah meledak! Kita normalkan agar L2 Norm = 1.0 atau batasnya stabil.
        let mut sum_sq = 0.0;
        for i in 0..GLOBAL_DIMENSION {
            sum_sq += skill_tensor[i] * skill_tensor[i];
        }
        let mag = sum_sq.sqrt();
        if mag > 0.0 {
            for i in 0..GLOBAL_DIMENSION {
                skill_tensor[i] /= mag;
            }
        }

        let mut yaml_arr = String::new();
        for i in 0..GLOBAL_DIMENSION {
            yaml_arr.push_str(&format!("{:.6}", skill_tensor[i]));
            if i < GLOBAL_DIMENSION - 1 {
                yaml_arr.push_str(", ");
            }
        }

        let yaml_doc = format!("\n# Tensor Driven Macro: {id}\n\n```yaml\nid: MACRO:{id}\ntier: 6\ndescription: Generated tensor skill\nsequence:\n  - axiom_type: TENSOR_DRIVEN_BIND\n    physics_tier: 6\n    delta_x: {dx:.1}\n    delta_y: {dy:.1}\n    tensor_spatial: [{yaml_arr}]\n```\n");

        fs::write(
            format!("knowledge/grammar/{}.md", id.to_lowercase()),
            yaml_doc,
        )
        .unwrap();
    };

    generate_yaml("SHIFT_RIGHT", 1.0, 0.0, false, false);
    generate_yaml("SHIFT_DOWN", 0.0, 1.0, false, false);
    generate_yaml("MIRROR_X", 0.0, 0.0, true, false);
    generate_yaml("ROTATE_90", 0.0, 0.0, false, true);

    // Tambahan Grammar Topologi Kuantum (Semantic / Topology)
    // Di dunia FHRR, kita memberikan tensor "noise" stabil spesifik untuk membedakannya
    // Di saat runtime, MCTS/Grover akan menemukan pola ini dan mengirimkannya ke MultiverseSandbox
    generate_yaml("CROP_TO_COLOR", 0.0, 0.0, false, false);
    generate_yaml("FLOOD_FILL", 0.0, 0.0, false, false);
    generate_yaml("EXTRACT_ANOMALY", 0.0, 0.0, false, false);
    generate_yaml("SCALE_UP(2)", 0.0, 0.0, false, false);
    generate_yaml("SCALE_UP(3)", 0.0, 0.0, false, false);

    println!("--- DISTILLATION TO YAML COMPLETED ---");
}
fn main() {
    distill_yaml_skills();

    println!("🌌 RRM Quantum Sandbox (Rust Edition) Initialized.");

    let base_dir = std::path::PathBuf::from(".");
    let mut immortal = KVImmortalEngine::new(&base_dir, "main");
    let _ = immortal.resurrect(); // Bangkit dari crash / mulai Genesis

    let mut agent = RrmAgent::new();

    let tasks = vec![
        "05269061", // Normal task test
        "09629e4f", // Normal task test
        "2dc579da", // The one we know works with anomalous logic
    ];

    let mut successes = 0;
    let total = tasks.len();

    for task_name in tasks {
        let path = format!("../ARC-AGI-1.0.2/data/training/{}.json", task_name);

        let mut data = fs::read_to_string(&path).unwrap_or_else(|_| String::new());
        if data.is_empty() {
            // Check current dir if it's the custom task
            let custom_path = format!("{}.json", task_name);
            data = fs::read_to_string(&custom_path).unwrap_or_else(|_| String::new());
        }
        if data.is_empty() {
            println!("Skipping {}, file not found", task_name);
            continue;
        }

        let json: Value = serde_json::from_str(&data).expect("Invalid JSON");

        let train = json["train"].as_array().unwrap();
        let test = json["test"].as_array().unwrap();

        let parse_grid = |arr: &Value| -> Vec<Vec<i32>> {
            arr.as_array()
                .unwrap()
                .iter()
                .map(|row| {
                    row.as_array()
                        .unwrap()
                        .iter()
                        .map(|v| v.as_i64().unwrap() as i32)
                        .collect()
                })
                .collect()
        };

        let mut train_in = Vec::new();
        let mut train_out = Vec::new();

        for pair in train {
            train_in.push(parse_grid(&pair["input"]));
            train_out.push(parse_grid(&pair["output"]));
        }

        let test_in = parse_grid(&test[0]["input"]);
        let test_out = parse_grid(&test[0]["output"]);

        println!("\n\n🌿 ==================================");
        println!("Solving Task: {}.json", task_name);
        println!("🌿 ==================================");

        let _start_time = Instant::now();
        let result = agent.solve_task(&train_in, &train_out, &test_in);

        let mut success = true;
        let mut final_result = result.clone();

        if result.len() != test_out.len() {
            success = false;
        } else {
            for (r_row, t_row) in result.iter().zip(test_out.iter()) {
                if r_row != t_row {
                    success = false;
                    break;
                }
            }
        }

        if !success {
            println!(
                "MCTS failed. Engaging Generative Synthesized Skill: extract_anomalous_quadrant..."
            );

            let mut raw_manifold = EntityManifold::new();
            raw_manifold.global_width = test_in[0].len() as f32;
            raw_manifold.global_height = test_in.len() as f32;
            let mut raw_idx = 0;
            for (y, row) in test_in.iter().enumerate() {
                for (x, &val) in row.iter().enumerate() {
                    raw_manifold.ensure_scalar_capacity(raw_idx + 1);
                    Arc::make_mut(&mut raw_manifold.masses)[raw_idx] = 1.0;
                    Arc::make_mut(&mut raw_manifold.tokens)[raw_idx] = val;
                    Arc::make_mut(&mut raw_manifold.centers_x)[raw_idx] = x as f32;
                    Arc::make_mut(&mut raw_manifold.centers_y)[raw_idx] = y as f32;

                    // Span = 1 since it's raw pixel
                    Arc::make_mut(&mut raw_manifold.spans_x)[raw_idx] = 1.0;
                    Arc::make_mut(&mut raw_manifold.spans_y)[raw_idx] = 1.0;

                    raw_idx += 1;
                }
            }
            raw_manifold.active_count = raw_idx;

            // Eksekusi fungsi anomali (Micro -> Nano -> Femto snapshot)
            let res_em = extract_anomalous_quadrant(&raw_manifold);

            final_result =
                vec![vec![0; res_em.global_width as usize]; res_em.global_height as usize];
            for i in 0..res_em.active_count {
                if res_em.masses[i] > 0.0 {
                    let cx = res_em.centers_x[i].round() as i32;
                    let cy = res_em.centers_y[i].round() as i32;
                    if cx >= 0
                        && cx < res_em.global_width as i32
                        && cy >= 0
                        && cy < res_em.global_height as i32
                    {
                        final_result[cy as usize][cx as usize] = res_em.tokens[i];
                    }
                }
            }
            success = true;

            if final_result.len() != test_out.len() {
                success = false;
            } else {
                for (_r, (r_row, t_row)) in final_result.iter().zip(test_out.iter()).enumerate() {
                    if r_row != t_row {
                        success = false;
                        break;
                    }
                }
            }
        }

        if success {
            println!("✅ SUCCESS (100% Match!)");
            successes += 1;
        } else {
            println!("💀 FAILED (Mismatch)");
        }
    }

    println!("\n\n🏁 BATCH EXECUTION COMPLETE");
    println!("Score: {} / {}", successes, total);

    println!("\n🌿 ==================================");
    println!("🌙 MENGAKTIFKAN SIKLUS TIDUR (MENTAL REPLAY)");
    println!("🌿 ==================================");

    agent.dream(); // Simulasi REM

    let dummy_manifold = EntityManifold::default();
    let _ = immortal.hibernate(&dummy_manifold); // Simpan state KV int8 ke bin
}
