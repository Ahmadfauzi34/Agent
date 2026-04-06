import re

with open('rrm_rust/src/reasoning/hierarchical_inference.rs', 'r') as f:
    content = f.read()

target = """        candidates.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
        for (idx, _) in candidates.into_iter().take(target_size) {
            self.frontier_active_indices.push(idx);
        }"""

replacement = """        candidates.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));

        // Fast-Path Exploitation (Temperature Cooling)
        // If the best candidate has a very low free energy, collapse the beam width to 1.
        let actual_target_size = if !candidates.is_empty() && candidates[0].1 < 0.1 {
            1
        } else {
            target_size
        };

        for (idx, _) in candidates.into_iter().take(actual_target_size) {
            self.frontier_active_indices.push(idx);
        }"""

content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/hierarchical_inference.rs', 'w') as f:
    f.write(content)
