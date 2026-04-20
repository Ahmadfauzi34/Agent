
use rrm_rust::core::entity_manifold::EntityManifold;
use rrm_rust::quantum_topology::QuantumCellComplex;
use std::time::Instant;
use std::sync::Arc;

fn main() {
    let n = 500;
    let mut manifold = EntityManifold::new();
    manifold.active_count = n;
    manifold.global_width = 100.0;
    manifold.global_height = 100.0;

    let mut cx = vec![0.0; n];
    let mut cy = vec![0.0; n];
    let mut masses = vec![1.0; n];
    let mut tokens = vec![1; n];

    for i in 0..n {
        cx[i] = (i as f32 * 1.1) % 100.0;
        cy[i] = (i as f32 * 1.7) % 100.0;
    }

    manifold.centers_x = Arc::new(cx);
    manifold.centers_y = Arc::new(cy);
    manifold.masses = Arc::new(masses);
    manifold.tokens = Arc::new(tokens);
    manifold.ensure_scalar_capacity(n); // To make sure other vectors are same length

    let epsilon = 5.0;

    // Warmup
    for _ in 0..5 {
        let _ = QuantumCellComplex::from_manifold(&manifold, epsilon);
    }

    let start = Instant::now();
    let iterations = 20;
    for _ in 0..iterations {
        let _ = QuantumCellComplex::from_manifold(&manifold, epsilon);
    }
    let duration = start.elapsed() / iterations;

    println!("Average time: {:?}", duration);
}
