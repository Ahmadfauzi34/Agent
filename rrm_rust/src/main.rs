pub mod core;
pub mod memory;
pub mod reasoning;
pub mod perception;

use std::fs;
use std::path::Path;
use std::time::Instant;
use serde_json::Value;
use reasoning::rrm_agent::RrmAgent;

fn main() {
    println!("🌌 RRM Quantum Sandbox (Rust Edition) - BATCH TESTING INITIALIZED\n");

    let training_dir = "../training/";
    let path = Path::new(training_dir);

    if !path.exists() || !path.is_dir() {
        println!("❌ Direktori training {} tidak ditemukan!", training_dir);
        return;
    }

    let mut agent = RrmAgent::new();
    let mut total_tasks = 0;
    let mut success_count = 0;
    let mut failed_count = 0;
    let mut total_duration = std::time::Duration::new(0, 0);

    let batch_start = Instant::now();

    for entry in fs::read_dir(path).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();

        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
            let filename = path.file_name().unwrap().to_str().unwrap();
            total_tasks += 1;

            let data = match fs::read_to_string(&path) {
                Ok(d) => d,
                Err(_) => {
                    println!("   [ERROR] Gagal membaca file: {}", filename);
                    failed_count += 1;
                    continue;
                }
            };

            let json: Value = match serde_json::from_str(&data) {
                Ok(j) => j,
                Err(_) => {
                    println!("   [ERROR] JSON tidak valid: {}", filename);
                    failed_count += 1;
                    continue;
                }
            };

            let train = json["train"].as_array().unwrap_or(&vec![]).clone();
            let test = json["test"].as_array().unwrap_or(&vec![]).clone();

            if train.is_empty() || test.is_empty() {
                println!("   [SKIP] File {} tidak memiliki data train/test.", filename);
                continue;
            }

            let parse_grid = |val: &Value| -> Vec<Vec<i32>> {
                if let Some(arr) = val.as_array() {
                    arr.iter().map(|row| {
                        if let Some(row_arr) = row.as_array() {
                            row_arr.iter().map(|v| v.as_i64().unwrap_or(0) as i32).collect()
                        } else {
                            vec![]
                        }
                    }).collect()
                } else {
                    vec![]
                }
            };

            let mut train_in = Vec::new();
            let mut train_out = Vec::new();

            for pair in &train {
                train_in.push(parse_grid(&pair["input"]));
                train_out.push(parse_grid(&pair["output"]));
            }

            let test_in = parse_grid(&test[0]["input"]);
            let test_out = parse_grid(&test[0]["output"]);

            let task_start = Instant::now();
            let result = agent.solve_task(&train_in, &train_out, &test_in);
            let task_duration = task_start.elapsed();
            total_duration += task_duration;

            let mut success = true;
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

            if success {
                success_count += 1;
                println!("✅ [{}/{}] {} | 100% Match! ({:.2}s)", total_tasks, total_tasks, filename, task_duration.as_secs_f32());
            } else {
                failed_count += 1;
                println!("💀 [{}/{}] {} | Mismatch ({:.2}s)", total_tasks, total_tasks, filename, task_duration.as_secs_f32());
            }
        }
    }

    let batch_duration = batch_start.elapsed();

    println!("\n=======================================================");
    println!("📊 RRM RUST EDITION - BATCH EXECUTION REPORT");
    println!("=======================================================");
    println!("🎯 SUMMARY (GROUND TRUTH ACCURACY)");
    println!("   Total Tasks: {}", total_tasks);
    println!("   Success: {} ✅ ({:.1}%)", success_count, (success_count as f32 / total_tasks as f32) * 100.0);
    println!("   Failed: {} 💀 ({:.1}%)", failed_count, (failed_count as f32 / total_tasks as f32) * 100.0);
    println!("   Throughput: {:.2} tasks/minute", (total_tasks as f32 / (batch_duration.as_secs_f32() / 60.0)));

    println!("\n⏱️  TIMING STATISTICS");
    println!("   Total Rust Logic Time: {:.2}s", total_duration.as_secs_f32());
    println!("   Total Wall Time: {:.2}s", batch_duration.as_secs_f32());
    println!("=======================================================\n");
}
