import { TensorVector, GLOBAL_DIMENSION } from '../core/config.js';
import { FHRR } from '../core/fhrr.js';

/**
 * ============================================================================
 * GLOBAL BLACKBOARD (Collective Consciousness)
 * 100% Branchless | Superposisi Multi-Agen
 * ============================================================================
 * Tempat di mana berbagai agen (Visual, Logika, Spasial) menyatukan
 * pemikiran mereka menjadi satu gelombang kesadaran kolektif.
 */
export class GlobalBlackboard {
    private collectiveState: TensorVector;

    constructor() {
        this.collectiveState = new Float32Array(GLOBAL_DIMENSION);
    }

    /**
     * 🌐 SYNCHRONIZE (Zero If-Else)
     * Menyatukan pemikiran dari berbagai Agen menjadi satu Kesadaran Kolektif.
     */
    public synchronize(agentStates: TensorVector[]): void {
        // 1. Reset state (mengosongkan pikiran kolektif)
        this.collectiveState.fill(0.0);

        // 2. Superposisi semua pemikiran agen (Interferensi Konstruktif)
        for (const state of agentStates) {
            for (let i = 0; i < GLOBAL_DIMENSION; i++) {
                this.collectiveState[i] += state[i]!;
            }
        }

        // 3. Stabilisasi ke Unit Circle (Renormalisasi L2)
        let magSq = 0;
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            magSq += this.collectiveState[i]! * this.collectiveState[i]!;
        }
        const mag = Math.sqrt(magSq);

        // Zero-if logic untuk memastikan tidak membagi dengan nol
        const isValidMag = mag > 1e-12;
        isValidMag && (() => {
            for (let i = 0; i < GLOBAL_DIMENSION; i++) {
                this.collectiveState[i] /= mag;
            }
        })();
    }

    /**
     * Membaca kesadaran kolektif saat ini.
     */
    public readCollectiveState(): TensorVector {
        return this.collectiveState;
    }

    /**
     * 🌌 CONTEXTUALIZE
     * Mengikat (Bind) pemikiran agen individu dengan kesadaran kolektif.
     * Ini membuat agen individu "sadar" akan apa yang dipikirkan agen lain.
     */
    public contextualizeAgent(agentState: TensorVector): TensorVector {
        // Menggunakan binding sirkular FHRR untuk menggabungkan state individu dengan state kolektif
        const bound = FHRR.bind(agentState, this.collectiveState);

        // Renormalisasi L2
        let magSq = 0;
        for (let i = 0; i < GLOBAL_DIMENSION; i++) magSq += bound[i]! * bound[i]!;
        const mag = Math.sqrt(magSq);

        const isValidMag = mag > 1e-12;
        isValidMag && (() => {
            for (let i = 0; i < GLOBAL_DIMENSION; i++) bound[i] /= mag;
        })();

        return bound;
    }
}
