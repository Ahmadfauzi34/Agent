import { GLOBAL_DIMENSION, MAX_SEEDS, TensorVector } from '../core/config.js';
import { FHRR } from '../core/fhrr.js';
import { UniversalManifold } from '../perception/UniversalManifold.js';

/**
 * 🌌 THE LOGIC SEED BANK 🌌
 * Tempat penyimpanan seluruh "Skill" dan "Logika" dalam bentuk Tensor Kontinu.
 * 100% Menggunakan Arsitektur SoA (Entity Component System style).
 */
export class LogicSeedBank {
    /** Total aksioma memori yang tersimpan */
    public activeCount: number = 0;

    // --- STRUKTUR MEMORI SOA (L1 CACHE OPTIMIZED) ---
    /** Nama unik atau deskripsi rule/aksioma */
    public ruleNames: string[];

    /** ID Pendaftaran / Seed */
    public ruleSeeds: Int32Array;
    
    /**
     * Tensor Buffer Raksasa: [MAX_SEEDS x GLOBAL_DIMENSION]
     * Seluruh hukum alam semesta berjejer secara linier di RAM
     */
    public ruleTensors: Float32Array;

    private perceiver: UniversalManifold;
    private nextCustomSeed: number = 100000;

    constructor(perceiver: UniversalManifold) {
        this.perceiver = perceiver;

        // Alokasi Memori Murni (Pre-allocation)
        this.ruleNames = new Array(MAX_SEEDS).fill("");
        this.ruleSeeds = new Int32Array(MAX_SEEDS);
        this.ruleTensors = new Float32Array(MAX_SEEDS * GLOBAL_DIMENSION);

        this.initializeAxioms();
    }

    /**
     * Mendaftarkan Skill baru ke dalam Memory Bank SoA.
     */
    public registerSkill(name: string, seed: number, tensor: TensorVector): void {
        if (this.activeCount >= MAX_SEEDS) {
            console.warn("[LogicSeedBank] Peringatan: Kapasitas memori penuh! (MAX_SEEDS tercapai).");
            return;
        }

        const idx = this.activeCount;
        this.ruleNames[idx] = name;
        this.ruleSeeds[idx] = seed;

        // Copy tensor ke dalam buffer linier
        const offset = idx * GLOBAL_DIMENSION;
        this.ruleTensors.set(tensor, offset);

        this.activeCount++;
    }

    /**
     * Helper untuk mengambil sub-array (pointer) ke satu tensor di dalam buffer.
     */
    public getTensor(index: number): TensorVector {
        const offset = index * GLOBAL_DIMENSION;
        return this.ruleTensors.subarray(offset, offset + GLOBAL_DIMENSION);
    }

    /**
     * Mengimpor Hukum dari file JSON (Harvested Data)
     */
    public loadHarvestedSeeds(jsonData: any[]): void {
        let loadedCount = 0;
        for (const task of jsonData) {
            if (!task.rules) continue;

            for (const rule of task.rules) {
                if (!rule.holographic_law || typeof rule.holographic_law !== 'string') continue;

                const lawString: string = rule.holographic_law;
                const phasor = new Float32Array(GLOBAL_DIMENSION);
                const lawLength = lawString.length;

                for (let i = 0; i < GLOBAL_DIMENSION; i++) {
                    const char = lawString[i % lawLength];
                    phasor[i] = char === '+' ? 1.0 : -1.0;
                }

                // Normalisasi
                this.normalizeL2InPlace(phasor);

                const opName = rule.op || "UNKNOWN_OP";
                const ruleName = `HARVEST_${task.task_id}_${opName}_T${rule.target_token}_${loadedCount}`;

                const newSeed = this.nextCustomSeed++;
                this.registerSkill(ruleName, newSeed, phasor);
                loadedCount++;
            }
        }
        console.log(`[LogicSeedBank] Berhasil memanen ${loadedCount} Holographic Laws dari JSON.`);
    }

