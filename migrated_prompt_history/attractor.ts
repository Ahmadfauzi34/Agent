import { GLOBAL_DIMENSION, allocateBuffer, cloneBuffer } from './config';
import { HRR } from './hrr';

// ============================================================================
// [TRUE HRR DSP MODULE] Bipolar Attractor Network
// SKALA: GLOBAL DIMENSION | Int32 | Native V8 Math Optimization
// ============================================================================

export class HRRAttractorNetwork {
    private readonly dimension = GLOBAL_DIMENSION; 
    
    private codebook: Int32Array[]; 
    private labels: string[];
    private numAttractors: number;

    constructor() {
        this.codebook = [];
        this.labels = [];
        this.numAttractors = 0;
    }

    public addAttractor(label: string, vector: Int32Array): void {
        const normalized = cloneBuffer(vector);
        HRR.normalize(normalized); // Ensure it's bipolar

        this.codebook.push(normalized);
        this.labels.push(label);
        this.numAttractors++;
    }

    public converge(
        noisyVector: Int32Array,
        selectivity: number = 3.0, 
        maxIterations: number = 12,
        tolerance: number = 1e-6
    ): { cleanVector: Int32Array, label: string, coherence: number } {

        let currentV = cloneBuffer(noisyVector);
        HRR.normalize(currentV);

        let iter = 0;
        let diff = Infinity;

        const coherences = new Float64Array(this.numAttractors);
        const weights = new Float64Array(this.numAttractors);

        while (iter < maxIterations && diff > tolerance) {
            // STAGE 1: Intensitas Gelombang
            for (let i = 0; i < this.numAttractors; i++) {
                coherences[i] = HRR.similarity(currentV, this.codebook[i]);
            }

            // STAGE 2: Non-Linear Activation
            let totalIntensity = 0;
            for (let i = 0; i < this.numAttractors; i++) {
                // Ensure coherence is positive for power function
                const intensity = Math.pow(Math.max(0, coherences[i]), selectivity);
                weights[i] = intensity;
                totalIntensity += intensity;
            }

            if (totalIntensity < 1e-18) break;

            // STAGE 3: Bundling
            let bestWeight = -1;
            let bestIndex = 0;
            
            // We need a float array to accumulate weighted bipolar vectors
            const accumulator = new Float64Array(this.dimension);

            for (let i = 0; i < this.numAttractors; i++) {
                const normWeight = weights[i] / totalIntensity;
                if (normWeight > bestWeight) {
                    bestWeight = normWeight;
                    bestIndex = i;
                }
                
                const attractor = this.codebook[i];
                for (let d = 0; d < this.dimension; d++) {
                    accumulator[d] += normWeight * attractor[d];
                }
            }

            // STAGE 4: RE-NORMALIZATION (Bipolarization)
            const nextV = allocateBuffer(this.dimension);
            for (let d = 0; d < this.dimension; d++) {
                nextV[d] = accumulator[d] >= 0 ? 1 : -1;
            }

            const finalIntensity = HRR.similarity(currentV, nextV);
            diff = 1.0 - finalIntensity; 
            currentV.set(nextV);
            iter++;
        }

        // Find the closest label
        let bestSim = -1;
        let bestLabel = "Unknown";
        for (let i = 0; i < this.numAttractors; i++) {
            const sim = HRR.similarity(currentV, this.codebook[i]);
            if (sim > bestSim) {
                bestSim = sim;
                bestLabel = this.labels[i];
            }
        }

        return { cleanVector: currentV, label: bestLabel, coherence: bestSim }; 
    }
}
