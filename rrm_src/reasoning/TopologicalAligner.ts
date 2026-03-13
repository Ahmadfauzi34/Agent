import { CognitiveEntity } from '../core/CognitiveEntity';
import { TensorVector, GLOBAL_DIMENSION } from '../core/config';
import { FHRR } from '../core/fhrr';

export interface AlignmentMatch {
    source: CognitiveEntity;
    target: CognitiveEntity | null;
    similarity: number;
    deltaTensor: TensorVector | null; // Selisih vektor (Pergerakan konseptual/spasial)
}

/**
 * 🎭 TOPOLOGICAL ALIGNER (Fase 4: The Cortex)
 * Berfungsi untuk melacak / memasangkan entitas dari dimensi awal (Input)
 * ke dimensi akhir (Output) secara agnostik menggunakan Tensor Cosine Similarity.
 * Ini adalah versi kontinu dari Hungarian Matching Algorithm.
 */
export class TopologicalAligner {

    /**
     * Mencocokkan grup entitas Input dengan Output.
     * Menggunakan pencarian Cost-Matrix dengan VSA Cosine Similarity sebagai bobot.
     */
    public align(sources: CognitiveEntity[], targets: CognitiveEntity[]): AlignmentMatch[] {
        const matches: AlignmentMatch[] = [];
        const usedTargets = new Set<string>();

        // Mengurutkan sources dari yang massanya paling besar (Heuristik Atensi Utama)
        const sortedSources = [...sources].sort((a, b) => b.mass - a.mass);

        for (const src of sortedSources) {
            let bestTarget: CognitiveEntity | null = null;
            let bestSim = -1;

            // Pencarian O(N^2) lokal untuk menemukan pasangan tensor yang paling beresonansi
            for (const tgt of targets) {
                if (usedTargets.has(tgt.id)) continue;

                // Mengukur kesamaan "Jiwa" Entitas (Bentuk/Warna/Posisi Kuantum)
                const sim = FHRR.similarity(src.tensor, tgt.tensor);

                // Algoritma greedy untuk matching: Tanpa if-else kompleks,
                // kita hanya mengamankan yang sim-nya tertinggi.
                const isBetter = sim > bestSim;
                if (isBetter) {
                    bestSim = sim;
                    bestTarget = tgt;
                }
            }

            let delta: TensorVector | null = null;

            if (bestTarget) {
                usedTargets.add(bestTarget.id);
                // Unbinding untuk mencari TAHU "APA YANG TERJADI" (Hukum Perubahan)
                // Delta = Target * Inverse(Source)
                delta = FHRR.bind(bestTarget.tensor, FHRR.inverse(src.tensor));
            }

            matches.push({
                source: src,
                target: bestTarget,
                similarity: bestSim,
                deltaTensor: delta
            });
        }

        return matches;
    }
}