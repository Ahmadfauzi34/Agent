import { EntityManifold } from '../core/EntityManifold.js';
import { TensorVector, GLOBAL_DIMENSION, MAX_ENTITIES } from '../core/config.js';
import { FHRR } from '../core/fhrr.js';

export const MAX_DEPTH = 5;
export const MAX_BRANCHES = 4;
export const UNIVERSE_COUNT = MAX_DEPTH * MAX_BRANCHES;

/**
 * ============================================================================
 * MULTIVERSE SANDBOX (MCTS Kuantum / Deep Active Inference)
 * ============================================================================
 * Alih-alih membuat `EntityManifold` baru, kita membagi Float32Array raksasa
 * menjadi "Alam Semesta Paralel" yang bisa disalin (memcpy) dalam hitungan µs.
 */
export class MultiverseSandbox {
    // === MULTIVERSE BUFFERS (SOA Raksasa) ===
    private mvTensors: Float32Array;
    private mvMasses: Float32Array;
    private mvTokens: Float32Array;
    private mvSpreads: Float32Array;
    private mvCentersX: Float32Array;
    private mvCentersY: Float32Array;
    private mvMomentumsX: Float32Array;
    private mvMomentumsY: Float32Array;
    private mvEntanglementStatus: Float32Array;

    // Array non-typed
    private mvIds: string[][];
    private mvActiveCount: number[];

    // Virtual Manifold View untuk memudahkan parsing & perhitungan
    private universeViews: EntityManifold[];

    constructor() {
        const totalEntities = UNIVERSE_COUNT * MAX_ENTITIES;
        const totalTensorSize = UNIVERSE_COUNT * MAX_ENTITIES * GLOBAL_DIMENSION;

        this.mvTensors = new Float32Array(totalTensorSize);
        this.mvMasses = new Float32Array(totalEntities);
        this.mvTokens = new Float32Array(totalEntities);
        this.mvSpreads = new Float32Array(totalEntities);
        this.mvCentersX = new Float32Array(totalEntities);
        this.mvCentersY = new Float32Array(totalEntities);
        this.mvMomentumsX = new Float32Array(totalEntities);
        this.mvMomentumsY = new Float32Array(totalEntities);
        this.mvEntanglementStatus = new Float32Array(totalEntities);

        this.mvIds = Array.from({ length: UNIVERSE_COUNT }, () => new Array(MAX_ENTITIES).fill(""));
        this.mvActiveCount = new Array(UNIVERSE_COUNT).fill(0);

        this.universeViews = [];

        // Membangun View (Jendela Pointer O(1)) untuk setiap Alam Semesta
        for (let u = 0; u < UNIVERSE_COUNT; u++) {
            const eOffset = u * MAX_ENTITIES;
            const tOffset = u * MAX_ENTITIES * GLOBAL_DIMENSION;

            const view = new EntityManifold();
            // Override pre-allocated arrays dengan subarray() agar menunjuk ke Multiverse Buffer
            view.tensors = this.mvTensors.subarray(tOffset, tOffset + MAX_ENTITIES * GLOBAL_DIMENSION);
            view.masses = this.mvMasses.subarray(eOffset, eOffset + MAX_ENTITIES);
            view.tokens = this.mvTokens.subarray(eOffset, eOffset + MAX_ENTITIES);
            view.spreads = this.mvSpreads.subarray(eOffset, eOffset + MAX_ENTITIES);
            view.centersX = this.mvCentersX.subarray(eOffset, eOffset + MAX_ENTITIES);
            view.centersY = this.mvCentersY.subarray(eOffset, eOffset + MAX_ENTITIES);
            view.momentumsX = this.mvMomentumsX.subarray(eOffset, eOffset + MAX_ENTITIES);
            view.momentumsY = this.mvMomentumsY.subarray(eOffset, eOffset + MAX_ENTITIES);
            view.entanglementStatus = this.mvEntanglementStatus.subarray(eOffset, eOffset + MAX_ENTITIES);

            view.ids = this.mvIds[u]!;

            this.universeViews.push(view);
        }
    }

    public getUniverse(universeId: number): EntityManifold {
        const view = this.universeViews[universeId]!;
        view.activeCount = this.mvActiveCount[universeId]!;
        return view;
    }

    /**
     * ⚡ THE MULTIVERSE MEMCPY (Zero GC) ⚡
     * Menyalin State dari satu Manifold (bisa dari realWorld atau universe lain)
     * ke dalam Universe ID tertentu di Multiverse secara instan.
     */
    public cloneToUniverse(source: EntityManifold, targetUniverseId: number): void {
        const targetView = this.universeViews[targetUniverseId]!;

        targetView.tensors.set(source.tensors);
        targetView.masses.set(source.masses);
        targetView.tokens.set(source.tokens);
        targetView.spreads.set(source.spreads);
        targetView.centersX.set(source.centersX);
        targetView.centersY.set(source.centersY);
        targetView.momentumsX.set(source.momentumsX);
        targetView.momentumsY.set(source.momentumsY);
        targetView.entanglementStatus.set(source.entanglementStatus);

        for (let i = 0; i < source.activeCount; i++) {
            targetView.ids[i] = source.ids[i]!;
        }

        this.mvActiveCount[targetUniverseId] = source.activeCount;
        targetView.activeCount = source.activeCount;
    }

    /**
     * Terapkan aksioma (misal: Axiom Translasi/Mutasi) ke Universe tertentu.
     */
    public applyAxiom(universeId: number, axiomVector: TensorVector): void {
        const u = this.getUniverse(universeId);

        for (let e = 0; e < u.activeCount; e++) {
            if (u.masses[e] === 0.0) continue;

            const entityTensor = u.getTensor(e);
            const futureState = FHRR.bind(entityTensor, axiomVector);
            entityTensor.set(futureState);
        }
    }

    /**
     * 🧠 KARL FRISTON'S FREE ENERGY EVALUATION 🧠
     * Seberapa berantakan alam semesta ini jika dibandingkan dengan kenyataan target?
     */
    public calculateFreeEnergy(universeId: number, targetReality: EntityManifold): number {
        const u = this.getUniverse(universeId);
        let totalSurprise = 0.0;
        let evaluatedEntities = 0;

        for (let s = 0; s < u.activeCount; s++) {
            if (u.masses[s] === 0.0) continue;

            const sTensor = u.getTensor(s);
            let bestResonance = -Infinity;

            for (let t = 0; t < targetReality.activeCount; t++) {
                if (targetReality.masses[t] === 0.0) continue;

                const tTensor = targetReality.getTensor(t);
                const resonance = FHRR.similarity(sTensor, tTensor);

                const isBetter = Number(resonance > bestResonance);
                bestResonance = (bestResonance * (1 - isBetter)) + (resonance * isBetter);
            }

            const surprise = 1.0 - bestResonance;
            totalSurprise += surprise;
            evaluatedEntities++;
        }

        if (evaluatedEntities === 0) return 1.0;

        return totalSurprise / evaluatedEntities;
    }
}
