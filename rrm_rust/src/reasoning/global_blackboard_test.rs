use crate::core::config::GLOBAL_DIMENSION;
use crate::reasoning::global_blackboard::GlobalBlackboard;
use ndarray::Array1;

#[test]
fn test_global_blackboard_synchronize_and_read() {
    let mut blackboard = GlobalBlackboard::new();

    let mut state1 = Array1::<f32>::zeros(GLOBAL_DIMENSION);
    state1[0] = 1.0;

    let mut state2 = Array1::<f32>::zeros(GLOBAL_DIMENSION);
    state2[1] = 1.0;

    let states = vec![&state1, &state2];
    blackboard.synchronize(&states);

    let collective = blackboard.read_collective_state();

    // After adding, we have [1, 1, 0...]. Mag squared is 2.
    // Mag is sqrt(2) ~ 1.414. Inverse mag is 1 / sqrt(2) ~ 0.707
    assert!((collective[0] - 0.7071067).abs() < 1e-5);
    assert!((collective[1] - 0.7071067).abs() < 1e-5);
    assert_eq!(collective[2], 0.0);
}

#[test]
fn test_global_blackboard_contextualize() {
    let mut blackboard = GlobalBlackboard::new();

    // Setup an arbitrary collective state
    let mut collective = Array1::<f32>::zeros(GLOBAL_DIMENSION);
    collective[0] = 1.0; // Minimal representation for test
    let states = vec![&collective];
    blackboard.synchronize(&states);

    let mut agent = Array1::<f32>::zeros(GLOBAL_DIMENSION);
    agent[0] = 1.0; // This means after circular convolution we should get a peak

    // contextualize
    let bound = blackboard.contextualize_agent(&agent);

    // Ensure it's normalized (magnitude should be 1.0)
    let mag_sq: f32 = bound.iter().map(|&x| x * x).sum();
    assert!((mag_sq - 1.0).abs() < 1e-5);
}
