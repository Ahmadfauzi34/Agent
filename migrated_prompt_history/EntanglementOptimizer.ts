import { CognitiveEntity } from '../core/CognitiveEntity';
import { VSACore } from '../memory/VSACore';

/**
 * ============================================================================
 * ENTANGLEMENT OPTIMIZER (Hebbian Quantum Learning)
 * 100% Branchless | Self-Organizing Agents
 * ============================================================================
 * Mesin yang mengatur seberapa kuat dua entitas/agen saling mempengaruhi.
 */
export class EntanglementOptimizer {
    
    /**
     * 🕸️ HEBBIAN ENTANGLEMENT UPDATE (Zero If-Else)
     * "Neurons that fire together, wire together."
     * Jika dua entitas beresonansi (fase mirip), keterikatan mereka menguat.
     * Jika berlawanan, keterikatan melemah.
     */
    public static optimize(
        entities: CognitiveEntity[], 
        entanglementMatrix: Float32Array[], 
        learningRate: number = 0.1
    ): void {
        const numEntities = entities.length;

        for (let i = 0; i < numEntities; i++) {
            const entA = entities[i]!;
            
            for (let j = 0; j < numEntities; j++) {
                const entB = entities[j]!;
                
                // 1. Ukur Resonansi (Coherence: -1.0 to 1.0)
                // Seberapa selaras pikiran Agen A dan Agen B?
                const coherence = VSACore.measureCoherence(entA.state_vector, entB.state_vector);
                
                // 2. Update Keterikatan (Hebbian Learning)
                const currentE = entanglementMatrix[i]![j]!;
                let newE = currentE + (coherence * learningRate);
                
                // 3. Branchless Clamp (0.0 to 1.0)
                // Memastikan nilai keterikatan tidak keluar dari batas probabilitas
                newE = Math.max(0.0, Math.min(1.0, newE));
                
                entanglementMatrix[i]![j] = newE;
            }
        }
    }
}
