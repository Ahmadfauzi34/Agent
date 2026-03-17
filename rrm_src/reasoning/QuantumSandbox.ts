import { EntityManifold } from '../core/EntityManifold.js';
import { TensorVector, GLOBAL_DIMENSION } from '../core/config.js';
import { FHRR } from '../core/fhrr.js';

/**
 * ============================================================================
 * QUANTUM SANDBOX (Ruang Imajinasi / The Twin Universe)
 * ============================================================================
 * Menggunakan prinsip "Zero-Garbage Collection" dan "Memcpy".
 * Alih-alih membuat objek Manifold baru setiap kali agen ingin berimajinasi,
 * Sandbox adalah pre-allocated buffer yang di-overwrite secara instan.
 */
export class QuantumSandbox {
    // Alam Semesta Kembar (Hanya 1 instance seumur hidup program)
    public readonly sandboxWorld: EntityManifold;

    // Papan Buram Global (Superposisi Fokus Kesadaran)
    public readonly globalBlackboard: TensorVector;

    constructor() {
        this.sandboxWorld = new EntityManifold();
        this.globalBlackboard = FHRR.create(); // 8192-D Array
    }

    /**
     * ⚡ THE MEMCPY CLONE (V8 Optimized) ⚡
     * Menyalin realitas (EntityManifold asli) ke dalam Ruang Imajinasi
     * dalam orde mikrodetik (Tanpa Loop JavaScript, menggunakan instruksi C++).
     */
    public cloneReality(realWorld: EntityManifold): void {
        // C-Level Memcpy (Super Cepat & Zero GC)
        this.sandboxWorld.tensors.set(realWorld.tensors);
        this.sandboxWorld.masses.set(realWorld.masses);
        this.sandboxWorld.tokens.set(realWorld.tokens);
        this.sandboxWorld.spansX.set(realWorld.spansX);
        this.sandboxWorld.spansY.set(realWorld.spansY);
        this.sandboxWorld.centersX.set(realWorld.centersX);
        this.sandboxWorld.centersY.set(realWorld.centersY);
        this.sandboxWorld.momentumsX.set(realWorld.momentumsX);
        this.sandboxWorld.momentumsY.set(realWorld.momentumsY);
        this.sandboxWorld.entanglementStatus.set(realWorld.entanglementStatus);

        // Array biasa (Perlu iterasi singkat, tapi jumlahnya kecil, max 500)
        for (let i = 0; i < realWorld.activeCount; i++) {
            this.sandboxWorld.ids[i] = realWorld.ids[i]!;
        }

        // Sinkronisasi meta-data
        this.sandboxWorld.activeCount = realWorld.activeCount;
    }

    /**
     * Terapkan sebuah Aksioma (Hukum Fisika/Kausalitas) ke SELURUH entitas
     * di dalam Ruang Imajinasi secara bersamaan.
     * Misal: axiomVector = "Translasi +3X dan Berubah Jadi Biru"
     */
    public applyAxiomToSandbox(axiomVector: TensorVector): void {
        const numEntities = this.sandboxWorld.activeCount;

        for (let e = 0; e < numEntities; e++) {
            if (this.sandboxWorld.masses[e] === 0.0) continue; // Abaikan ruang hampa

            const entityTensor = this.sandboxWorld.getTensor(e);

            // IMAJINASI: Entitas * Hukum Alam = Masa Depan Entitas
            const futureState = FHRR.bind(entityTensor, axiomVector);

            // Simpan Masa Depan kembali ke Sandbox
            entityTensor.set(futureState);
        }
    }

    /**
     * 🧠 KARL FRISTON'S FREE ENERGY (Surprise Minimization) 🧠
     * Setelah agen berimajinasi (applyAxiom), seberapa kacaukah imajinasinya
     * jika dibandingkan dengan Target Realitas (Test Pair)?
     *
     * @returns Free Energy (0.0 = Sempurna/Sama Persis, 1.0 = Sangat Kacau/Surprise Tinggi)
     */
    public calculateFreeEnergy(targetReality: EntityManifold): number {
        let totalSurprise = 0.0;
        let evaluatedEntities = 0;

        const sandboxEntities = this.sandboxWorld.activeCount;
        const targetEntities = targetReality.activeCount;

        // Jika jumlah entitas saja berbeda drastis, itu sudah sebuah kejutan (Surprise) besar
        // Tapi kita akan lebih fokus pada topologi fasanya.

        // Untuk setiap benda di imajinasi, carilah pasangannya di dunia target
        // yang paling mirip (Resonansi Tertinggi).
        for (let s = 0; s < sandboxEntities; s++) {
            if (this.sandboxWorld.masses[s] === 0.0) continue;

            const sTensor = this.sandboxWorld.getTensor(s);
            let bestResonance = -Infinity;

            for (let t = 0; t < targetEntities; t++) {
                if (targetReality.masses[t] === 0.0) continue;

                const tTensor = targetReality.getTensor(t);
                const resonance = FHRR.similarity(sTensor, tTensor);

                // Branchless Max
                const isBetter = Number(resonance > bestResonance);
                bestResonance = (bestResonance * (1 - isBetter)) + (resonance * isBetter);
            }

            // Free Energy = 1.0 - Resonance (Semakin resonan, semakin kecil Free Energy-nya)
            // Jika bestResonance negatif (saling tolak), Surprise meledak > 1.0
            const surprise = 1.0 - bestResonance;
            totalSurprise += surprise;
            evaluatedEntities++;
        }

        if (evaluatedEntities === 0) return 1.0; // Vakum total = Kejutan Maksimal

        // Rata-rata Free Energy dari seluruh alam semesta imajinasi
        return totalSurprise / evaluatedEntities;
    }

    /**
     * Papan Buram (The Global Blackboard)
     * Menjumlahkan semua entitas di Sandbox ke dalam satu gelombang kacau (Noisy Superposition).
     * Berguna untuk mencari "Gestalt" atau pola umum layar.
     */
    public updateBlackboard(): void {
        this.globalBlackboard.fill(0.0); // Bersihkan papan

        const numEntities = this.sandboxWorld.activeCount;
        for (let e = 0; e < numEntities; e++) {
            if (this.sandboxWorld.masses[e] === 0.0) continue;

            const eTensor = this.sandboxWorld.getTensor(e);

            // Superposisi (Bundling) tanpa L2 Norm dulu agar magnitudo benda solid lebih kuat
            for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                this.globalBlackboard[d] += eTensor[d]!;
            }
        }

        // Opsional: Bisa di L2-Normalize jika ingin menjadikannya Tensor murni
        // FHRR.normalize(this.globalBlackboard);
    }
}
