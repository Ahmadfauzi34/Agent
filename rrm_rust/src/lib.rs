#![cfg_attr(not(test), warn(
    clippy::all,
    clippy::pedantic,
    clippy::nursery,
    clippy::cargo,
    clippy::perf,
    clippy::complexity,
    clippy::style,
))]
#![cfg_attr(not(test), deny(
    clippy::correctness,
    clippy::suspicious,
))]
#![allow(
    clippy::module_name_repetitions,
    clippy::must_use_candidate,
)]

pub mod core;
pub mod memory;
pub mod perception;
pub mod quantum_topology;
pub mod reasoning;
pub mod self_awareness;
pub mod shared;
