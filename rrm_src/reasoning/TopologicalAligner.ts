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
            let bestSim = -1.0; // Izinkan kemiripan negatif ekstrem

            // Pencarian O(N^2) lokal untuk menemukan pasangan tensor yang paling beresonansi
            for (const tgt of targets) {
                // V8 Optimized Control Flow
                if (usedTargets.has(tgt.id)) continue;

                // Mengukur kesamaan "Jiwa" Entitas (Bentuk/Warna/Posisi Kuantum)
                const sim = FHRR.similarity(src.tensor, tgt.tensor);

                // Menambahkan Heuristik "Massa" (Entitas jarang mengubah ukurannya secara ekstrem)
                // Perbedaan massa (0.0 = beda jauh, 1.0 = sama persis) menggunakan Math Branchless sejati
                const massRatio = Math.min(src.mass, tgt.mass) / Math.max(src.mass, tgt.mass);

                // Skor campuran: 70% kemiripan jiwa (tensor), 30% konsistensi massa
                const combinedScore = (sim * 0.7) + (massRatio * 0.3);

                if (combinedScore > bestSim) {
                    bestSim = combinedScore; // Catat skor gabungannya
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
                similarity: bestSim, // Menyimpan skor keyakinan baru
                deltaTensor: delta
            });
        }

        return matches;
    }
}