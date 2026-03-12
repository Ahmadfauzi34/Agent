import { GLOBAL_DIMENSION, COMPLEX_DIMENSION } from './config';

export class PhasorGenerator {
    // PRNG Cepat (Linear Congruential Generator)
    private static seed = 42;
    private static random() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }

    /**
     * Membangun Hologram Murni (Phasor) langsung dari satu angka Seed.
     * Menggunakan Float32Array untuk kompatibilitas Neural Network.
     */
    public static createFromSeed(baseSeed: number): Float32Array {
        this.seed = baseSeed; 
        const phasor = new Float32Array(COMPLEX_DIMENSION);

        // Frekuensi DC (0) & Nyquist (N/2) wajib riil
        phasor[0] = 1.0; phasor[1] = 0.0;
        phasor[GLOBAL_DIMENSION] = 1.0; phasor[GLOBAL_DIMENSION + 1] = 0.0;

        // Isi spektrum frekuensi
        for (let k = 1; k < GLOBAL_DIMENSION / 2; k++) {
            const phase = this.random() * Math.PI * 2;
            const cosP = Math.cos(phase);
            const sinP = Math.sin(phase);

            // Frekuensi positif
            phasor[k * 2] = cosP;
            phasor[k * 2 + 1] = sinP;

            // Frekuensi negatif (Conjugate Simetri)
            const symK = GLOBAL_DIMENSION - k;
            phasor[symK * 2] = cosP;
            phasor[symK * 2 + 1] = -sinP;
        }

        return phasor; 
    }

    /**
     * Rotasi Fase Murni (Fractional Power)
     */
    public static shiftPhase(basePhasor: Float32Array, power: number): Float32Array {
        const shifted = new Float32Array(COMPLEX_DIMENSION);
        for (let i = 0; i < COMPLEX_DIMENSION; i += 2) {
            const r = basePhasor[i];
            const im = basePhasor[i+1];
            
            const radius = Math.sqrt(r*r + im*im);
            const theta = Math.atan2(im, r);
            
            const newTheta = theta * power;
            shifted[i] = radius * Math.cos(newTheta);
            shifted[i+1] = radius * Math.sin(newTheta);
        }
        return shifted;
    }
}
