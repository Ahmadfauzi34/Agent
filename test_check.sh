#!/bin/bash
cd rrm_rust
cargo clippy --allow-dirty --allow-no-vcs
cargo test
