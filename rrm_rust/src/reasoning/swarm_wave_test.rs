use crate::core::entity_manifold::EntityManifold;
use crate::reasoning::entanglement_optimizer::EntanglementOptimizer;
use crate::reasoning::wave_dynamics::WaveDynamics;
use crate::reasoning::swarm_dynamics::SwarmDynamics;

#[test]
fn test_entanglement_and_wave_dynamics() {
    let mut manifold = EntityManifold::new();
    // Simulate 2 entities manually
    manifold.active_count = 2;
    manifold.masses[0] = 1.0;
    manifold.masses[1] = 1.0;
    for i in 0..8192 {
        manifold.spatial_tensors[i] = 1.0;
        manifold.spatial_tensors[8192 + i] = 1.0;
    }

    let mut wave = WaveDynamics::new();
    wave.initialize_entities(&manifold);
    wave.evolve_entanglement(&manifold, 0.1);

    // Trigger collapse
    wave.trigger_collapse(&mut manifold, 0);

    // Expecting entanglement status to be updated and no crashes
    assert!(manifold.entanglement_status[1] > 0.0);
}

#[test]
fn test_swarm_dynamics_basic() {
    let mut manifold = EntityManifold::new();
    manifold.global_width = 10.0;
    manifold.global_height = 10.0;

    manifold.active_count = 1;
    manifold.masses[0] = 1.0;
    manifold.centers_x[0] = 0.0;
    manifold.centers_y[0] = 0.0;
    manifold.spans_x[0] = 1.0;
    manifold.spans_y[0] = 1.0;

    // Try moving it down and right by 10% (1 pixel)
    SwarmDynamics::apply_swarm_gravity(&mut manifold, 0.1, 0.1);

    // Should have moved to roughly 0.1, 0.1
    assert!((manifold.centers_x[0] - 0.1).abs() < 1e-4);
    assert!((manifold.centers_y[0] - 0.1).abs() < 1e-4);
}
