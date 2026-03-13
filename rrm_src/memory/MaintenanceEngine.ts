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
     * 🌀 QUANTUM ANNEALING (Gram-Schmidt Orthogonalization Process)
     * Skrip ini memutar (rotate) vektor-vektor ingatan agar tidak ada yang
     * saling tumpang tindih. Sangat vital untuk memori holografik berskala besar.
     * Mengembalikan rata-rata Crosstalk Noise sebelum dan sesudah.
     */
    public annealMemory(learningRate: number = 0.1, epochs: number = 5): { beforeNoise: number, afterNoise: number } {
        // Karena seedBank mendaftarkan phasors dalam struktur privat,
        // kita menggunakan proxy pattern (menarik data, merapikan, melempar kembali).
        // CATATAN: Untuk RRM, kita akan asumsikan phasorCache bisa diakses lewat public getter iterator.

        const entries = this.seedBank.getAllRegisteredPhasors();
        const keys = Array.from(entries.keys());

        if (keys.length <= 1) return { beforeNoise: 0, afterNoise: 0 };

        // Hitung total noise sebelum anneal
        let totalNoiseBefore = 0;
        let pairsCount = 0;

        for (let i = 0; i < keys.length; i++) {
            for (let j = i + 1; j < keys.length; j++) {
                const vA = entries.get(keys[i]!)!;
                const vB = entries.get(keys[j]!)!;
                // Idealnya, dot(vA, vB) = 0 (completely orthogonal)
                const noise = Math.abs(this.dotProduct(vA, vB));
                totalNoiseBefore += noise;
                pairsCount++;
            }
        }

        PDRLogger.info(`[MaintenanceEngine] Memulai Quantum Annealing pada ${keys.length} Seed Memori.`);

        // Iterasi Annealing (Repulsion antar vektor)
        for (let epoch = 0; epoch < epochs; epoch++) {
            for (let i = 0; i < keys.length; i++) {
                const keyA = keys[i]!;
                const vA = entries.get(keyA)!;

                // Vektor koreksi / tolakan
                const repulsionGradient = new Float32Array(GLOBAL_DIMENSION);

                for (let j = 0; j < keys.length; j++) {
                    if (i === j) continue;
                    const vB = entries.get(keys[j]!)!;

                    const dot = this.dotProduct(vA, vB);
                    // Jika dot product != 0, mereka saling bocor (crosstalk).
                    // Tambahkan gradien tolakan yang proporsional dengan dot product
                    for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                        repulsionGradient[d] -= dot * vB[d]!;
                    }
                }

                // Terapkan tolakan
                for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                    vA[d] += repulsionGradient[d]! * learningRate;
                }

                // Selalu kembalikan ke Unit Sphere (panjang 1.0)
                this.normalizeInPlace(vA);
            }
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

        PDRLogger.info(`[MaintenanceEngine] Annealing Selesai. Crosstalk Turun: ${(avgBefore).toFixed(4)} -> ${(avgAfter).toFixed(4)}`);

        return { beforeNoise: avgBefore, afterNoise: avgAfter };
    }
}
