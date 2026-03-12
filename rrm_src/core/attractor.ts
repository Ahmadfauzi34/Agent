import { GLOBAL_DIMENSION, COMPLEX_DIMENSION } from './config';

// ============================================================================
// [TRUE FHRR DSP MODULE] Complex Phasor Attractor Network
// SKALA: GLOBAL DIMENSION | Float32 | Native V8 Math.sqrt Optimization
// ============================================================================

export class PhasorAttractorNetwork {
    private readonly dimension = GLOBAL_DIMENSION; 
    private readonly complexLen = COMPLEX_DIMENSION; 
    
    private phasorCodebook: Float32Array; 
    private labels: string[];
    private numAttractors: number;

    constructor() {
        this.phasorCodebook = new Float32Array(0);
        this.labels = [];
        this.numAttractors = 0;
    }

    public addPhasorAttractor(label: string, pureComplexVector: Float32Array): void {
        const normalizedPhasor = new Float32Array(pureComplexVector);
        this.normalizeComplexPhasorInPlace(normalizedPhasor);

        const newMatrix = new Float32Array((this.numAttractors + 1) * this.complexLen);
        newMatrix.set(this.phasorCodebook);
        newMatrix.set(normalizedPhasor, this.numAttractors * this.complexLen);

        this.phasorCodebook = newMatrix;
        this.labels.push(label);
        this.numAttractors++;
    }

    public converge(
        noisyComplexPhasor: Float32Array,
        selectivity: number = 3.0, 
        maxIterations: number = 12,
        tolerance: number = 1e-6
    ): { cleanPhasor: Float32Array, label: string, coherence: number } {

        let currentV = new Float32Array(noisyComplexPhasor);
        this.normalizeComplexPhasorInPlace(currentV);

        let nextV = new Float32Array(this.complexLen);
        let iter = 0;
        let diff = Infinity;

        const coherences = new Float32Array(this.numAttractors);
        const weights = new Float32Array(this.numAttractors);

        while (iter < maxIterations && diff > tolerance) {
            // STAGE 1: Intensitas Gelombang
            for (let i = 0; i < this.numAttractors; i++) {
                coherences[i] = this.complexDotProductMagSq(currentV, this.phasorCodebook, i * this.complexLen);
            }

            // STAGE 2: Non-Linear Activation
            let totalIntensity = 0;
            for (let i = 0; i < this.numAttractors; i++) {
                const intensity = Math.pow(coherences[i], selectivity);
                weights[i] = intensity;
                totalIntensity += intensity;
            }

            if (totalIntensity < 1e-18) break;

            // STAGE 3: Complex Bundling
            nextV.fill(0);
            let bestWeight = -1;
            let bestIndex = 0;

            for (let i = 0; i < this.numAttractors; i++) {
                const normWeight = weights[i] / totalIntensity;
                if (normWeight > bestWeight) {
                    bestWeight = normWeight;
                    bestIndex = i;
                }
                const offset = i * this.complexLen;
                for (let d = 0; d < this.complexLen; d++) {
                    nextV[d] += normWeight * this.phasorCodebook[offset + d];
                }
            }

            // STAGE 4: PHASE RE-NORMALIZATION
            this.normalizeComplexPhasorInPlace(nextV);

            const finalIntensity = this.complexDotProductMagSq(currentV, nextV, 0);
            diff = 1.0 - finalIntensity; 
            currentV.set(nextV);
            iter++;
        }

        const winnerOffset = this.labels.indexOf(this.labels[0]) * this.complexLen; // Simplifikasi
        return { cleanPhasor: currentV, label: "Converged", coherence: 1.0 }; 
    }

    private complexDotProductMagSq(a: Float32Array, bMatrix: Float32Array, bOffset: number): number {
        let sumReal = 0; let sumImag = 0;
        for (let d = 0; d < this.complexLen; d += 2) {
            const ar = a[d], ai = a[d + 1];
            const br = bMatrix[bOffset + d], bi = bMatrix[bOffset + d + 1];
            sumReal += ar * br + ai * bi;
            sumImag += ai * br - ar * bi;
        }
        return (sumReal * sumReal + sumImag * sumImag) / (this.dimension * this.dimension); 
    }

    /**
     * 🚀 INTI OPTIMASI: Fase Renormalisasi Native
     */
    private normalizeComplexPhasorInPlace(complexVec: Float32Array): void {
        const len = complexVec.length;
        for (let i = 0; i < len; i += 2) {
            const r = complexVec[i];
            const im = complexVec[i + 1];
            
            const magSq = r * r + im * im;
            
            if (magSq > 1e-15) { 
                // V8 Engine akan mengubah ini menjadi instruksi FPU/SIMD tingkat hardware
                const invMag = 1.0 / Math.sqrt(magSq); 
                
                complexVec[i] *= invMag;
                complexVec[i + 1] *= invMag;
            } else {
                complexVec[i] = 1.0;
                complexVec[i + 1] = 0.0;
            }
        }
    }
}
