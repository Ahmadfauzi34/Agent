import { EntityManifold } from '../core/EntityManifold.js';
import { TensorVector, GLOBAL_DIMENSION } from '../core/config.js';
import { FHRR } from '../core/fhrr.js';
import { AxiomGenerator } from './AxiomGenerator.js';
import { UniversalManifold } from '../perception/UniversalManifold.js';

export interface AlignmentMatch {
    sourceIndex: number;
    targetIndex: number; // -1 jika tidak ada target
    similarity: number;
    deltaTensor: TensorVector | null; // Selisih vektor (Pergerakan konseptual/spasial)
    axiomType: string; // IDENTITY, MIRROR_X, MIRROR_Y, MIRROR_XY
}

/**
 * 🎭 TOPOLOGICAL ALIGNER (Fase 4: The Cortex)
 * Melacak entitas dari Manifold Input ke Manifold Output secara agnostik
 * tanpa memuja Array of Objects (SoA Ready).
 */
export class TopologicalAligner {
    private perceiver: UniversalManifold;

    constructor(perceiver: UniversalManifold) {
        this.perceiver = perceiver;
    }

    /**
     * Mencocokkan Entitas dari Manifold Sumber dengan Manifold Target.
     * Menggunakan Imajinasi Kuantum (Probing 4 Skenario Geometri) untuk Resonance Search.
     */
    public align(sourceManifold: EntityManifold, targetManifold: EntityManifold): AlignmentMatch[] {
        const matches: AlignmentMatch[] = [];
        const usedTargets = new Set<number>();

        // 🚨 KOREKSI ARSITEK (Non-Determinisme Sort):
        // Sort memang rentan membalikkan kembar jika massanya sama. Kita perbaiki
        // dengan menambahkan ID/Urutan sebagai tie-breaker (Fallback sekunder).
        // Kenapa sort() tetap wajib? Karena jika 1 titik debu (noise) diuji lebih dulu,
        // Algoritma Greedy akan membiarkannya "mencuri" target dari objek raksasa.
        const sourceIndices: number[] = [];
        for(let i = 0; i < sourceManifold.activeCount; i++) {
            if (sourceManifold.masses[i]! > 0) sourceIndices.push(i);
        }

        sourceIndices.sort((a, b) => {
            const massDiff = sourceManifold.masses[b]! - sourceManifold.masses[a]!;
            if (massDiff !== 0) return massDiff;
            return a - b; // Tie-breaker deterministik
        });

        for (const sIdx of sourceIndices) {
            let bestTargetIdx = -1;
            let bestSim = -1.0;
            let bestAxiomType = "IDENTITY";

            const srcTensor = sourceManifold.getTensor(sIdx);
            const srcMass = sourceManifold.masses[sIdx]!;
            const srcRelX = sourceManifold.centersX[sIdx]!;
            const srcRelY = sourceManifold.centersY[sIdx]!;

            // 🏎️ V8 Optimized `forEachActive` dari EntityManifold
            targetManifold.forEachActive((tIdx, tgtMass, tgtRelX, tgtRelY) => {
                if (usedTargets.has(tIdx)) return;

                const tgtTensor = targetManifold.getTensor(tIdx);

                // 🌟 TAHAP 1: PREDICTIVE CENTROID ALIGNMENT
                const dx = tgtRelX - srcRelX;
                const dy = tgtRelY - srcRelY;

                // Bangkitkan Axiom Translasi Spasial Murni
                const translationAxiom = AxiomGenerator.generateTranslationAxiom(
                    dx, dy,
                    this.perceiver.X_AXIS_SEED, this.perceiver.Y_AXIS_SEED
                );

                // Terapkan translasi ke Source (Memposisikan Source di atas Target)
                const alignedSrcTensor = FHRR.bind(srcTensor, translationAxiom);

                // 🌟 TAHAP 2: 4 IMAJINASI GEOMETRI (Phase Space Probes)
                const probeIdentity = alignedSrcTensor;

                const probeMirrorX = AxiomGenerator.applyReflection(
                    alignedSrcTensor, tgtRelX, tgtRelY,
                    1.0, 0.0,
                    this.perceiver.X_AXIS_SEED, this.perceiver.Y_AXIS_SEED
                );

                const probeMirrorY = AxiomGenerator.applyReflection(
                    alignedSrcTensor, tgtRelX, tgtRelY,
                    0.0, 1.0,
                    this.perceiver.X_AXIS_SEED, this.perceiver.Y_AXIS_SEED
                );

                const probeMirrorXY = AxiomGenerator.applyReflection(
                    alignedSrcTensor, tgtRelX, tgtRelY,
                    1.0, 1.0,
                    this.perceiver.X_AXIS_SEED, this.perceiver.Y_AXIS_SEED
                );

                // Mengukur 4 Kemungkinan Paralel
                const simId = FHRR.similarity(probeIdentity, tgtTensor);
                const simMx = FHRR.similarity(probeMirrorX, tgtTensor);
                const simMy = FHRR.similarity(probeMirrorY, tgtTensor);
                const simMxy = FHRR.similarity(probeMirrorXY, tgtTensor);

                // Math Branchless Maximum Resonance
                const maxSim = Math.max(simId, simMx, simMy, simMxy);

                // 🚨 KOREKSI ARSITEK: Branchless Mass Ratio
                const massRatio = Math.min(srcMass, tgtMass) / (Math.max(srcMass, tgtMass) + 1e-15);
                const combinedScore = (maxSim * 0.7) + (massRatio * 0.3);

                if (combinedScore > bestSim) {
                    bestSim = combinedScore;
                    bestTargetIdx = tIdx;

                    if (maxSim === simId) bestAxiomType = `TRANSLATE_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                    else if (maxSim === simMx) bestAxiomType = `MIRROR_X+TRANS_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                    else if (maxSim === simMy) bestAxiomType = `MIRROR_Y+TRANS_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                    else bestAxiomType = `MIRROR_XY+TRANS_${dx.toFixed(2)}_${dy.toFixed(2)}`;

                    // 🚨 PERINGATAN KINERJA (V8 AUDIT):
                    // Kita JANGAN menghitung Delta = bind(tgtTensor, inverse(srcTensor)) di dalam blok if ini!
                    // Memang menghemat variabel, tapi memanggil FHRR.bind di dalam inner loop setiap kali
                    // menemukan tetangga yang lebih dekat akan menjalankan O(N * 8192) operasi ALU yang sia-sia!
                    // Lebih baik catat indeks terbaiknya (bestTargetIdx), lalu jalankan ALU 1x di luar loop!
                }
            });

            let delta: TensorVector | null = null;

            if (bestTargetIdx !== -1) {
                usedTargets.add(bestTargetIdx);
                const tgtTensor = targetManifold.getTensor(bestTargetIdx);

                // ALU 8192-D Dijalankan HANYA SEKALI per Source setelah loop Target selesai!
                delta = FHRR.bind(tgtTensor, FHRR.inverse(srcTensor));
            }

            matches.push({
                sourceIndex: sIdx,
                targetIndex: bestTargetIdx,
                similarity: bestSim,
                deltaTensor: delta,
                axiomType: bestAxiomType
            });
        }

        return matches;
    }
}