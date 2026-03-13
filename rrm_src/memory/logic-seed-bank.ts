import { GLOBAL_DIMENSION, COMPLEX_DIMENSION } from '../core/config';
import { PhasorGenerator } from '../core/generator';
import { HolographicManifold } from './holographic-manifold';

/**
 * 🌌 THE LOGIC SEED BANK 🌌
 * Tempat penyimpanan seluruh "Skill" dan "Logika" dalam bentuk Seed tunggal.
 * Menggantikan ribuan baris if-else dengan satu ruang vektor kontinu.
 */
export class LogicSeedBank {
    // Menyimpan pemetaan: Nama Logika -> Seed Number
    private seedRegistry: Map<string, number> = new Map();
    
    // Menyimpan gelombang murni (Phasor) dari setiap Seed untuk komputasi cepat
    private phasorCache: Map<number, Float32Array> = new Map();

    private manifold: HolographicManifold;
    private nextCustomSeed: number = 100000; // Mulai dari angka besar untuk logika hasil belajar ARC

    constructor(manifold: HolographicManifold) {
        this.manifold = manifold;
        this.initializeAxioms();
    }

    /**
     * 🏛️ THE AXIOMS (Skill Bawaan / Insting Dasar)
     * Mendaftarkan logika-logika fundamental alam semesta ARC berdasarkan Level Kognitif.
     * Untuk jangka panjang, ini adalah fondasi AGI yang terstruktur.
     */
    private initializeAxioms() {
        this.initLevel1_SpatialTranslation();
        this.initLevel2_ColorMapping();
        this.initLevel3_GeometricTransform();
        this.initLevel4_PhysicsDynamics();
    }

    // ========================================================================
    // [ LEVEL 1 ] SPATIAL TRANSLATION (Pergeseran Ruang)
    // ========================================================================
    private initLevel1_SpatialTranslation() {
        // Kita mendaftarkan pergeseran dari -10 hingga +10 untuk X dan Y
        for (let dx = -10; dx <= 10; dx++) {
            for (let dy = -10; dy <= 10; dy++) {
                if (dx === 0 && dy === 0) continue; // Skip identitas
                
                const name = `L1_SHIFT_${dx}_${dy}`;
                // Seed deterministik berdasarkan dx dan dy (Range: 1000 - 1999)
                const seed = 1000 + (dx + 10) * 100 + (dy + 10); 
                
                // Generate Phasor menggunakan Tensor Calculus (Zero Array Lookup)
                const phasor = this.manifold.encodePixel(0, dx, dy);
                
                this.registerSkill(name, seed, phasor);
            }
        }
    }

    // ========================================================================
    // [ LEVEL 2 ] COLOR MAPPING (Perubahan Spektrum)
    // ========================================================================
    private initLevel2_ColorMapping() {
        for (let dc = 1; dc <= 9; dc++) {
            const name = `L2_COLOR_SHIFT_+${dc}`;
            // Seed Range: 2000 - 2999
            const seed = 2000 + dc;
            const phasor = this.manifold.encodePixel(dc, 0, 0);
            this.registerSkill(name, seed, phasor);
        }
    }

    // ========================================================================
    // [ LEVEL 3 ] GEOMETRIC TRANSFORM (Rotasi, Refleksi, Simetri)
    // ========================================================================
    private initLevel3_GeometricTransform() {
        // TODO JANGKA PANJANG:
        // Rotasi dan Refleksi dalam ruang Holografik membutuhkan "Permutasi Spektrum"
        // atau "Phase Conjugation". Ini bukan sekadar pergeseran fase (shiftPhase),
        // melainkan membalik urutan frekuensi (k -> N-k) atau menukar sumbu X dan Y.
        // 
        // Contoh Konseptual:
        // const phasorRot90 = this.manifold.generateRotationOperator(90);
        // this.registerSkill("L3_ROTATE_90", 3090, phasorRot90);
    }

    // ========================================================================
    // [ LEVEL 4 ] PHYSICS DYNAMICS (Gravitasi, Magnetisme, Interaksi)
    // ========================================================================
    private initLevel4_PhysicsDynamics() {
        // TODO JANGKA PANJANG:
        // Fisika adalah "Translasi Bersyarat" (Conditional Translation).
        // Misalnya: "Geser ke bawah (dy=+1) SAMPAI menabrak warna X".
        // Dalam Tensor Calculus, ini direpresentasikan sebagai "Phase Gating" atau
        // "Attractor Basin" di mana gelombang akan berhenti bergeser saat mencapai
        // resonansi tertentu dengan lingkungan sekitarnya.
        //
        // Contoh Konseptual:
        // const phasorGravity = this.manifold.generateAttractorOperator(DIRECTION_DOWN);
        // this.registerSkill("L4_GRAVITY_DOWN", 4001, phasorGravity);
    }

