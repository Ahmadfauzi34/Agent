import { EntityManifold } from '../core/EntityManifold.js';
import { TensorVector, GLOBAL_DIMENSION } from '../core/config.js';
import { FHRR } from '../core/fhrr.js';
import { AxiomGenerator } from './AxiomGenerator.js';
import { UniversalManifold } from '../perception/UniversalManifold.js';
import { CoreSeeds } from '../core/CoreSeeds.js';

export interface AlignmentMatch {
    sourceIndex: number;
    targetIndex: number; // -1 jika tidak ada target
    similarity: number;
    deltaTensor: TensorVector | null; // Selisih vektor (Pergerakan konseptual/spasial)
    deltaX: number; // Kinetika skalar X (Untuk O(1) render updates)
    deltaY: number; // Kinetika skalar Y (Untuk O(1) render updates)
    axiomType: string; // IDENTITY, MIRROR_X, MIRROR_Y, MIRROR_XY
    physicsTier: number; // 0: INSTANT, 1: DOMINO, 2: SWARM
}

/**
 * 🎭 TOPOLOGICAL ALIGNER (Fase 4: The Cortex)
 * Melacak entitas dari Manifold Input ke Manifold Output secara agnostik
 * tanpa memuja Array of Objects (SoA Ready).
 */
import { MAX_ENTITIES } from '../core/config.js';

export class TopologicalAligner {
    private perceiver: UniversalManifold;

    // Memory Pool O(1) untuk menghindari Garbage Collection pada setiap panggilan align()
    private sourceIndicesBuffer: Int32Array;

    constructor(perceiver: UniversalManifold) {
        this.perceiver = perceiver;
        this.sourceIndicesBuffer = new Int32Array(MAX_ENTITIES);
    }

