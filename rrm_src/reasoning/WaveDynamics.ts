import { EntityManifold } from '../core/EntityManifold.js';
import { TensorVector, GLOBAL_DIMENSION, MAX_ENTITIES } from '../core/config.js';
import { EntanglementOptimizer } from './EntanglementOptimizer.js';

/**
 * 🌊 WAVE DYNAMICS (Fase 4)
 * OOP-Free Hebbian Learning Matrix & Huygens-Fresnel Navigation.
 */
export class WaveDynamics {
    // 🏛️ HUKUM 8: Gunakan satu blok memori (N * N) agar L1 Cache tidak meleset
    private entanglementMatrix: Float32Array;
    private manifoldRef: EntityManifold | null = null;

    constructor() {
        // Alokasi memori 1D kontigu berukuran N * N.
        // Array of Objects / Array of TypedArrays dihindari sepenuhnya.
        this.entanglementMatrix = new Float32Array(MAX_ENTITIES * MAX_ENTITIES).fill(0.0);

        // Self-entanglement
        for (let i = 0; i < MAX_ENTITIES; i++) {
            // Akses [i][i] menggunakan offset 1D
            this.entanglementMatrix[i * MAX_ENTITIES + i] = 1.0;
        }
    }

    /**
     * Mendaftarkan reference ke EntityManifold (SoA).
     */
    public initializeEntities(manifold: EntityManifold): void {
        this.manifoldRef = manifold;
        const count = manifold.activeCount;

        // Reset matrix only for active boundaries
        for (let i = 0; i < count; i++) {
            const rowOffset = i * MAX_ENTITIES;
            this.entanglementMatrix.fill(0.0, rowOffset, rowOffset + count);
            this.entanglementMatrix[rowOffset + i] = 1.0;
        }
    }

    /**
     * Menjalankan Hebbian Learning di atas Structure of Arrays.
     */
    public evolveEntanglement(learningRate: number = 0.1): void {
        if (!this.manifoldRef) return;
        EntanglementOptimizer.optimize(this.manifoldRef, this.entanglementMatrix, learningRate);
    }

    /**
     * Memperbarui tensor inPlace berdasarkan daya pikat/tolak (Contrastive Update).
     * Mensimulasikan 'PhaseGradientOptimizer' lama.
     */
    private contrastiveUpdateInPlace(
        agentTensor: TensorVector,
        repulsorTensor: TensorVector,
        attractorTensor: TensorVector,
        alpha: number
    ): void {
        // Tarik ke arah attractor, tolak dari repulsor
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            agentTensor[i] += alpha * (attractorTensor[i]! - repulsorTensor[i]!);
        }

        // L2 Normalization
        let magSq = 0;
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            magSq += agentTensor[i]! * agentTensor[i]!;
        }
        const mag = Math.sqrt(magSq);

        // Menggunakan EPSILON agar tidak perlu if (mag > 0)
        // Ini adalah contoh Math Branchless sejati!
        const invMag = 1.0 / (mag + 1e-15);
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            agentTensor[i] *= invMag;
        }
    }

    /**
     * WAVE GRAVITY DRIVE (Huygens-Fresnel Navigation)
     * Mengkalkulasi pergerakan agen berdasarkan atraktor dan repulsor tensor di sekitarnya.
     */
    public applyWaveGravity(agentIndex: number, attractors: TensorVector[], repulsors: TensorVector[]): void {
        if (!this.manifoldRef) return;
        const agentTensor = this.manifoldRef.getTensor(agentIndex);

        const totalAttractor = new Float32Array(GLOBAL_DIMENSION).fill(0);
        for (const attr of attractors) {
            for (let i = 0; i < GLOBAL_DIMENSION; i++) totalAttractor[i] += attr[i]!;
        }

        const totalRepulsor = new Float32Array(GLOBAL_DIMENSION).fill(0);
        for (const rep of repulsors) {
            for (let i = 0; i < GLOBAL_DIMENSION; i++) totalRepulsor[i] += rep[i]!;
        }

        // Terapkan medan ke tensor entitas
        this.contrastiveUpdateInPlace(agentTensor, totalRepulsor, totalAttractor, 0.8);
    }

    /**
     * TRIGGER COLLAPSE
     * Meruntuhkan gelombang informasi ke agen-agen yang saling terikat (Entangled).
     * Memproses pointer SoA secara linier 1D L1 cache-friendly.
     */
    public triggerCollapse(sourceIndex: number): void {
        if (!this.manifoldRef) return;
        const numEntities = this.manifoldRef.activeCount;

        const sourceTensor = this.manifoldRef.getTensor(sourceIndex);
        const sourceRowOffset = sourceIndex * MAX_ENTITIES;

        for (let targetIndex = 0; targetIndex < numEntities; targetIndex++) {
            // V8 Optimized Control Flow (Skip self or ghost entities - The "Best of Both Worlds" Rule)
            if (targetIndex === sourceIndex || this.manifoldRef.masses[targetIndex] === 0.0) continue;

            const targetTensor = this.manifoldRef.getTensor(targetIndex);
            const entanglementWeight = this.entanglementMatrix[sourceRowOffset + targetIndex]!;

            // Partial collapse berdasarkan coupling (0.0 to 1.0) menggunakan Math Branchless
            for (let i = 0; i < GLOBAL_DIMENSION; i++) {
                // Interpolasi linear murni: W * Source + (1-W) * Target
                targetTensor[i] = (entanglementWeight * sourceTensor[i]!) + ((1.0 - entanglementWeight) * targetTensor[i]!);
            }

            // Perbarui properti entanglement di array flat
            this.manifoldRef.entanglementStatus[targetIndex] = Math.max(
                this.manifoldRef.entanglementStatus[targetIndex]!,
                entanglementWeight
            );
        }
    }
}