    /**
     * 🏛️ THE AXIOMS (Skill Bawaan / Insting Dasar)
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
        // Karena VSA kita beroperasi dalam realm continuous 0.0 - 1.0,
        // kita generate aksioma pergeseran mikro (seperti pixel grid relatif).
        // Kita menggunakan UniversalManifold yang sudah murni Fractional FHRR.
        // Simulasi Grid 10x10 sebagai insting dasar
        const steps = [-0.5, -0.2, -0.1, 0.1, 0.2, 0.5];

        for (const dx of steps) {
            for (const dy of steps) {
                const name = `L1_SHIFT_${dx.toFixed(1)}_${dy.toFixed(1)}`;
                
                // Minta UniversalManifold membuat tensor koordinat
                // Pergeseran adalah selisih Phase (Bukan piksel absolut)
                const xShift = FHRR.fractionalBind(this.perceiver.X_AXIS_SEED, dx);
                const yShift = FHRR.fractionalBind(this.perceiver.Y_AXIS_SEED, dy);
                const phasor = FHRR.bind(xShift, yShift);
                
                this.normalizeL2InPlace(phasor);
                this.registerSkill(name, this.nextCustomSeed++, phasor);
            }
        }
    }

    // ========================================================================
    // [ LEVEL 2 ] COLOR MAPPING (Perubahan Spektrum)
    // ========================================================================
    private initLevel2_ColorMapping() {
        for (let dc = 1; dc <= 9; dc++) {
            const name = `L2_COLOR_SHIFT_+${dc}`;
            const seed = 2000 + dc;
            const phasor = FHRR.fractionalBind(this.perceiver.COLOR_SEED, dc);
            this.normalizeL2InPlace(phasor);
            this.registerSkill(name, seed, phasor);
        }
    }

    // ========================================================================
    // [ LEVEL 3 ] GEOMETRIC TRANSFORM (Rotasi, Refleksi, Simetri)
    // ========================================================================
    private initLevel3_GeometricTransform() {
        // Berdasarkan Revisi Arsitektur, Refleksi dihitung On-The-Fly
        // oleh TopologicalAligner menggunakan AxiomGenerator.
        // Tidak ada lagi penciptaan 'Anti-Materi' Inverse di sini.
    }

    // ========================================================================
    // [ LEVEL 4 ] PHYSICS DYNAMICS (Gravitasi, Magnetisme)
    // ========================================================================
    private initLevel4_PhysicsDynamics() {
        // Generate pseudo-random attractor vectors for pure directional noise
        const seedBaseGrav = 4000;
        const dirs = ["UP", "DOWN", "LEFT", "RIGHT"];

        for(let i=0; i<4; i++) {
             const operator = new Float32Array(GLOBAL_DIMENSION);
             let s = seedBaseGrav + i;
             for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                 s = (s * 16807) % 2147483647;
                 operator[d] = ((s - 1) / 2147483646) * 2.0 - 1.0;
             }
             this.normalizeL2InPlace(operator);
             this.registerSkill(`L4_GRAVITY_${dirs[i]}`, seedBaseGrav + i, operator);
        }
    }

    /**
     * 🔍 RESONANCE SEARCH (Mencari Pencerahan)
     * V8 L1 Cache Optimized: Menyapu array Flat Float32 tanpa pointer hopping.
     */
    public findBestMatch(rawLogicPhasor: TensorVector): { name: string, seed: number, coherence: number, phasor: TensorVector } | null {
        let bestCoherence = -1.0;
        let bestIndex = -1;

        // Normalisasi input untuk pengukuran Cosine Similarity yang akurat
        const normalizedRaw = new Float32Array(rawLogicPhasor);
        this.normalizeL2InPlace(normalizedRaw);

        // V8 SIMD Loop
        for (let i = 0; i < this.activeCount; i++) {
            const skillPhasor = this.getTensor(i);
            const coherence = FHRR.similarity(normalizedRaw, skillPhasor);

            if (coherence > bestCoherence) {
                bestCoherence = coherence;
                bestIndex = i;
            }
        }

        if (bestIndex !== -1) {
            return {
                name: this.ruleNames[bestIndex]!,
                seed: this.ruleSeeds[bestIndex]!,
                coherence: bestCoherence,
                phasor: this.getTensor(bestIndex)
            };
        }

        return null;
    }

    // --- UTILITIES MATEMATIKA KUANTUM BRANCHLESS ---

    private normalizeL2InPlace(v: TensorVector): void {
        let magSq = 0;
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            magSq += v[i]! * v[i]!;
        }

        const invMag = 1.0 / (Math.sqrt(magSq) + 1e-15);
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            v[i] *= invMag;
        }
    }
}
