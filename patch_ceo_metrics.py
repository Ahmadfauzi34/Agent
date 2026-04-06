import re

with open('rrm_rust/src/reasoning/hierarchical_inference.rs', 'r') as f:
    content = f.read()

target_pragmatic = """    fn calculate_pragmatic_error(&self, _current: &EntityManifold, _expected: &EntityManifold) -> f32 {
        0.5 // Stub for calculating error
    }"""

replacement_pragmatic = """    fn calculate_pragmatic_error(&self, current: &EntityManifold, expected: &EntityManifold) -> f32 {
        // Penalty for dimension mismatch
        let mut error = 0.0;
        let dim_diff = (current.global_width - expected.global_width).abs()
                     + (current.global_height - expected.global_height).abs();

        if dim_diff > 0.1 {
            error += dim_diff * 500.0; // Heavy penalty for wrong dimensions
        }

        // Vectorized pixel mismatch calculation
        let mut pixels_mismatch = 0.0;
        let active_expected = expected.active_count;
        let active_current = current.active_count;

        error += (active_expected as f32 - active_current as f32).abs() * 50.0;

        // Simple continuous heuristic: sum of distances between tokens if same count, or just diff in sums
        let mut sum_expected_tokens = 0.0;
        for i in 0..active_expected {
            sum_expected_tokens += expected.tokens[i] as f32 * expected.masses[i];
        }

        let mut sum_current_tokens = 0.0;
        for i in 0..active_current {
            sum_current_tokens += current.tokens[i] as f32 * current.masses[i];
        }

        error += (sum_expected_tokens - sum_current_tokens).abs() * 10.0;

        error.max(0.0)
    }"""

target_epistemic = """    fn calculate_epistemic_gain(&self, _parent_idx: usize, _child_idx: usize) -> f32 {
        0.1 // Stub for calculating information gain
    }"""

replacement_epistemic = """    fn calculate_epistemic_gain(&self, parent_idx: usize, child_idx: usize) -> f32 {
        // Epistemic gain is the L2 distance (change) between parent and child state
        let e = self.config.max_entities;
        let d = self.config.global_dimension;

        let parent_offset = parent_idx * e * 10;
        let child_offset = child_idx * e * 10;

        let mut diff_sq = 0.0;
        for i in 0..(e * 10) {
            let diff = self.state_scalar_data[child_offset + i] - self.state_scalar_data[parent_offset + i];
            diff_sq += diff * diff;
        }

        // Small epsilon to prevent zero
        (diff_sq.sqrt() + 1e-15).min(100.0) // Cap gain
    }"""

content = content.replace(target_pragmatic, replacement_pragmatic)
content = content.replace(target_epistemic, replacement_epistemic)

with open('rrm_rust/src/reasoning/hierarchical_inference.rs', 'w') as f:
    f.write(content)
