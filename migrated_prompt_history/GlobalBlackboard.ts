import { Tensor, createEmptyTensor } from '../core/config';
import { VSACore } from '../memory/VSACore';

/**
 * ============================================================================
 * GLOBAL BLACKBOARD (Collective Consciousness)
 * 100% Branchless | Superposisi Multi-Agen
 * ============================================================================
 * Tempat di mana berbagai agen (Visual, Logika, Spasial) menyatukan 
 * pemikiran mereka menjadi satu gelombang kesadaran kolektif.
 */
export class GlobalBlackboard {
    private collectiveState: Tensor;

    constructor() {
        this.collectiveState = createEmptyTensor();
    }

    /**
     * 🌐 SYNCHRONIZE (Zero If-Else)
     * Menyatukan pemikiran dari berbagai Agen menjadi satu Kesadaran Kolektif.
     */
    public synchronize(agentStates: Tensor[]): void {
        // 1. Reset state (mengosongkan pikiran kolektif)
        this.collectiveState.fill(0.0);

        // 2. Superposisi semua pemikiran agen (Interferensi Konstruktif)
        const bundled = VSACore.bundle(agentStates);

        // 3. Stabilisasi ke Unit Circle (Renormalisasi)
        this.collectiveState = VSACore.stabilize(bundled);
    }

    /**
     * Membaca kesadaran kolektif saat ini.
     */
    public readCollectiveState(): Tensor {
        return this.collectiveState;
    }

    /**
     * 🌌 CONTEXTUALIZE
     * Mengikat (Bind) pemikiran agen individu dengan kesadaran kolektif.
     * Ini membuat agen individu "sadar" akan apa yang dipikirkan agen lain.
     */
    public contextualizeAgent(agentState: Tensor): Tensor {
        return VSACore.stabilize(VSACore.bind(agentState, this.collectiveState));
    }
}
