import { TensorVector, GLOBAL_DIMENSION } from '../core/config';
import { PDRLogger } from '../shared/logger.js';

export interface Hypothesis {
    id: string;
    tensor_rule: TensorVector;
    energy: number;     // Modal kepercayaan (Dimulai dari 1.0)
    decay_rate: number; // Kecepatan peluruhan
}

/**
 * ☠️ HAMILTONIAN PRUNER (Fase 4: The Cortex)
 * Medan disipatif (Thermodynamic Dissipation Field).
 * Bertugas "membunuh" tebakan (Hypothesis) aturan yang salah/berantakan
 * dengan meluruhkan energinya menggunakan Decay Exponential.
 * Membantu agen beranjak dari "trauma" masa lalu.
 */
export class HamiltonianPruner {
    private activeHypotheses: Map<string, Hypothesis> = new Map();

    /**
     * Memasukkan tebakan rule baru ke dalam memori kerja sementara.
     */
    public injectHypothesis(id: string, rule: TensorVector, initialEnergy: number = 1.0, decayRate: number = 0.15): void {
        this.activeHypotheses.set(id, {
            id,
            tensor_rule: new Float32Array(rule),
            energy: initialEnergy,
            decay_rate: decayRate
        });
    }

    /**
     * Ticking Time / Evolusi Waktu.
     * Mengurangi energi dari hipotesis yang tidak menerima penguatan.
     * @param globalEntropy Konstanta entropi yang mendikte kerasnya pemangkasan.
     */
    public evolveTime(globalEntropy: number = 1.0): void {
        const keysToRemove: string[] = [];

        for (const [id, hyp] of this.activeHypotheses.entries()) {
            // Hukum Termodinamika: Energi meluruh secara eksponensial (E = E * e^(-decay * entropy))
            hyp.energy *= Math.exp(-hyp.decay_rate * globalEntropy);

            // Operasi Disipatif pada Vektor (Vector Fading)
            // Perlahan mengembalikan vektor aturan ke ruang hampa (Noise Statis 0)
            const fadingFactor = hyp.energy;
            for (let i = 0; i < GLOBAL_DIMENSION; i++) {
                hyp.tensor_rule[i] *= fadingFactor;
            }

            // Batas Kematian (Minimum Description Length Pruning)
            if (hyp.energy < 0.05) {
                keysToRemove.push(id);
            }
        }

        // Sapu bersih ingatan yang sudah mati
        for (const deadId of keysToRemove) {
            this.activeHypotheses.delete(deadId);
            PDRLogger.trace(`[HamiltonianPruner] ☠️ Hipotesis '${deadId}' mati terurai menjadi debu kuantum.`);
        }
    }

    /**
     * Menguatkan Hipotesis (Negative Entropy / Negentropy)
     * Dipanggil ketika agen melihat bukti yang mendukung aturan ini.
     */
    public reinforceHypothesis(id: string, boostEnergy: number = 0.5): void {
        const hyp = this.activeHypotheses.get(id);
        if (hyp) {
            // Batasi energi maksimal ke 1.0 agar tidak meledak
            hyp.energy = Math.min(1.0, hyp.energy + boostEnergy);

            // Rekonstruksi kekuatan vektor (Anti-Fading)
            const restoreFactor = 1.0 / Math.max(0.01, hyp.energy - boostEnergy);
            for (let i = 0; i < GLOBAL_DIMENSION; i++) {
                // Skala aman pencegahan overshooting
                hyp.tensor_rule[i] = Math.max(-1, Math.min(1, hyp.tensor_rule[i]! * restoreFactor));
            }
        }
    }

    /**
     * Mendapatkan sisa hipotesis yang selamat dari seleksi alam.
     */
    public getSurvivingRules(): Hypothesis[] {
        return Array.from(this.activeHypotheses.values());
    }
}