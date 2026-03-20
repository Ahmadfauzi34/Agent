import { EntityManifold } from '../core/EntityManifold.js';
import { TensorVector, GLOBAL_DIMENSION, MAX_ENTITIES } from '../core/config.js';
import { FHRR } from '../core/fhrr.js';
import { CoreSeeds } from '../core/CoreSeeds.js';
import { AxiomGenerator } from './AxiomGenerator.js';
import { SwarmDynamics } from './SwarmDynamics.js';

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
    private mvSpansX: Float32Array;
    private mvSpansY: Float32Array;
    private mvCentersX: Float32Array;
    private mvCentersY: Float32Array;
    private mvMomentumsX: Float32Array;
    private mvMomentumsY: Float32Array;
    private mvEntanglementStatus: Float32Array;

    // Array non-typed
    private mvIds: string[][];
    private mvActiveCount: number[];
    private mvGlobalWidth: number[];
    private mvGlobalHeight: number[];

    // Virtual Manifold View untuk memudahkan parsing & perhitungan
    private universeViews: EntityManifold[];

    constructor() {
        const totalEntities = UNIVERSE_COUNT * MAX_ENTITIES;
        const totalTensorSize = UNIVERSE_COUNT * MAX_ENTITIES * GLOBAL_DIMENSION;

        this.mvTensors = new Float32Array(totalTensorSize);
        this.mvMasses = new Float32Array(totalEntities);
        this.mvTokens = new Float32Array(totalEntities);
        this.mvSpansX = new Float32Array(totalEntities);
        this.mvSpansY = new Float32Array(totalEntities);
        this.mvCentersX = new Float32Array(totalEntities);
        this.mvCentersY = new Float32Array(totalEntities);
        this.mvMomentumsX = new Float32Array(totalEntities);
        this.mvMomentumsY = new Float32Array(totalEntities);
        this.mvEntanglementStatus = new Float32Array(totalEntities);

        this.mvIds = Array.from({ length: UNIVERSE_COUNT }, () => new Array(MAX_ENTITIES).fill(""));
        this.mvActiveCount = new Array(UNIVERSE_COUNT).fill(0);
        this.mvGlobalWidth = new Array(UNIVERSE_COUNT).fill(1);
        this.mvGlobalHeight = new Array(UNIVERSE_COUNT).fill(1);

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
            view.spansX = this.mvSpansX.subarray(eOffset, eOffset + MAX_ENTITIES);
            view.spansY = this.mvSpansY.subarray(eOffset, eOffset + MAX_ENTITIES);
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
        view.globalWidth = this.mvGlobalWidth[universeId]!;
        view.globalHeight = this.mvGlobalHeight[universeId]!;
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
        targetView.spansX.set(source.spansX);
        targetView.spansY.set(source.spansY);
        targetView.centersX.set(source.centersX);
        targetView.centersY.set(source.centersY);
        targetView.momentumsX.set(source.momentumsX);
        targetView.momentumsY.set(source.momentumsY);
        targetView.entanglementStatus.set(source.entanglementStatus);

        for (let i = 0; i < source.activeCount; i++) {
            targetView.ids[i] = source.ids[i]!;
        }

        this.mvActiveCount[targetUniverseId] = source.activeCount;
        this.mvGlobalWidth[targetUniverseId] = source.globalWidth;
        this.mvGlobalHeight[targetUniverseId] = source.globalHeight;

        targetView.activeCount = source.activeCount;
        targetView.globalWidth = source.globalWidth;
        targetView.globalHeight = source.globalHeight;
    }

    /**
     * Terapkan aksioma (misal: Axiom Translasi/Mutasi) ke Universe tertentu.
     * Mengandung FISIKA DOMINO EFEK (Entanglement / Collision Detection).
     */
    public applyAxiom(universeId: number, axiomVector: TensorVector, deltaX: number, deltaY: number, isSwarmAxiom: boolean = false): void {
        const u = this.getUniverse(universeId);

        // INTERUPSI: Jika ini adalah Swarm Axiom (misal gravitasi turun)
        if (isSwarmAxiom) {
            SwarmDynamics.applySwarmGravity(u, deltaX, deltaY);
            return;
        }

        const width = u.globalWidth;
        const height = u.globalHeight;

        // Fase 1: Terapkan perubahan pada agen utama dan catat pergerakan absolutnya
        const movedEntities: number[] = [];

        for (let e = 0; e < u.activeCount; e++) {
            if (u.masses[e] === 0.0) continue;

            // Terapkan translasi ke Tensor entitas
            const entityTensor = u.getTensor(e);
            const futureState = FHRR.bind(entityTensor, axiomVector);
            entityTensor.set(futureState);

            // OPTIMASI DOSA 2: Eksekusi Skalar Kinetik
            if (deltaX !== 0.0 || deltaY !== 0.0) {
                u.centersX[e] += deltaX;
                u.centersY[e] += deltaY;
                movedEntities.push(e);
            }
        }

        // Fase 2: Pengecekan Tabrakan (AABB Collision) & Transfer Entanglement (Domino Effect)
        for (let m = 0; m < movedEntities.length; m++) {
            const e1 = movedEntities[m]!;

            // Konversi dari relatif (0.0-1.0) ke koordinat absolut Piksel
            const cX1 = u.centersX[e1]! * (width - 1);
            const cY1 = u.centersY[e1]! * (height - 1);
            const spanX1 = u.spansX[e1]!;
            const spanY1 = u.spansY[e1]!;

            // Radius Bounding Box A
            const rx1 = spanX1 / 2.0;
            const ry1 = spanY1 / 2.0;

            for (let e2 = 0; e2 < u.activeCount; e2++) {
                // Jangan cek dengan diri sendiri atau yang sudah mati
                if (e1 === e2 || u.masses[e2] === 0.0) continue;

                // Konversi agen kedua ke absolut
                const cX2 = u.centersX[e2]! * (width - 1);
                const cY2 = u.centersY[e2]! * (height - 1);
                const spanX2 = u.spansX[e2]!;
                const spanY2 = u.spansY[e2]!;

                // Radius Bounding Box B
                const rx2 = spanX2 / 2.0;
                const ry2 = spanY2 / 2.0;

                // Branchless AABB Collision Check
                const overlapX = (rx1 + rx2) - Math.abs(cX1 - cX2);
                const overlapY = (ry1 + ry2) - Math.abs(cY1 - cY2);

                const isColliding = Number(overlapX >= 0 && overlapY >= 0);

                if (isColliding === 1) {
                    const isAlreadyMoved = movedEntities.includes(e2);
                    if (!isAlreadyMoved) {
                        // Entitas e2 terjerat oleh e1
                        u.entanglementStatus[e2] = 1.0;
                        u.entanglementStatus[e1] = 1.0;

                        // Pindahkan secara spasial
                        u.centersX[e2] += deltaX;
                        u.centersY[e2] += deltaY;

                        // BANGKITKAN TENSOR TRANSLASI MURNI (Seed Bank Pattern)
                        // Karena Sandbox sekarang memiliki akses O(1) ke CoreSeeds,
                        // kita bisa menghasilkan fasa pergeseran tanpa UniversalManifold!
                        const dominoShiftTensor = AxiomGenerator.generateTranslationAxiom(
                            deltaX, deltaY,
                            CoreSeeds.X_AXIS_SEED, CoreSeeds.Y_AXIS_SEED
                        );

                        // Ikat entitas e2 dengan translasi spasial ini
                        const e2Tensor = u.getTensor(e2);
                        const futureE2State = FHRR.bind(e2Tensor, dominoShiftTensor);
                        e2Tensor.set(futureE2State);
                    }
                }
            }
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
            // Mencegah NaN pada JS Branchless Math (-Infinity * 0)
            let bestResonance = -999.0;

            for (let t = 0; t < targetReality.activeCount; t++) {
                if (targetReality.masses[t] === 0.0) continue;

                const tTensor = targetReality.getTensor(t);
                const resonance = FHRR.similarity(sTensor, tTensor);

                const isBetter = Number(resonance > bestResonance);
                bestResonance = (bestResonance * (1 - isBetter)) + (resonance * isBetter);
            }

            // Jika tidak ada target (bestResonance masih -999), set ke -1 agar surprisenya = 2.0 (Kacau Maksimal)
            if (bestResonance === -999.0) bestResonance = -1.0;

            const surprise = 1.0 - bestResonance;
            totalSurprise += surprise;
            evaluatedEntities++;
        }

        if (evaluatedEntities === 0) return 1.0;

        return totalSurprise / evaluatedEntities;
    }
}
