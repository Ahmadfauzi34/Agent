use ndarray::Array1;
use std::fs;

// In Rust, tests cannot easily call bin code without library.
// The rrm_rust project is binary, not lib. We'll make a standalone script in src/bin.
