import { EntityManifold } from '../core/EntityManifold.js';
import { TensorVector, GLOBAL_DIMENSION } from '../core/config.js';
import { FHRR } from '../core/fhrr.js';

export interface AlignmentMatch {
    sourceIndex: number;
    targetIndex: number; // -1 jika tidak ada target
    similarity: number;
    deltaTensor: TensorVector | null; // Selisih vektor (Pergerakan konseptual/spasial)
}

/**
 * 🎭 TOPOLOGICAL ALIGNER (Fase 4: The Cortex)
 * Melacak entitas dari Manifold Input ke Manifold Output secara agnostik
 * tanpa memuja Array of Objects (SoA Ready).
 */
export class TopologicalAligner {

    /**
     * Mencocokkan Entitas dari Manifold Sumber dengan Manifold Target.
     */
    public align(sourceManifold: EntityManifold, targetManifold: EntityManifold): AlignmentMatch[] {
        const matches: AlignmentMatch[] = [];
        const usedTargets = new Set<number>();

        // Buat urutan indeks sumber yang diurutkan berdasarkan massa
        // Ini adalah array kecil yang aman untuk sort()
        const sourceIndices: number[] = [];
        for(let i = 0; i < sourceManifold.activeCount; i++) {
            if (sourceManifold.masses[i]! > 0) sourceIndices.push(i);
        }

        sourceIndices.sort((a, b) => sourceManifold.masses[b]! - sourceManifold.masses[a]!);

        for (const sIdx of sourceIndices) {
            let bestTargetIdx = -1;
            let bestSim = -1.0;

            const srcTensor = sourceManifold.getTensor(sIdx);
            const srcMass = sourceManifold.masses[sIdx]!;

            for (let tIdx = 0; tIdx < targetManifold.activeCount; tIdx++) {
                const tgtMass = targetManifold.masses[tIdx]!;

                // V8 Optimized Control Flow (Skip if used or vacuum state)
                if (usedTargets.has(tIdx) || tgtMass === 0.0) continue;

                const tgtTensor = targetManifold.getTensor(tIdx);

                const sim = FHRR.similarity(srcTensor, tgtTensor);

                // Math Branchless Massa Ratio
                const massRatio = Math.min(srcMass, tgtMass) / Math.max(srcMass, tgtMass);

                const combinedScore = (sim * 0.7) + (massRatio * 0.3);

                if (combinedScore > bestSim) {
                    bestSim = combinedScore;
                    bestTargetIdx = tIdx;
                }
            }

            let delta: TensorVector | null = null;

            if (bestTargetIdx !== -1) {
                usedTargets.add(bestTargetIdx);
                const tgtTensor = targetManifold.getTensor(bestTargetIdx);
                // Delta = Target * Inverse(Source)
                delta = FHRR.bind(tgtTensor, FHRR.inverse(srcTensor));
            }

            matches.push({
                sourceIndex: sIdx,
                targetIndex: bestTargetIdx,
                similarity: bestSim,
                deltaTensor: delta
            });
        }

        return matches;
    }
}