    /**
     * Mendaftarkan Skill baru ke dalam Bank.
     */
    public registerSkill(name: string, seed: number, phasor: Float32Array) {
        this.seedRegistry.set(name, seed);
        this.phasorCache.set(seed, phasor);
    }

    /**
     * Menyimpan Logika Baru hasil belajar dari soal ARC (A Posteriori).
     */
    public learnNewLogic(name: string, rawPhasor: Float32Array): number {
        const newSeed = this.nextCustomSeed++;
        // Normalisasi phasor sebelum disimpan agar menjadi gelombang murni
        const purePhasor = new Float32Array(rawPhasor);
        this.normalizeComplexPhasorInPlace(purePhasor);
        
        this.registerSkill(name, newSeed, purePhasor);
        return newSeed;
    }

    /**
     * 🔍 RESONANCE SEARCH (Mencari Pencerahan)
     * Mengukur seberapa mirip Logika Kasar (Raw Logic) dengan Skill yang sudah ada.
     * Menggantikan if(isTranslation) else if(isRotation).
     */
    public findBestMatch(rawLogicPhasor: Float32Array): { name: string, seed: number, coherence: number, phasor: Float32Array } | null {
        let bestCoherence = -1;
        let bestSeed = -1;
        let bestName = "";

        // Normalisasi input untuk pengukuran Cosine Similarity yang akurat
        const normalizedRaw = new Float32Array(rawLogicPhasor);
        this.normalizeComplexPhasorInPlace(normalizedRaw);

        for (const [name, seed] of this.seedRegistry.entries()) {
            const skillPhasor = this.phasorCache.get(seed)!;
            const coherence = this.complexDotProductMagSq(normalizedRaw, skillPhasor);

            if (coherence > bestCoherence) {
                bestCoherence = coherence;
                bestSeed = seed;
                bestName = name;
            }
        }

        if (bestSeed !== -1) {
            return {
                name: bestName,
                seed: bestSeed,
                coherence: bestCoherence,
                phasor: this.phasorCache.get(bestSeed)!
            };
        }

        return null;
    }

    /**
     * ⚡ KINEMATIKA TENSOR (Mengekstrak Kecepatan Dasar)
     * Jika Seed adalah Translasi (misal: SHIFT_0_5), fungsi ini akan mengembalikan
     * Phasor untuk kecepatan dasarnya (misal: SHIFT_0_1) agar bisa disimulasikan step-by-step.
     */
    public getUnitVelocityPhasor(seed: number): Float32Array | null {
        // Cek apakah ini Seed Translasi Level 1 (Range: 1000 - 1999)
        if (seed >= 1000 && seed < 2000) {
            const encoded = seed - 1000;
            const dx = Math.floor(encoded / 100) - 10;
            const dy = (encoded % 100) - 10;

            // Normalisasi vektor kecepatan (dx, dy) menjadi unit step (-1, 0, atau 1)
            const stepX = dx === 0 ? 0 : Math.sign(dx);
            const stepY = dy === 0 ? 0 : Math.sign(dy);

            // Cari Seed untuk unit velocity ini
            const unitSeed = 1000 + (stepX + 10) * 100 + (stepY + 10);
            return this.phasorCache.get(unitSeed) || null;
        }
        return null; // Bukan translasi, tidak punya unit velocity
    }

    /**
     * Mengambil gelombang murni dari sebuah Seed.
     */
    public getPhasorBySeed(seed: number): Float32Array | undefined {
        return this.phasorCache.get(seed);
    }

    // --- UTILITIES MATEMATIKA KUANTUM ---

    private complexDotProductMagSq(a: Float32Array, b: Float32Array): number {
        let sumReal = 0; let sumImag = 0;
        for (let d = 0; d < COMPLEX_DIMENSION; d += 2) {
            const ar = a[d], ai = a[d + 1];
            const br = b[d], bi = b[d + 1];
            sumReal += ar * br + ai * bi;
            sumImag += ai * br - ar * bi;
        }
        return (sumReal * sumReal + sumImag * sumImag) / (GLOBAL_DIMENSION * GLOBAL_DIMENSION); 
    }

    private normalizeComplexPhasorInPlace(complexVec: Float32Array): void {
        const len = complexVec.length;
        for (let i = 0; i < len; i += 2) {
            const r = complexVec[i];
            const im = complexVec[i + 1];
            const magSq = r * r + im * im;
            
            if (magSq > 1e-15) { 
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
