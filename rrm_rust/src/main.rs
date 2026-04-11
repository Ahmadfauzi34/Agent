pub mod core;
pub mod memory;
pub mod reasoning;
pub mod shared;
pub mod perception;
pub mod self_awareness;
use self_awareness::immortal_loop::KVImmortalEngine;
use crate::core::entity_manifold::EntityManifold;
use perception::anomalous_extractor::extract_anomalous_quadrant;

use std::fs;
use std::time::Instant;
use serde_json::Value;
use reasoning::rrm_agent::RrmAgent;

fn main() {
    println!("🌌 RRM Quantum Sandbox (Rust Edition) Initialized.");

    let base_dir = std::path::PathBuf::from(".");
    let mut immortal = KVImmortalEngine::new(&base_dir, "main");
    let _ = immortal.resurrect(); // Bangkit dari crash / mulai Genesis

    let mut agent = RrmAgent::new();

    let tasks = vec![
        "05269061", // Normal task test
        "09629e4f", // Normal task test
        "2dc579da"  // The one we know works with anomalous logic
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
            arr.as_array().unwrap().iter().map(|row| {
                row.as_array().unwrap().iter().map(|v| v.as_i64().unwrap() as i32).collect()
            }).collect()
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



        let start_time = Instant::now();
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
            println!("MCTS failed. Engaging Generative Synthesized Skill: extract_anomalous_quadrant...");
            let mut em = EntityManifold::default(); em.global_width = test_in[0].len() as f32; em.global_height = test_in.len() as f32; let res_em = extract_anomalous_quadrant(&em); final_result = vec![vec![0; res_em.global_width as usize]; res_em.global_height as usize];
            success = true;
            if final_result.len() != test_out.len() {
                success = false;
            } else {
                for (r_row, t_row) in final_result.iter().zip(test_out.iter()) {
                    if r_row != t_row {
                        success = false;
                        break;
                    }
                }
            }
        }

        let duration = start_time.elapsed();

        println!("Duration: {:?}", duration);
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

    let dummy_manifold = EntityManifold::default(); let _ = immortal.hibernate(&dummy_manifold); // Simpan state KV int8 ke bin
}
