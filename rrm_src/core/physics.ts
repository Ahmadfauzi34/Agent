export class Physics {
    static getMagnitudes(complexArray: number[]): number[] {
        const mags = [];
        for (let i = 0; i < complexArray.length; i += 2) {
            mags.push(Math.sqrt(complexArray[i]**2 + complexArray[i+1]**2));
        }
        return mags;
    }

    static calculatePMR(magnitudes: number[]): number {
        let max = 0;
        let sum = 0;
        for (const m of magnitudes) {
            if (m > max) max = m;
            sum += m;
        }
        return max / (sum / magnitudes.length + 1e-9);
    }

    static sigmoid(x: number): number {
        return 1 / (1 + Math.exp(-x));
    }

    static cosineSimilarity(vec1: Float64Array | number[], vec2: Float64Array | number[]): number {
        let dot = 0;
        let mag1 = 0;
        let mag2 = 0;
        for (let i = 0; i < vec1.length; i++) {
            dot += vec1[i] * vec2[i];
            mag1 += vec1[i] * vec1[i];
            mag2 += vec2[i] * vec2[i];
        }
        return dot / (Math.sqrt(mag1) * Math.sqrt(mag2) + 1e-9);
    }
}
