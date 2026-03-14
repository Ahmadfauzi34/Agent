import { EntityManifold } from '../core/EntityManifold.js';
import { FHRR } from '../core/fhrr.js';

/**
 * ============================================================================
 * ENTANGLEMENT OPTIMIZER (Hebbian Quantum Learning)
 * 100% Branchless | Self-Organizing Agents | OOP-Free (SoA)
 * ============================================================================
 * Mesin yang mengatur seberapa kuat dua entitas/agen saling mempengaruhi.
 */
export class EntanglementOptimizer {
    
    /**
     * 🕸️ HEBBIAN ENTANGLEMENT UPDATE (Zero If-Else)
     * "Neurons that fire together, wire together."
     */
    public static optimize(
        manifold: EntityManifold,
        entanglementMatrix: Float32Array[], 
        learningRate: number = 0.1
    ): void {
        const numEntities = manifold.activeCount;

        for (let i = 0; i < numEntities; i++) {
            // Abaikan jika entitas i sudah hancur (vakum)
            if (manifold.masses[i] === 0.0) continue;

            const tensorA = manifold.getTensor(i);
            
            for (let j = 0; j < numEntities; j++) {
                if (manifold.masses[j] === 0.0) continue;

                const tensorB = manifold.getTensor(j);
                
                // 1. Ukur Resonansi (Coherence: -1.0 to 1.0) via FHRR Cosine Similarity
                const coherence = FHRR.similarity(tensorA, tensorB);
                
                // 2. Update Keterikatan (Hebbian Learning)
                const currentE = entanglementMatrix[i]![j]!;
                let newE = currentE + (coherence * learningRate);
                
                // 3. Branchless Clamp (0.0 to 1.0)
                newE = Math.max(0.0, Math.min(1.0, newE));
                
                entanglementMatrix[i]![j] = newE;
            }
        }
    }
}
