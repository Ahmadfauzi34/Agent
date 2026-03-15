import { EntityManifold } from '../core/EntityManifold.js';
import { MAX_ENTITIES } from '../core/config.js';
import { FHRR } from '../core/fhrr.js';

/**
 * ============================================================================
 * ENTANGLEMENT OPTIMIZER (Hebbian Quantum Learning)
 * 100% Branchless Math | Self-Organizing Agents | 1D SoA Matrix Optimized
 * ============================================================================
 * Mesin yang mengatur seberapa kuat dua entitas/agen saling mempengaruhi.
 */
export class EntanglementOptimizer {

    /**
     * 🕸️ HEBBIAN ENTANGLEMENT UPDATE
     * "Neurons that fire together, wire together."
     */
    public static optimize(
        manifold: EntityManifold,
        entanglementMatrix: Float32Array,
        learningRate: number = 0.1
    ): void {
        const numEntities = manifold.activeCount;

        for (let i = 0; i < numEntities; i++) {
            // V8 Optimized Control Flow (Skip dead entities)
            if (manifold.masses[i] === 0.0) continue;

            const tensorA = manifold.getTensor(i);
            const rowOffset = i * MAX_ENTITIES;

            for (let j = 0; j < numEntities; j++) {
                // V8 Optimized Control Flow
                if (manifold.masses[j] === 0.0) continue;

                const tensorB = manifold.getTensor(j);

                // 1. Ukur Resonansi (Coherence: -1.0 to 1.0) via FHRR Cosine Similarity
                const coherence = FHRR.similarity(tensorA, tensorB);

                // 2. Update Keterikatan (Hebbian Learning pada matriks 1D)
                const index = rowOffset + j;
                const currentE = entanglementMatrix[index]!;
                let newE = currentE + (coherence * learningRate);

                // 3. Math Branchless Clamp (0.0 to 1.0)
                newE = Math.max(0.0, Math.min(1.0, newE));

                entanglementMatrix[index] = newE;
            }
        }
    }
}
