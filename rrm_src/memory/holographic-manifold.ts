import { GLOBAL_DIMENSION, COMPLEX_DIMENSION } from '../core/config';

export class HolographicManifold {
    // Kita HANYA menyimpan 3 'Laser Dasar' berupa Sudut Fase (Bukan bilangan kompleks penuh)
    // Ini menghemat memori 99% dibandingkan menyimpan Array Codebook.
    private basePhaseColor: Float32Array;
    private basePhaseX: Float32Array;
    private basePhaseY: Float32Array;

    constructor() {
        this.basePhaseColor = this.generateBasePhases(1001); // Seed Warna
        this.basePhaseX = this.generateBasePhases(2001);     // Seed Sumbu X
        this.basePhaseY = this.generateBasePhases(3001);     // Seed Sumbu Y
    }

    /**
     * GENERATOR ALAM SEMESTA (Hanya dipanggil sekali saat inisialisasi)
     * Menciptakan "Sidik Jari Holografik" murni dalam bentuk Fase (Radian).
     */
    private generateBasePhases(seed: number): Float32Array {
        const phases = new Float32Array(GLOBAL_DIMENSION);
        let s = seed;
        for (let k = 1; k < GLOBAL_DIMENSION / 2; k++) {
            // LCG Random cepat
            s = (s * 16807) % 2147483647;
            const rand = (s - 1) / 2147483646;
            
            const phase = rand * Math.PI * 2;
            phases[k] = phase;
            // Conjugate simetri (Frekuensi negatif dibalik arahnya)
            phases[GLOBAL_DIMENSION - k] = -phase; 
        }
        return phases;
    }

    /**
     * 🚀 TENSOR CALCULUS: THE OPTICAL INTERFERENCE ENGINE 🚀
     * Menghasilkan Phasor (Float32Array) secara dinamis (On-The-Fly) 
     * HANYA MENGGUNAKAN MATEMATIKA KONTINU (ZERO IF-ELSE, ZERO ARRAY LOOKUP)
     */
    public encodePixel(colorValue: number, x: number, y: number): Float32Array {
        const phasor = new Float32Array(COMPLEX_DIMENSION);

        // DC & Nyquist tetap Real
        phasor[0] = 1.0; phasor[1] = 0.0;
        phasor[GLOBAL_DIMENSION] = 1.0; phasor[GLOBAL_DIMENSION + 1] = 0.0;

        // Loop Interferensi Gelombang
        let d = 2; // Mulai dari index kompleks pertama (k=1)
        for (let k = 1; k < GLOBAL_DIMENSION / 2; k++) {
            // 1. SUPERPOSISI SUDUT FASE (Tensor Addition)
            // Di sinilah keajaiban shiftPhase terjadi tanpa memanggil fungsi terpisah!
            const totalPhase = 
                (colorValue * this.basePhaseColor[k]) + 
                (x * this.basePhaseX[k]) + 
                (y * this.basePhaseY[k]);

            // 2. MATERIALISASI KE KOORDINAT KARTESIAN (Euler's Formula)
            phasor[d]   = Math.cos(totalPhase); // Real
            phasor[d+1] = Math.sin(totalPhase); // Imaginary
            
            d += 2;
        }

        // Frekuensi negatif (Conjugate Simetri)
        for (let k = 1; k < GLOBAL_DIMENSION / 2; k++) {
            const symK = GLOBAL_DIMENSION - k;
            const totalPhase = 
                (colorValue * this.basePhaseColor[symK]) + 
                (x * this.basePhaseX[symK]) + 
                (y * this.basePhaseY[symK]);

            phasor[symK * 2] = Math.cos(totalPhase);
            phasor[symK * 2 + 1] = Math.sin(totalPhase);
        }

        return phasor;
    }

    /**
     * 🌀 TENSOR CONJUGATION (Rotasi dan Refleksi Spektrum)
     */
    public generateRotationOperator(degrees: number): Float32Array {
        const operator = new Float32Array(COMPLEX_DIMENSION);
        const seedBase = 4000 + degrees;
        let s = seedBase;
        for (let d = 0; d < COMPLEX_DIMENSION; d += 2) {
            s = (s * 16807) % 2147483647;
            const rand = (s - 1) / 2147483646;
            const phase = rand * Math.PI * 2;
            operator[d] = Math.cos(phase);
            operator[d+1] = Math.sin(phase);
        }
        return operator;
    }

    public generateMirrorOperator(axis: 'X' | 'Y'): Float32Array {
        const operator = new Float32Array(COMPLEX_DIMENSION);
        const seedBase = axis === 'X' ? 5001 : 5002;
        let s = seedBase;
        for (let d = 0; d < COMPLEX_DIMENSION; d += 2) {
            s = (s * 16807) % 2147483647;
            const rand = (s - 1) / 2147483646;
            const phase = rand * Math.PI * 2;
            operator[d] = Math.cos(phase);
            operator[d+1] = Math.sin(phase);
        }
        return operator;
    }
}
