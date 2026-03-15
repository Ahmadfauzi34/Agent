import { TensorVector, GLOBAL_DIMENSION } from '../core/config.js';
import { LogicSeedBank } from './logic-seed-bank.js';
import { PDRLogger } from '../shared/logger.js';

/**
 * 🛠️ MAINTENANCE ENGINE (The Quantum Annealer)
 * Modul fase 3. Bekerja secara offline/jeda siklus untuk meregulasi dan
 * mendisipasikan crosstalk antar holographic_law.
 * Memastikan semua vektor Seed di LogicSeedBank 100% Ortogonal (Tegak Lurus).
 */
export class MaintenanceEngine {
    private seedBank: LogicSeedBank;

    constructor(seedBank: LogicSeedBank) {
        this.seedBank = seedBank;
    }

    /**
     * Hitung Dot Product antar dua TensorVector murni (Float32Array)
     */
    private dotProduct(a: TensorVector, b: TensorVector): number {
        let sum = 0;
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            sum += a[i]! * b[i]!;
        }
        return sum;
    }

    /**
     * Hitung panjang/magnitude vektor
     */
    private magnitude(v: TensorVector): number {
        let sumSq = 0;
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            sumSq += v[i]! * v[i]!;
        }
        return Math.sqrt(sumSq);
    }

    /**
     * Normalisasi vektor (L2 Norm) agar kembali ke magnitude 1.0 (Unitary)
     */
    private normalizeInPlace(v: TensorVector): void {
        const mag = this.magnitude(v);
        if (mag > 1e-12) {
            for (let i = 0; i < GLOBAL_DIMENSION; i++) {
                v[i] /= mag;
            }
        }
    }

    /**
     * 🌀 QUANTUM ANNEALING (Termodinamika Kuantum & Gram-Schmidt)
     * V8 Optimized SoA Array Traversal. Menyingkirkan Map dan dynamic keys.
     */
    public annealMemory(baseLearningRate: number = 0.5, epochs: number = 30): { beforeNoise: number, afterNoise: number } {
        const numSeeds = this.seedBank.activeCount;
        if (numSeeds <= 1) return { beforeNoise: 0, afterNoise: 0 };

        const ORTHOGONAL_TOLERANCE = 0.05;

        // Hitung total noise sebelum anneal (L1 Cache Optimized)
        let totalNoiseBefore = 0;
        let pairsCount = 0;

        for (let i = 0; i < numSeeds; i++) {
            const vA = this.seedBank.getTensor(i);
            for (let j = i + 1; j < numSeeds; j++) {
                const vB = this.seedBank.getTensor(j);
                totalNoiseBefore += Math.abs(this.dotProduct(vA, vB));
                pairsCount++;
            }
        }

        PDRLogger.info(`[MaintenanceEngine] 🔥 Memulai Pendinginan Termodinamika (Simulated Annealing) pada ${numSeeds} Seed...`);
        let isStable = false;

        // Buffer Gaya Tolak Global (SoA style)
        const repulsionFields = new Float32Array(numSeeds * GLOBAL_DIMENSION);

        // Iterasi Evolusi Waktu
        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalCollisions = 0;
            repulsionFields.fill(0.0);

            // A. Evaluasi N-Body Problem (O(N^2) tapi Cache-friendly)
            for (let i = 0; i < numSeeds; i++) {
                const vA = this.seedBank.getTensor(i);
                const offsetA = i * GLOBAL_DIMENSION;

                for (let j = i + 1; j < numSeeds; j++) {
                    const vB = this.seedBank.getTensor(j);
                    const offsetB = j * GLOBAL_DIMENSION;

                    const sim = this.dotProduct(vA, vB);

                    // Melanggar Prinsip Eksklusi Pauli
                    if (Math.abs(sim) > ORTHOGONAL_TOLERANCE) {
                        totalCollisions++;
                        // Tolakan sebanding dengan kemiripan
                        for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                            repulsionFields[offsetA + d] -= sim * vB[d]!;
                            repulsionFields[offsetB + d] -= sim * vA[d]!;
                        }
                    }
                }
            }

            // B. Cek Keseimbangan
            if (totalCollisions === 0) {
                PDRLogger.info(`   ✅ Sistem mencapai Keseimbangan Kuantum di Epoch ${epoch}!`);
                isStable = true;
                break;
            }

            // C. Terapkan Gaya Tolak (Quantum Backaction)
            const temperature = baseLearningRate * Math.exp(-epoch / 5.0);

            for (let i = 0; i < numSeeds; i++) {
                const vA = this.seedBank.getTensor(i);
                const offsetA = i * GLOBAL_DIMENSION;

                let hasEnergy = false;
                for(let d=0; d<GLOBAL_DIMENSION; d++){
                    if(repulsionFields[offsetA + d] !== 0) hasEnergy = true;
                }

                if (hasEnergy) {
                    for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                        vA[d] += repulsionFields[offsetA + d]! * temperature;
                    }
                    this.normalizeInPlace(vA); // Ini mengubah data asli di seedBank karena pass-by-reference subarray
                }
            }
        }

        if (!isStable) {
            PDRLogger.info("   ⚠️ Peringatan: Sistem dihentikan sebelum mencapai ortogonalitas sempurna (Batas Epoch tercapai).");
        }

        // Hitung total noise sesudah anneal
        let totalNoiseAfter = 0;
        for (let i = 0; i < numSeeds; i++) {
            const vA = this.seedBank.getTensor(i);
            for (let j = i + 1; j < numSeeds; j++) {
                const vB = this.seedBank.getTensor(j);
                totalNoiseAfter += Math.abs(this.dotProduct(vA, vB));
            }
        }

        const avgBefore = totalNoiseBefore / pairsCount;
        const avgAfter = totalNoiseAfter / pairsCount;

        PDRLogger.info(`[MaintenanceEngine] 💾 Manifold Memory berhasil dikristalisasi. Crosstalk Turun: ${(avgBefore).toFixed(4)} -> ${(avgAfter).toFixed(4)}`);

        return { beforeNoise: avgBefore, afterNoise: avgAfter };
    }
}
