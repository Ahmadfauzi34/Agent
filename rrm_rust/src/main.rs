pub mod core;
pub mod memory;
pub mod perception;
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

fn main() {
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

    let _successes = 0;
    let _total = tasks.len();

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
                    raw_manifold.masses[raw_idx] = 1.0;
                    raw_manifold.tokens[raw_idx] = val;
                    raw_manifold.centers_x[raw_idx] = x as f32;
                    raw_manifold.centers_y[raw_idx] = y as f32;

                    // Span = 1 since it's raw pixel
                    raw_manifold.spans_x[raw_idx] = 1.0;
                    raw_manifold.spans_y[raw_idx] = 1.0;

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
    }
}
