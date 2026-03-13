import { Tensor, PHYSICS } from '../core/config';

export interface LogicHypothesis {
    tensor_law: Tensor;
    mdl_complexity: number; 
    probability: number;    
}

export class HamiltonianPruner {
    
    /**
     * EVOLUSI WAKTU & KEMATIAN OTOMATIS (ZERO IF-ELSE)
     */
    public static evolve(hypotheses: LogicHypothesis[], deltaTime: number): void {
        for (let i = 0; i < hypotheses.length; i++) {
            const h = hypotheses[i]!;

            // 1. Peluruhan Eksponensial Kontinu
            const decayFactor = Math.exp(-(h.mdl_complexity * deltaTime) / PHYSICS.H_BAR);
            h.probability *= decayFactor;

            // 2. AMBANG BATAS MATEMATIS (Thresholding without If)
            // Number(h.probability >= 0.01) menghasilkan 1 jika hidup, 0 jika mati.
            const survivalMask = Number(h.probability >= PHYSICS.COLLAPSE_THRESHOLD);

            // 3. ANNIHILATION (Penghancuran)
            // Jika mati, probabilitas langsung diset 0 absolut.
            h.probability *= survivalMask;

            // 4. KEMATIAN TENSOR
            // Matikan getaran tensor secara simultan
            for (let d = 0; d < h.tensor_law.length; d++) {
                h.tensor_law[d] *= survivalMask; 
            }
        }
        // Catatan: Array length tetap sama, tapi hipotesis yang mati 
        // murni berisi angka 0 dan tidak akan mempengaruhi Bundling nantinya.
    }

    /**
     * MENGHITUNG ENTROPI (Beban MDL) Tanpa If-Else
     */
    public static calculateTensorMDL(tensor_law: Tensor): number {
        let entropy = 0.0;
        
        for (let i = 0; i < tensor_law.length; i += 2) {
            // Tambahkan EPSILON agar log() tidak meledak ke -Infinity (Zero Branching)
            const val = Math.abs(tensor_law[i]!) + PHYSICS.EPSILON;
            
            // Rumus Shannon Entropy
            entropy -= val * Math.log(val);
        }
        
        return entropy;
    }
}
