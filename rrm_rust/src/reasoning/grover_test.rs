use crate::core::config::GLOBAL_DIMENSION;
use crate::core::entity_manifold::EntityManifold;
use crate::reasoning::grover_diffusion_system::{
    GroverCandidate, GroverConfig, GroverDiffusionSystem, TrainState,
};
use crate::reasoning::multiverse_sandbox::MultiverseSandbox;
use ndarray::Array1;

#[test]
fn test_grover_warm_start() {
    let mut sandbox = MultiverseSandbox::new();
    let config = GroverConfig {
        dimensions: GLOBAL_DIMENSION,
        search_space_size: 2,
        temperature: 0.1,
        free_energy_threshold: 0.0,
        max_iterations: 1,
    };

    let mut grover = GroverDiffusionSystem::new(&mut sandbox, config);

    let c1 = GroverCandidate {
        energy: 0.8,
        tensor_rule: Array1::<f32>::ones(GLOBAL_DIMENSION),
        condition_tensor: None,
        delta_x: 0.0,
        delta_y: 0.0,
        physics_tier: 0,
        axiom_type: "C1".to_string(),
    };

    let c2 = GroverCandidate {
        energy: 0.2,
        tensor_rule: Array1::<f32>::ones(GLOBAL_DIMENSION),
        condition_tensor: None,
        delta_x: 0.0,
        delta_y: 0.0,
        physics_tier: 0,
        axiom_type: "C2".to_string(),
    };

    grover.warm_start(&[c1, c2]);

    // c1 has higher energy so it should have higher amplitude at index 0 than c2 at index GLOBAL_DIMENSION
    assert!(grover.amplitudes[0] > grover.amplitudes[GLOBAL_DIMENSION]);
}