    /**
     * Mencocokkan Entitas dari Manifold Sumber dengan Manifold Target.
     * Menggunakan Imajinasi Kuantum (Probing 4 Skenario Geometri) untuk Resonance Search.
     */
    public align(sourceManifold: EntityManifold, targetManifold: EntityManifold, enableAdvancedPhysics: boolean = false): AlignmentMatch[] {
        const matches: AlignmentMatch[] = [];
        const usedTargets = new Set<number>();

        // 🚨 KOREKSI ARSITEK (Non-Determinisme Sort & Zero-GC):
        // Kita menggunakan Int32Array pre-allocated yang sangat bersahabat dengan L1 Cache.
        // Tidak ada array.push() dinamis yang membuat V8 kewalahan mengumpulkan sampah (GC).
        let sourceCount = 0;
        for(let i = 0; i < sourceManifold.activeCount; i++) {
            if (sourceManifold.masses[i]! > 0) {
                this.sourceIndicesBuffer[sourceCount++] = i;
            }
        }

        // Subarray view tidak menduplikasi memori, ia hanya membuat jendela seleksi
        const activeIndices = this.sourceIndicesBuffer.subarray(0, sourceCount);

        // In-place sort pada typed array
        activeIndices.sort((a, b) => {
            const massDiff = sourceManifold.masses[b]! - sourceManifold.masses[a]!;
            if (massDiff !== 0) return massDiff;
            return a - b; // Tie-breaker deterministik
        });

        for (let i = 0; i < sourceCount; i++) {
            const sIdx = activeIndices[i]!;
            let bestTargetIdx = -1;
            let bestSim = -999.0;
            let bestAxiomType = "IDENTITY";
            let bestDx = 0.0;
            let bestDy = 0.0;

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
                    CoreSeeds.X_AXIS_SEED, CoreSeeds.Y_AXIS_SEED
                );

                // Terapkan translasi ke Source (Memposisikan Source di atas Target)
                const alignedSrcTensor = FHRR.bind(srcTensor, translationAxiom);

                // 🌟 TAHAP 2: 4 IMAJINASI GEOMETRI (Phase Space Probes)
                const probeIdentity = alignedSrcTensor;

                const probeMirrorX = AxiomGenerator.applyReflection(
                    alignedSrcTensor, tgtRelX, tgtRelY,
                    1.0, 0.0,
                    CoreSeeds.X_AXIS_SEED, CoreSeeds.Y_AXIS_SEED
                );

                const probeMirrorY = AxiomGenerator.applyReflection(
                    alignedSrcTensor, tgtRelX, tgtRelY,
                    0.0, 1.0,
                    CoreSeeds.X_AXIS_SEED, CoreSeeds.Y_AXIS_SEED
                );

                const probeMirrorXY = AxiomGenerator.applyReflection(
                    alignedSrcTensor, tgtRelX, tgtRelY,
                    1.0, 1.0,
                    CoreSeeds.X_AXIS_SEED, CoreSeeds.Y_AXIS_SEED
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
                let combinedScore = (maxSim * 0.7) + (massRatio * 0.3);

                // Thermal Noise Injection (Quantum Annealing) pada fase Resonance
                // Jika sistem sedang "mabuk/bermimpi" (Advanced Physics On) di mana insting dasar gagal,
                // beri sedikit toleransi noise (hingga 2%) pada pencocokan agar entitas mau bergerak meski tidak 100% cocok.
                if (enableAdvancedPhysics) {
                    combinedScore += (Math.random() * 0.02);
                }

                if (combinedScore > bestSim) {
                    bestSim = combinedScore;
                    bestTargetIdx = tIdx;
                    bestDx = dx;
                    bestDy = dy;

                    if (maxSim === simId) bestAxiomType = `TRANSLATE_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                    else if (maxSim === simMx) bestAxiomType = `MIRROR_X+TRANS_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                    else if (maxSim === simMy) bestAxiomType = `MIRROR_Y+TRANS_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                    else bestAxiomType = `MIRROR_XY+TRANS_${dx.toFixed(2)}_${dy.toFixed(2)}`;

                    // Misi 2: Color Mutation Tracking
                    // Walaupun kalkulus Tensor sudah secara implisit merekam perubahan warna (Target * Inverse(Source)),
                    // kita melacaknya secara eksplisit dalam log (AxiomType) agar proses pruning dan cross-validation lebih jelas.
                    const srcToken = sourceManifold.tokens[sIdx];
                    const tgtToken = targetManifold.tokens[tIdx];
                    if (srcToken !== tgtToken) {
                        bestAxiomType += `+COLOR(${srcToken}->${tgtToken})`;
                    }
                }
            });

            let delta: TensorVector | null = null;

            if (bestTargetIdx !== -1) {
                usedTargets.add(bestTargetIdx);
                const tgtTensor = targetManifold.getTensor(bestTargetIdx);

                // Kalkulus Makro Sejati (Axiom Extraction)
                // Ini secara matematis berisi: Translasi ⊛ Geometri ⊛ Mutasi Warna (jika ada)
                // Dieksekusi 1x di luar inner-loop untuk mempertahankan kecepatan V8.
                delta = FHRR.bind(tgtTensor, FHRR.inverse(srcTensor));
            }

            matches.push({
                sourceIndex: sIdx,
                targetIndex: bestTargetIdx,
                similarity: bestSim,
                deltaTensor: delta,
                deltaX: bestDx,
                deltaY: bestDy,
                axiomType: bestAxiomType,
                physicsTier: 0 // Default to INSTANT
            });
        }

        this.applyMultiTierPhysicsDetection(matches, sourceManifold);

        return matches;
    }

    /**
     * MULTI-TIER PHYSICS SENSOR (Layered Activation)
     * Menentukan beban fisika yang diperlukan:
     * Tier 0 (INSTANT) : 0ms (Default, Teleportasi ruang hampa)
     * Tier 1 (DOMINO)  : Menengah (Ada potensi tabrakan / dorongan di sepanjang path)
     * Tier 2 (SWARM)   : Berat (>= 3 entitas bergerak searah, simulasi pasir/fluida)
     */
    private applyMultiTierPhysicsDetection(matches: AlignmentMatch[], sourceManifold: EntityManifold): void {
        const momentumCounts = new Map<string, number>();

        // 1. Hitung Voting Momentum untuk Deteksi Swarm
        for (const match of matches) {
            if (match.targetIndex === -1) continue;
            if (Math.abs(match.deltaX) < 0.001 && Math.abs(match.deltaY) < 0.001) continue;

            const key = `${match.deltaX.toFixed(3)}_${match.deltaY.toFixed(3)}`;
            momentumCounts.set(key, (momentumCounts.get(key) || 0) + 1);
        }

        const SWARM_THRESHOLD = 3;

        // 2. Evaluasi Fisika Tier untuk setiap Axiom
        for (const match of matches) {
            if (match.targetIndex === -1) continue;
            if (Math.abs(match.deltaX) < 0.001 && Math.abs(match.deltaY) < 0.001) continue;

            const key = `${match.deltaX.toFixed(3)}_${match.deltaY.toFixed(3)}`;
            const count = momentumCounts.get(key) || 0;

            if (count >= SWARM_THRESHOLD) {
                // TIER 2: SWARM
                match.physicsTier = 2;
                if (!match.axiomType.startsWith("SWARM_")) match.axiomType = `SWARM_${match.axiomType}`;
            } else {
                // TIER 1 vs TIER 0: Cek apakah ada potensi rintangan di jalur gerakan (AABB Raycast Sederhana)
                const isBlocked = this.checkPotentialCollision(sourceManifold, match.sourceIndex, match.deltaX, match.deltaY);
                if (isBlocked) {
                    match.physicsTier = 1; // TIER 1: DOMINO
                    if (!match.axiomType.startsWith("DOMINO_")) match.axiomType = `DOMINO_${match.axiomType}`;
                } else {
                    match.physicsTier = 0; // TIER 0: INSTANT
                }
            }
        }
    }

    /**
     * Mengecek apakah jalur pergerakan entitas terhalang oleh entitas lain.
     * Menggunakan O(N) AABB raycast/sweep aproksimasi kasar.
     */
    private checkPotentialCollision(u: EntityManifold, entityIdx: number, deltaX: number, deltaY: number): boolean {
        const cX1 = u.centersX[entityIdx]!;
        const cY1 = u.centersY[entityIdx]!;
        const rx1 = u.spansX[entityIdx]! / 2.0;
        const ry1 = u.spansY[entityIdx]! / 2.0;

        const nextX = cX1 + deltaX;
        const nextY = cY1 + deltaY;

        for (let j = 0; j < u.activeCount; j++) {
            if (entityIdx === j || u.masses[j] === 0.0) continue;

            const cX2 = u.centersX[j]!;
            const cY2 = u.centersY[j]!;
            const rx2 = u.spansX[j]! / 2.0;
            const ry2 = u.spansY[j]! / 2.0;

            // Cek apakah tujuan akhir menimpa/menabrak entitas lain
            const overlapX = (rx1 + rx2) - Math.abs(nextX - cX2);
            const overlapY = (ry1 + ry2) - Math.abs(nextY - cY2);

            // Kita juga sebaiknya mengecek jalur, tapi untuk ARC, tujuan akhir cukup representatif
            // untuk mengaktifkan Domino
            if (overlapX >= -0.01 && overlapY >= -0.01) {
                return true;
            }
        }
        return false;
    }
}