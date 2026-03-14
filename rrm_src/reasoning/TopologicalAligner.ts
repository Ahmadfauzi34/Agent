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
            let bestAxiomType = "IDENTITY";
            let bestWinningProbe: TensorVector | null = null;

            const srcTensor = sourceManifold.getTensor(sIdx);
            const srcMass = sourceManifold.masses[sIdx]!;
            const srcRelX = sourceManifold.centersX[sIdx]!;
            const srcRelY = sourceManifold.centersY[sIdx]!;

            for (let tIdx = 0; tIdx < targetManifold.activeCount; tIdx++) {
                const tgtMass = targetManifold.masses[tIdx]!;

                // V8 Optimized Control Flow (Skip if used or vacuum state)
                if (usedTargets.has(tIdx) || tgtMass === 0.0) continue;

                const tgtTensor = targetManifold.getTensor(tIdx);
                const tgtRelX = targetManifold.centersX[tIdx]!;
                const tgtRelY = targetManifold.centersY[tIdx]!;

                // 🌟 TAHAP 1: PREDICTIVE CENTROID ALIGNMENT
                // Hitung Delta Posisi Spasial Relatif
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
                // Karena kita sudah memindahkan Source ke lokasi Target, kita menggunakan
                // koordinat Target (tgtRelX, tgtRelY) sebagai poros pencerminan.
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

                // Math Branchless Massa Ratio dengan Epsilon (Hukum 3)
                const massRatio = Math.min(srcMass, tgtMass) / (Math.max(srcMass, tgtMass) + 1e-15);

                const combinedScore = (maxSim * 0.7) + (massRatio * 0.3);

                if (combinedScore > bestSim) {
                    bestSim = combinedScore;
                    bestTargetIdx = tIdx;

                    // Legal Control Flow (Pencatatan Axiom untuk Semantic Log & Ekstraksi Delta Akhir)
                    if (maxSim === simId) {
                        bestAxiomType = `TRANSLATE_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                        bestWinningProbe = probeIdentity;
                    } else if (maxSim === simMx) {
                        bestAxiomType = `MIRROR_X+TRANS_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                        bestWinningProbe = probeMirrorX;
                    } else if (maxSim === simMy) {
                        bestAxiomType = `MIRROR_Y+TRANS_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                        bestWinningProbe = probeMirrorY;
                    } else {
                        bestAxiomType = `MIRROR_XY+TRANS_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                        bestWinningProbe = probeMirrorXY;
                    }
                }
            }

            let delta: TensorVector | null = null;

            if (bestTargetIdx !== -1 && bestWinningProbe) {
                usedTargets.add(bestTargetIdx);
                const tgtTensor = targetManifold.getTensor(bestTargetIdx);

                // Delta (Hukum Perubahan Inti) dihitung terhadap raw Source (Kalkulus Kausalitas Absolut).
                // Mengapa bukan bestWinningProbe? Karena bestWinningProbe sudah mencakup Translasi+Geometri.
                // Jika kita mengurangi Target dengan bestWinningProbe, sisa Deltanya cuma (Color Change).
                // Kita ingin Semantic Rule ini merekam TOTAL PERUBAHAN (Shape + Color + Pos).
                // Translasi Axiom sudah menyelaraskan skor Resonance, kini ekstrak Delta totalnya:
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