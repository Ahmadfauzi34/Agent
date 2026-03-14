import { CognitiveEntity } from '../core/CognitiveEntity.js';
import { TensorVector, GLOBAL_DIMENSION } from '../core/config.js';
import { EntanglementOptimizer } from './EntanglementOptimizer.js';

/**
 * 🌊 WAVE DYNAMICS (Fase 4)
 * Menangani navigasi dan kausalitas (Entanglement) antar CognitiveEntities.
 * Menggunakan Hebbian Learning Matrix, Zero If-Else arsitektur, menghilangkan Map manual.
 */
export class WaveDynamics {
    private entanglementMatrix: Float32Array[] = [];
    private entitiesCache: CognitiveEntity[] = [];

    /**
     * Mendaftarkan seluruh agen/entitas dan menginisialisasi Matriks Entanglement
     */
    public initializeEntities(entities: CognitiveEntity[]): void {
        this.entitiesCache = entities;
        const numEntities = entities.length;

        // Buat N x N Float32Array untuk quantum coupling branchless tracking
        this.entanglementMatrix = new Array(numEntities);
        for (let i = 0; i < numEntities; i++) {
            this.entanglementMatrix[i] = new Float32Array(numEntities).fill(0.0);
            this.entanglementMatrix[i]![i] = 1.0; // Self-entangled = 1.0
        }
    }

    /**
     * Menjalankan Hebbian Learning: Otomatis mencari dan menyambungkan
     * "Neurons that fire together" tanpa if-else.
     */
    public evolveEntanglement(learningRate: number = 0.1): void {
        EntanglementOptimizer.optimize(this.entitiesCache, this.entanglementMatrix, learningRate);
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

        // Zero-if branchless evaluation
        const isValidMag = mag > 1e-12;
        isValidMag && (() => {
            for (let i = 0; i < GLOBAL_DIMENSION; i++) agentTensor[i] /= mag;
        })();
    }

    /**
     * WAVE GRAVITY DRIVE (Huygens-Fresnel Navigation)
     * Mengkalkulasi pergerakan agen berdasarkan atraktor dan repulsor tensor di sekitarnya.
     */
    public applyWaveGravity(agent: CognitiveEntity, attractors: TensorVector[], repulsors: TensorVector[]): void {
        const totalAttractor = new Float32Array(GLOBAL_DIMENSION).fill(0);
        for (const attr of attractors) {
            for (let i = 0; i < GLOBAL_DIMENSION; i++) totalAttractor[i] += attr[i]!;
        }

        const totalRepulsor = new Float32Array(GLOBAL_DIMENSION).fill(0);
        for (const rep of repulsors) {
            for (let i = 0; i < GLOBAL_DIMENSION; i++) totalRepulsor[i] += rep[i]!;
        }

        // Terapkan medan ke tensor entitas
        this.contrastiveUpdateInPlace(agent.tensor, totalRepulsor, totalAttractor, 0.8);
    }

    /**
     * TRIGGER COLLAPSE
     * Meruntuhkan gelombang informasi ke agen-agen yang saling terikat (Entangled).
     * Jika A berubah, B terpengaruh SEBANDING dengan bobot entanglement-nya.
     */
    public triggerCollapse(sourceIndex: number): void {
        const sourceAgent = this.entitiesCache[sourceIndex];
        const numEntities = this.entitiesCache.length;

        // Zero if-else untuk safety check
        const isValidSource = !!sourceAgent && this.entanglementMatrix.length === numEntities;

        isValidSource && (() => {
            for (let targetIndex = 0; targetIndex < numEntities; targetIndex++) {
                // Skip self (branchless math logic)
                const isNotSelf = targetIndex !== sourceIndex;

                isNotSelf && (() => {
                    const targetAgent = this.entitiesCache[targetIndex]!;
                    const entanglementWeight = this.entanglementMatrix[sourceIndex]![targetIndex]!;

                    // Partial collapse berdasarkan coupling (0.0 to 1.0)
                    for(let i=0; i<GLOBAL_DIMENSION; i++){
                        // Interpolasi linear murni: W * Source + (1-W) * Target
                        targetAgent.tensor[i] = (entanglementWeight * sourceAgent!.tensor[i]!) + ((1.0 - entanglementWeight) * targetAgent.tensor[i]!);
                    }

                    // Mark entanglement status as combined weight
                    targetAgent.entanglement_status = Math.max(targetAgent.entanglement_status, entanglementWeight);
                })();
            }
        })();
    }
}