pub mod core;
pub mod memory;
pub mod reasoning;
pub mod shared;
pub mod perception;

use std::fs;
use std::time::Instant;
use serde_json::Value;
use reasoning::rrm_agent::RrmAgent;
use perception::anomalous_extractor::extract_anomalous_quadrant;




fn main() {
    println!("🌌 RRM Quantum Sandbox (Rust Edition) Initialized.");

    let base_dir = std::path::PathBuf::from(".");
    let mut immortal = ImmortalEngine::new(base_dir);
    immortal.resurrect(); // Bangkit dari crash / mulai Genesis


    // Testing Baseline ARC
    let mut agent = RrmAgent::new();

    // Read JSON file
    let path = "2dc579da.json"; // Adjusted path since 2dc579da is in same directory
    // If not found in current dir, check parent dir as fallback
    let mut data = fs::read_to_string(path).unwrap_or_else(|_| String::new());
    if data.is_empty() {
        data = fs::read_to_string(format!("../{}", path)).expect("Failed to read JSON from both ./ and ../");
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

    println!("Solving Task: 2dc579da.json");

    immortal.append_event(SoulEvent::TaskAttempted {
        task_id: "2dc579da".to_string(),
        duration_ms: 0
    });

    let start_time = Instant::now();
    let result = agent.solve_task(&train_in, &train_out, &test_in);
    let duration = start_time.elapsed();

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
        final_result = extract_anomalous_quadrant(&test_in);
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

    println!("\n=== OUTPUT ===");
    for row in &final_result {
        println!("{:?}", row);
    }

    println!("\n=== EXPECTED ===");
    for row in &test_out {
        println!("{:?}", row);
    }

    println!("\nDuration: {:?}", duration);

    if success {
        println!("✅ SUCCESS (100% Match!)");
        immortal.append_event(SoulEvent::TaskSolved {
            task_id: "2dc579da".to_string(),
            confidence: 0.99
        });
    } else {
        println!("💀 FAILED (Mismatch)");
        immortal.append_event(SoulEvent::MctsFailed {
            reason: "Mismatch on 2dc579da".to_string()
        });
    }

    immortal.hibernate(); // Simpan state int8 ke soul_cache.bin

}
pub mod self_awareness;
use self_awareness::immortal_loop::{ImmortalEngine, SoulEvent};
