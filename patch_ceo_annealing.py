import re

with open('rrm_rust/src/reasoning/hierarchical_inference.rs', 'r') as f:
    content = f.read()

target = "    pub fn auto_prune(&mut self) -> usize {"
replacement = """    pub fn deduplicate_waves(&mut self) -> usize {
        let mut duplicates = 0;
        let active_indices: Vec<usize> = self.frontier_active_indices.clone();

        let e = self.config.max_entities;

        for i in 0..active_indices.len() {
            let idx_a = active_indices[i];
            if self.wave_masses[idx_a] == 0.0 { continue; }

            let energy_a = self.metric_free_energies[idx_a];

            for j in (i + 1)..active_indices.len() {
                let idx_b = active_indices[j];
                if self.wave_masses[idx_b] == 0.0 { continue; }

                // Compare state scalars (a lightweight check before checking 8192-D tensors)
                let offset_a = idx_a * e * 10;
                let offset_b = idx_b * e * 10;

                let mut diff_sq = 0.0;
                for k in 0..(e * 10) {
                    let diff = self.state_scalar_data[offset_a + k] - self.state_scalar_data[offset_b + k];
                    diff_sq += diff * diff;
                }

                let dist = diff_sq.sqrt();

                // If they are nearly identical states (distance < epsilon)
                if dist < 0.1 {
                    let energy_b = self.metric_free_energies[idx_b];

                    // Annihilate the one with higher (worse) free energy
                    if energy_a < energy_b {
                        self.free_wave(idx_b);
                        duplicates += 1;
                    } else {
                        self.free_wave(idx_a);
                        duplicates += 1;
                        break; // idx_a is dead, stop checking it against others
                    }
                }
            }
        }

        // Remove dead waves from frontier
        self.frontier_active_indices.retain(|&idx| self.wave_masses[idx] > 0.0);
        self.frontier_size = self.frontier_active_indices.len();

        duplicates
    }

    pub fn auto_prune(&mut self) -> usize {"""

content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/hierarchical_inference.rs', 'w') as f:
    f.write(content)
