import re

file_path = "rrm_rust/src/reasoning/hamiltonian_pruner.rs"

with open(file_path, "r") as f:
    content = f.read()

# Modify calculate_energy_streaming to accept depth and use Phased Logic
phased_signature = "pub fn calculate_energy_streaming(manifold: &EntityManifold, expected_grid: &[Vec<i32>], depth: usize) -> f32 {"

content = content.replace("pub fn calculate_energy_streaming(\n        manifold: &EntityManifold,\n        expected_grid: &[Vec<i32>],\n    ) -> f32 {", phased_signature)

phased_logic = """
        // --- PHASED MCTS LOGIC ---
        // At Depth 0 (Macro Phase), we ONLY care about getting the dimensions right.
        // We heavily penalize dimension mismatch, but ignore pixel colors.
        // At Depth > 0 (Micro Phase), we care about both dimensions and pixels.

        let dim_error = (exp_w as f32 - obs_w as f32).abs() + (exp_h as f32 - obs_h as f32).abs();

        if depth == 0 {
            if dim_error == 0.0 {
                // Massive reward for getting dimensions right at depth 0
                return -500.0;
            } else {
                // Penalize based solely on how far off the dimensions are
                return dim_error * 1000.0;
            }
        }

        // --- MICRO PHASE (Depth > 0) ---
        let mut total_energy = 0.0;

        // Base penalty for dimension mismatch in micro phase
"""

content = re.sub(
    r"let mut total_energy = 0\.0;\n\n        // 1\. Penalty for dimension mismatch\n",
    phased_logic,
    content
)

with open(file_path, "w") as f:
    f.write(content)
print("HamiltonianPruner Patched!")
