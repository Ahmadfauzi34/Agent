use crate::core::config::MAX_ENTITIES;
use crate::core::entity_manifold::EntityManifold;
use crate::core::fhrr::FHRR;

/// ============================================================================
/// ENTANGLEMENT OPTIMIZER (Hebbian Quantum Learning)
/// 100% Branchless Math | Self-Organizing Agents | 1D SoA Matrix Optimized
/// ============================================================================
/// Mesin yang mengatur seberapa kuat dua entitas/agen saling mempengaruhi.
pub struct EntanglementOptimizer;

impl EntanglementOptimizer {
    /// 🕸️ HEBBIAN ENTANGLEMENT UPDATE
    /// "Neurons that fire together, wire together."
    pub fn optimize(
        manifold: &EntityManifold,
        entanglement_matrix: &mut [f32],
        learning_rate: f32,
    ) {
        let num_entities = manifold.active_count;

        for i in 0..num_entities {
            // V8 Optimized Control Flow (Skip dead entities)
            if manifold.masses[i] == 0.0 {
                continue;
            }

            let tensor_a = manifold.get_spatial_tensor(i);
            let row_offset = i * MAX_ENTITIES;

            for j in 0..num_entities {
                // V8 Optimized Control Flow
                if manifold.masses[j] == 0.0 {
                    continue;
                }

                let tensor_b = manifold.get_spatial_tensor(j);

                // 1. Ukur Resonansi (Coherence: -1.0 to 1.0) via FHRR Cosine Similarity
                let coherence = FHRR::similarity(&tensor_a, &tensor_b);

                // 2. Update Keterikatan (Hebbian Learning pada matriks 1D)
                let index = row_offset + j;
                let current_e = entanglement_matrix[index];
                let new_e = current_e + (coherence * learning_rate);

                // 3. Math Branchless Clamp (0.0 to 1.0)
                entanglement_matrix[index] = new_e.clamp(0.0, 1.0);
            }
        }
    }
}
