import { Tensor, PHYSICS } from '../core/config';
import { VSACore } from './VSACore';

export interface SkillRecord {
    seed_id: number;          // Angka identitas (misal: 83045)
    logic_type: string;       // Kategori (misal: 'WAVE_DISPERSION')
    tensor_law: Tensor;       // Hologram murni dari hukum tersebut
}

/**
 * ============================================================================
 * LOGIC SEED BANK (The Universal Memory)
 * ============================================================================
 * Menyimpan semua hukum fisika/kode dalam bentuk Vektor.
 */
export class LogicSeedBank {
    private memoryBank: SkillRecord[] =[];

    /**
     * Mendaftarkan "Insting" atau keahlian baru ke dalam otak agen.
     */
    public injectSkill(seedId: number, logicType: string, rawTensor: Tensor): void {
        this.memoryBank.push({
            seed_id: seedId,
            logic_type: logicType,
            // Stabilisasi memastikan memori selalu tajam dan jernih
            tensor_law: VSACore.stabilize(rawTensor) 
        });
    }

    /**
     * 🔭 THE RESONANCE SCANNER (Pengganti if-else)
     * Mengukur getaran tensor input terhadap seluruh memori di Bank.
     */
    public findBestResonance(queryTensor: Tensor): { match: SkillRecord | null, coherence: number } {
        let maxCoherence = -Infinity;
        let bestMatch: SkillRecord | null = null;
        
        // Karena VSA berjalan di Array Math murni, pencarian ini super cepat
        for (let i = 0; i < this.memoryBank.length; i++) {
            const record = this.memoryBank[i]!;
            const coherence = VSACore.measureCoherence(queryTensor, record.tensor_law);
            
            // Mencari puncak gelombang resonansi tertinggi
            if (coherence > maxCoherence) {
                maxCoherence = coherence;
                bestMatch = record;
            }
        }

        // Jika tidak ada yang mirip (kurang dari toleransi ortogonalitas), kembalikan null
        if (maxCoherence < PHYSICS.ORTHOGONAL_TOLERANCE) {
            return { match: null, coherence: maxCoherence };
        }

        return { match: bestMatch, coherence: maxCoherence };
    }

    /**
     * Mengambil seluruh rekaman memori untuk pemrosesan paralel (Superposisi).
     */
    public getAllRecords(): SkillRecord[] {
        return this.memoryBank;
    }
}
