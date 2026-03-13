import { CognitiveEntity } from '../core/CognitiveEntity';
import { TensorVector, GLOBAL_DIMENSION } from '../core/config';

/**
 * 🌊 WAVE DYNAMICS (Fase 4)
 * Menangani navigasi dan kausalitas (Entanglement) antar CognitiveEntities.
 * Diadaptasi dari script lama `WavePacketSynchronizer` dengan standar VSA baru.
 */
export class WaveDynamics {
    private entanglementLinks: Map<string, string[]> = new Map();

    /**
     * Membuat keterikatan kuantum (Quantum Entanglement) antar dua entitas.
     */
    public createEntanglement(agentIdA: string, agentIdB: string): void {
        if (!this.entanglementLinks.has(agentIdA)) {
            this.entanglementLinks.set(agentIdA, []);
        }
        this.entanglementLinks.get(agentIdA)!.push(agentIdB);
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
        if (mag > 1e-12) {
            for (let i = 0; i < GLOBAL_DIMENSION; i++) agentTensor[i] /= mag;
        }
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
     * Jika A berubah, B juga dipaksa untuk ikut berubah secara instan (Spooky action at a distance).
     */
    public triggerCollapse(sourceAgent: CognitiveEntity, allAgents: Map<string, CognitiveEntity>): void {
        const linkedAgents = this.entanglementLinks.get(sourceAgent.id);
        if (!linkedAgents) return;

        linkedAgents.forEach(targetId => {
            const targetAgent = allAgents.get(targetId);
            if (targetAgent) {
                // Target menerima status memori (Tensor) dari Source
                for(let i=0; i<GLOBAL_DIMENSION; i++){
                     targetAgent.tensor[i] = sourceAgent.tensor[i]!;
                }
                targetAgent.entanglement_status = 1; // Mark as collapsed
            }
        });
    }
}