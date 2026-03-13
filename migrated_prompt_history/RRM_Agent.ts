import { CognitiveEntity } from '../core/CognitiveEntity';
import { Tensor, COMPLEX_DIMENSION, createEmptyTensor } from '../core/config';
import { VSACore } from '../memory/VSACore';
import { LogicSeedBank } from '../memory/LogicSeedBank';
import { WaveDynamics } from '../reasoning/WaveDynamics';
import { HamiltonianPruner, LogicHypothesis } from '../reasoning/HamiltonianPruner';

/**
 * ============================================================================
 * THE RECURSIVE REASONING MACHINE (RRM) AGENT
 * 100% Branchless | Differentiable | Holographic
 * ============================================================================
 */
export class RRM_Agent {
    private seedBank: LogicSeedBank;

    constructor(seedBank: LogicSeedBank) {
        this.seedBank = seedBank;
    }

    /**
     * SIKLUS KESADARAN UTAMA (The Continuous Thought Loop)
     * Mengambil entitas, melemparnya ke lautan memori, dan mengembalikan entitas masa depan.
     * 
     * @param inputEntities Partikel realitas saat ini (Dari Grid atau Teks)
     * @param entanglementMatrix Matriks keterikatan awal (opsional)
     * @param evolutionSteps Berapa siklus waktu (Delta T) yang ingin dijalankan
     */
    public think(
        inputEntities: CognitiveEntity[], 
        entanglementMatrix: Float32Array[],
        evolutionSteps: number = 3
    ): CognitiveEntity[] {
        
        // 1. GESTALT COMPRESSION (Menyatukan semua entitas menjadi 1 getaran Semesta)
        const universeState = createEmptyTensor();
        for (let i = 0; i < inputEntities.length; i++) {
            const ent = inputEntities[i]!;
            // Superposisi tanpa percabangan (Bundle)
            for (let d = 0; d < COMPLEX_DIMENSION; d++) {
                universeState[d] += ent.state_vector[d]!;
            }
        }
        VSACore.stabilize(universeState);

        // 2. MEMORY RESONANCE (Mengambil semua memori, beri bobot berdasarkan kemiripan)
        // Kita ubah Bank Memori menjadi Array of Hypotheses
        const allMemories = this.seedBank.getAllRecords();
        const hypotheses: LogicHypothesis[] = new Array(allMemories.length);

        for (let i = 0; i < allMemories.length; i++) {
            const mem = allMemories[i]!;
            // Semakin mirip Semesta dengan Memori, probabilitas awalnya semakin tinggi
            const coherence = VSACore.measureCoherence(universeState, mem.tensor_law);
            
            // ReLU fisik: Abaikan korelasi negatif
            const initialProb = Math.max(0, coherence); 
            
            hypotheses[i] = {
                tensor_law: new Float32Array(mem.tensor_law), // Copy untuk dimanipulasi
                mdl_complexity: HamiltonianPruner.calculateTensorMDL(mem.tensor_law),
                probability: initialProb
            };
        }

        // 3. THE CRUCIBLE (Dinamika Disipatif & Evolusi Waktu)
        for (let t = 0; t < evolutionSteps; t++) {
            // Terapkan Keterikatan (Entanglement) pada fisik entitas
            WaveDynamics.applyUniversalEntanglement(inputEntities, entanglementMatrix);

            // Terapkan Peluruhan pada pikiran (Pruning)
            HamiltonianPruner.evolve(hypotheses, 1.0); // DeltaTime = 1.0
        }

        // 4. SYNTHESIS (Menumbuk sisa pikiran yang hidup menjadi Satu Hukum Masa Depan)
        const dominantLaw = createEmptyTensor();
        let totalProb = 1e-15; // Cegah Division by Zero

        for (let i = 0; i < hypotheses.length; i++) {
            const h = hypotheses[i]!;
            totalProb += h.probability;
            
            // Hukum yang probabilitasnya tinggi akan bersuara paling keras
            for (let d = 0; d < COMPLEX_DIMENSION; d++) {
                dominantLaw[d] += h.tensor_law[d]! * h.probability;
            }
        }

        // Normalisasi Hukum Final
        for (let d = 0; d < COMPLEX_DIMENSION; d++) {
            dominantLaw[d] /= totalProb;
        }
        VSACore.stabilize(dominantLaw);

        // 5. MATERIALIZATION (Menerapkan Hukum Final ke setiap Entitas)
        const futureEntities: CognitiveEntity[] = new Array(inputEntities.length);
        
        for (let i = 0; i < inputEntities.length; i++) {
            const oldEnt = inputEntities[i]!;
            
            // Duplikasi entitas (Hukum fisika tidak menghancurkan masa lalu)
            const futureEnt: CognitiveEntity = {
                id: oldEnt.id + "_future",
                token: oldEnt.token,
                mass: oldEnt.mass,
                spread: oldEnt.spread,
                rel_center: { ...oldEnt.rel_center },
                momentum: { ...oldEnt.momentum },
                entangled_with: new Set(oldEnt.entangled_with),
                state_vector: new Float32Array(oldEnt.state_vector)
            };

            // Aplikasikan Transformasi Spasial/Kausal (BINDING)
            WaveDynamics.applyPhaseShift(futureEnt, dominantLaw);
            
            futureEntities[i] = futureEnt;
        }

        return futureEntities;
    }
}
