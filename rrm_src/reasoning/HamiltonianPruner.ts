import { TensorVector, GLOBAL_DIMENSION, MAX_HYPOTHESES } from '../core/config.js';
import { PDRLogger } from '../shared/logger.js';

export interface Hypothesis {
    id: string; // Tetap disimpan untuk log
    index: number; // Index di array SoA
    tensor_rule: TensorVector; // Pointer ke sub-array SoA
    energy: number;
}

/**
 * ☠️ HAMILTONIAN PRUNER (Fase 4: The Cortex)
 * Medan disipatif (Thermodynamic Dissipation Field).
 * 100% Structure of Arrays (SoA). Bebas Map dan Iterator Dinamis.
 */
export class HamiltonianPruner {
    public activeCount: number = 0;

    // -- SoA Buffers --
    private ids: string[] = new Array(MAX_HYPOTHESES).fill("");
    private energies: Float32Array = new Float32Array(MAX_HYPOTHESES);
    private decayRates: Float32Array = new Float32Array(MAX_HYPOTHESES);
    private ruleTensors: Float32Array = new Float32Array(MAX_HYPOTHESES * GLOBAL_DIMENSION);

    /**
     * Memasukkan tebakan rule baru ke dalam memori kerja sementara.
     */
    public injectHypothesis(id: string, rule: TensorVector, initialEnergy: number = 1.0, decayRate: number = 0.15): void {
        if (this.activeCount >= MAX_HYPOTHESES) {
            PDRLogger.trace("[HamiltonianPruner] Arena kepenuhan. Menolak hipotesis baru.");
            return;
        }

        const idx = this.activeCount;
        this.ids[idx] = id;
        this.energies[idx] = initialEnergy;
        this.decayRates[idx] = decayRate;

        const offset = idx * GLOBAL_DIMENSION;
        this.ruleTensors.set(rule, offset);

        this.activeCount++;
    }

    /**
     * Helper untuk mendapatkan sub-array dari tensor rule.
     */
    private getTensor(idx: number): TensorVector {
        const offset = idx * GLOBAL_DIMENSION;
        return this.ruleTensors.subarray(offset, offset + GLOBAL_DIMENSION);
    }

    /**
     * Ticking Time / Evolusi Waktu (Peluruhan Pasif).
     */
    public evolveTime(globalEntropy: number = 1.0): void {
        for (let i = 0; i < this.activeCount; i++) {
            let energy = this.energies[i]!;
            // Skip ghost state (Hukum 5)
            if (energy <= 0.0) continue;

            const decay = this.decayRates[i]!;

            // Hukum Termodinamika: Energi meluruh secara eksponensial
            energy *= Math.exp(-decay * globalEntropy);

            // Operasi Disipatif pada Vektor (Vector Fading)
            const fadingFactor = energy;
            const tensor = this.getTensor(i);
            for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                tensor[d] *= fadingFactor;
            }

            // Batas Kematian (Minimum Description Length Pruning)
            if (energy < 0.05) {
                this.energies[i] = 0.0; // Vacuum state (Hukum 5: Jangan dislice)
                PDRLogger.trace(`[HamiltonianPruner] ☠️ Hipotesis '${this.ids[i]}' mati terurai menjadi debu kuantum.`);
            } else {
                this.energies[i] = energy;
            }
        }
    }

    /**
     * Menguatkan Hipotesis (Negative Entropy / Negentropy)
     */
    public reinforceHypothesis(index: number, boostEnergy: number = 0.5): void {
        let energy = this.energies[index]!;
        if (energy <= 0.0) return;

        const newEnergy = Math.min(1.0, energy + boostEnergy);

        // Rekonstruksi kekuatan vektor (Anti-Fading)
        const restoreFactor = 1.0 / Math.max(0.01, energy - boostEnergy);
        const tensor = this.getTensor(index);

        for (let d = 0; d < GLOBAL_DIMENSION; d++) {
            // Skala aman pencegahan overshooting
            tensor[d] = Math.max(-1, Math.min(1, tensor[d]! * restoreFactor));
        }

        this.energies[index] = newEnergy;
    }

    /**
     * 💥 INTERFERENSI DESTRUKTIF (The Eraser)
     * Menggunakan Indeks SoA untuk kecepatan.
     */
    public punishHypothesis(index: number, penaltyEnergy: number = 0.5): void {
        let energy = this.energies[index]!;
        if (energy <= 0.0) return;

        energy -= penaltyEnergy;

        // Operasi Disipatif Instan (Fading)
        const fadingFactor = Math.max(0.0, energy);
        const tensor = this.getTensor(index);
        for (let d = 0; d < GLOBAL_DIMENSION; d++) {
            tensor[d] *= fadingFactor;
        }

        // Kematian Instan
        if (energy < 0.05) {
            this.energies[index] = 0.0;
            PDRLogger.trace(`[HamiltonianPruner] ⚡ ERASED: Hipotesis '${this.ids[index]}' dimusnahkan secara paksa oleh Interferensi Destruktif.`);
        } else {
            this.energies[index] = energy;
        }
    }

    /**
     * Mendapatkan sisa hipotesis yang selamat dari seleksi alam.
     */
    public getSurvivingRules(): Hypothesis[] {
        const survivors: Hypothesis[] = [];
        for (let i = 0; i < this.activeCount; i++) {
            if (this.energies[i]! > 0.0) {
                survivors.push({
                    id: this.ids[i]!,
                    index: i,
                    tensor_rule: this.getTensor(i),
                    energy: this.energies[i]!
                });
            }
        }
        return survivors;
    }
}