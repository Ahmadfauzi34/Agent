use crate::core::config::GLOBAL_DIMENSION;
use crate::memory::logic_seed_bank::LogicSeedBank;
use ndarray::Array1;

#[test]
fn test_logic_seed_bank_add_and_query() {
    let mut bank = LogicSeedBank::new();

    let mut t1 = Array1::<f32>::zeros(GLOBAL_DIMENSION);
    t1[0] = 1.0;
    t1[1] = 0.5;

    let mut t2 = Array1::<f32>::zeros(GLOBAL_DIMENSION);
    t2[0] = -1.0; // very different

    bank.add_seed("Rule1", 101, &t1);
    bank.add_seed("Rule2", 102, &t2);

    assert_eq!(bank.active_count, 2);

    let retrieved = bank.get_tensor(0);
    assert_eq!(retrieved[0], 1.0);
    assert_eq!(retrieved[1], 0.5);

    // Test LSH Query - should at least return some candidates without crashing
    let candidates = bank.query_similar(&t1, 5);
    assert!(!candidates.is_empty());
}
