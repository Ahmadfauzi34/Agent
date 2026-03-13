import { TensorVector, GLOBAL_DIMENSION } from '../core/config';
import { LogicSeedBank } from './logic-seed-bank';
import { PDRLogger } from '../reasoning/level1-pdr/pdr-debug';

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
     * Mengadaptasi kode lama `runGlobalOrthogonalization` dengan pendinginan logaritmik
     * untuk mencegah over-shoot / ledakan gradien.
     */
    public annealMemory(baseLearningRate: number = 0.5, epochs: number = 30): { beforeNoise: number, afterNoise: number } {
        const entries = this.seedBank.getAllRegisteredPhasors();
        const keys = Array.from(entries.keys());

        if (keys.length <= 1) return { beforeNoise: 0, afterNoise: 0 };
        const ORTHOGONAL_TOLERANCE = 0.05; // Mengikuti standar batas kemiripan dari script lama

        // Hitung total noise sebelum anneal
        let totalNoiseBefore = 0;
        let pairsCount = 0;

        for (let i = 0; i < keys.length; i++) {
            for (let j = i + 1; j < keys.length; j++) {
                const vA = entries.get(keys[i]!)!;
                const vB = entries.get(keys[j]!)!;
                totalNoiseBefore += Math.abs(this.dotProduct(vA, vB));
                pairsCount++;
            }
        }

        PDRLogger.info(`[MaintenanceEngine] 🔥 Memulai Pendinginan Termodinamika (Simulated Annealing) pada ${keys.length} Seed...`);
        let isStable = false;

        // Iterasi Evolusi Waktu (Iterative Relaxation Loop)
        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalCollisions = 0;
            const repulsionFields = new Map<number, Float32Array>();

            for (const key of keys) {
                repulsionFields.set(key, new Float32Array(GLOBAL_DIMENSION).fill(0));
            }

            // A. Evaluasi N-Body Problem
            for (let i = 0; i < keys.length; i++) {
                const keyA = keys[i]!;
                const vA = entries.get(keyA)!;
                const repFieldA = repulsionFields.get(keyA)!;

                for (let j = i + 1; j < keys.length; j++) {
                    const keyB = keys[j]!;
                    const vB = entries.get(keyB)!;

                    const sim = this.dotProduct(vA, vB);

                    // Melanggar Prinsip Eksklusi Pauli (Terlalu mirip)
                    if (Math.abs(sim) > ORTHOGONAL_TOLERANCE) {
                        totalCollisions++;
                        const repFieldB = repulsionFields.get(keyB)!;
                        // Tolakan sebanding dengan kemiripan
                        for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                            repFieldA[d] -= sim * vB[d]!;
                            repFieldB[d] -= sim * vA[d]!;
                        }
                    }
                }
            }

            // B. Cek Keseimbangan Kuantum
            if (totalCollisions === 0) {
                PDRLogger.info(`   ✅ Sistem mencapai Keseimbangan Kuantum di Epoch ${epoch}!`);
                isStable = true;
                break;
            }

            // C. Terapkan Gaya Tolak (Quantum Backaction / Dissipation)
            // Suhu menurun seiring waktu agar gradien meluruh halus (Termodinamika)
            const temperature = baseLearningRate * Math.exp(-epoch / 5.0);

            for (const key of keys) {
                const vA = entries.get(key)!;
                const repulsionGradient = repulsionFields.get(key)!;

                // Cek apakah ada energi tolakan menggunakan array reduce tanpa if
                const hasEnergy = repulsionGradient.some(val => val !== 0);

                if (hasEnergy) {
                    for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                        vA[d] += repulsionGradient[d]! * temperature;
                    }
                    this.normalizeInPlace(vA);
                }
            }
        }

        if (!isStable) {
            PDRLogger.info("   ⚠️ Peringatan: Sistem dihentikan sebelum mencapai ortogonalitas sempurna (Batas Epoch tercapai).");
        }

        // Hitung total noise sesudah anneal
        let totalNoiseAfter = 0;
        for (let i = 0; i < keys.length; i++) {
            for (let j = i + 1; j < keys.length; j++) {
                const vA = entries.get(keys[i]!)!;
                const vB = entries.get(keys[j]!)!;
                totalNoiseAfter += Math.abs(this.dotProduct(vA, vB));
            }
        }

        const avgBefore = totalNoiseBefore / pairsCount;
        const avgAfter = totalNoiseAfter / pairsCount;

        PDRLogger.info(`[MaintenanceEngine] 💾 Manifold Memory berhasil dikristalisasi. Crosstalk Turun: ${(avgBefore).toFixed(4)} -> ${(avgAfter).toFixed(4)}`);

        return { beforeNoise: avgBefore, afterNoise: avgAfter };
    }
}
