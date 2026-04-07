import { GLOBAL_DIMENSION, MAX_SEEDS, TensorVector } from '../core/config.js';
import { FHRR } from '../core/fhrr.js';
import { UniversalManifold } from '../perception/UniversalManifold.js';
import { CoreSeeds } from '../core/CoreSeeds.js';

/**
 * 🌌 THE LOGIC SEED BANK 🌌
 * Tempat penyimpanan seluruh "Skill" dan "Logika" dalam bentuk Tensor Kontinu.
 * 100% Menggunakan Arsitektur SoA (Entity Component System style).
 */
// ============================================
// CONFIGURATION & UTILITIES
// ============================================
const CACHE_SIZE = 1024;             // Ukuran LRU cache
const LSH_BUCKET_COUNT = 256;        // Jumlah bucket untuk LSH
const LSH_PROJECTIONS = 8;           // Jumlah proyeksi LSH

// ============================================
// LSH INDEX FOR SUBLINEAR SEARCH (O(1))
// ============================================
class LSHIndex {
    private projections: Float32Array[];
    private buckets: Map<string, number[]>[];

    constructor(
        private dimension: number,
        private numProjections: number,
        private bucketCount: number
    ) {
        // Bangkitkan Vektor Proyeksi Acak
        this.projections = [];
        for (let i = 0; i < numProjections; i++) {
            const proj = new Float32Array(dimension);
            const randomValues = new Uint32Array(dimension);
            globalThis.crypto.getRandomValues(randomValues);

            let magSq = 0;
            for (let d = 0; d < dimension; d++) {
                // Konversi dari Uint32 (0 hingga 4294967295) ke float (-1.0 hingga 1.0)
                const val = (randomValues[d]! / 4294967295.0) * 2.0 - 1.0;
                proj[d] = val;
                magSq += val * val;
            }
            // Normalisasi L2 Branchless
            const invMag = 1.0 / (Math.sqrt(magSq) + 1e-15);
            for (let d = 0; d < dimension; d++) proj[d]! *= invMag;
            this.projections.push(proj);
        }

        this.buckets = Array(numProjections).fill(null).map(() => new Map());
    }

    hash(tensor: Float32Array): string[] {
        const hashes: string[] = [];
        for (let i = 0; i < this.numProjections; i++) {
            const proj = this.projections[i]!;
            let dot = 0;
            for (let d = 0; d < this.dimension; d++) {
                dot += tensor[d]! * proj[d]!;
            }
            // Kuantisasi dot product (-1.0 hingga 1.0) ke dalam ember diskrit
            const bucketIdx = Math.floor((dot + 1.0) * this.bucketCount / 2.0);
            // Pengamanan Array Bounds
            const safeBucketIdx = Math.max(0, Math.min(bucketIdx, this.bucketCount - 1));
            hashes.push(`${i}_${safeBucketIdx}`);
        }
        return hashes;
    }

    add(index: number, tensor: Float32Array): void {
        const hashes = this.hash(tensor);
        for (let projIdx = 0; projIdx < this.numProjections; projIdx++) {
            const hash = hashes[projIdx]!;
            const bucket = this.buckets[projIdx]!;
            let arr = bucket.get(hash);
            if (!arr) {
                arr = [];
                bucket.set(hash, arr);
            }
            arr[arr.length] = index; // DOSA 2 PENGAMANAN: Index-based assignment daripada push()
        }
    }

    query(tensor: Float32Array, maxCandidates: number = 100): number[] {
        const hashes = this.hash(tensor);
        const candidates = new Set<number>();

        for (let projIdx = 0; projIdx < this.numProjections; projIdx++) {
            const hash = hashes[projIdx]!;
            const bucket = this.buckets[projIdx]!;
            const indices = bucket.get(hash);
            if (indices) {
                for (let i = 0; i < indices.length; i++) {
                    candidates.add(indices[i]!);
                }
            }
        }

        const result = Array.from(candidates);
        if (result.length > maxCandidates) {
            return result.slice(0, maxCandidates);
        }
        return result;
    }

    clear(): void {
        for (let i = 0; i < this.buckets.length; i++) {
            this.buckets[i]!.clear();
        }
    }
}

class LRUCache<K, V> {
    private cache = new Map<K, V>();

    constructor(private maxSize: number) {}

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    clear(): void {
        this.cache.clear();
    }
}

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

    // --- INSTING OPTIMIZATIONS ---
    private tensorCache: LRUCache<string, { name: string, seed: number, coherence: number, phasor: TensorVector }>;
    private hotAxioms: Map<string, Float32Array> = new Map();
    private lshIndex: LSHIndex;

    private perceiver: UniversalManifold;
    private nextCustomSeed: number = 100000;

    constructor(perceiver: UniversalManifold) {
        this.perceiver = perceiver;

        // Alokasi Memori Murni (Pre-allocation)
        this.ruleNames = new Array(MAX_SEEDS).fill("");
        this.ruleSeeds = new Int32Array(MAX_SEEDS);
        this.ruleTensors = new Float32Array(MAX_SEEDS * GLOBAL_DIMENSION);

        this.tensorCache = new LRUCache(CACHE_SIZE);
        this.lshIndex = new LSHIndex(GLOBAL_DIMENSION, LSH_PROJECTIONS, LSH_BUCKET_COUNT);

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

        const subTensor = this.ruleTensors.subarray(offset, offset + GLOBAL_DIMENSION) as Float32Array;

        // Membangun memori insting untuk Aksioma fundamental (Level 1 & 2)
        if (name.startsWith('L1_') || name.startsWith('L2_')) {
            this.hotAxioms.set(name, subTensor);
        }

        // LSH Indexing untuk pencarian O(1) di data panen JSON (Harvest) yang masif
        this.lshIndex.add(idx, subTensor);

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
        const tensorsToAdd: Array<{ name: string, seed: number, tensor: Float32Array }> = [];

        for (const task of jsonData) {
            if (!task.rules) continue;

            for (const rule of task.rules) {
                if (!rule.holographic_law || typeof rule.holographic_law !== 'string') continue;

                const lawString: string = rule.holographic_law;
                const phasor = new Float32Array(GLOBAL_DIMENSION);
                const lawLength = lawString.length;

                // Fast string to tensor conversion (Branchless ternary equivalent via boolean cast logic is ideal,
                // but direct parsing is fine for setup)
                for (let i = 0; i < GLOBAL_DIMENSION; i++) {
                    const char = lawString[i % lawLength];
                    phasor[i] = char === '+' ? 1.0 : -1.0;
                }

                const opName = rule.op || "UNKNOWN_OP";
                const ruleName = `HARVEST_${task.task_id}_${opName}_T${rule.target_token}_${tensorsToAdd.length}`;

                tensorsToAdd.push({
                    name: ruleName,
                    seed: this.nextCustomSeed++,
                    tensor: phasor
                });
            }
        }

        // Batch normalize all at once
        for (const { tensor } of tensorsToAdd) {
            this.normalizeL2InPlaceFast(tensor);
        }

        // Register all
        for (const { name, seed, tensor } of tensorsToAdd) {
            this.registerSkill(name, seed, tensor);
        }

        console.log(`[LogicSeedBank] Berhasil memanen ${tensorsToAdd.length} Holographic Laws dari JSON dengan Fast Normalization.`);
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
                const xShift = FHRR.fractionalBind(CoreSeeds.X_AXIS_SEED, dx);
                const yShift = FHRR.fractionalBind(CoreSeeds.Y_AXIS_SEED, dy);
                const phasor = FHRR.bind(xShift, yShift);
                
                this.normalizeL2InPlaceFast(phasor);
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
            const phasor = FHRR.fractionalBind(CoreSeeds.COLOR_SEED, dc);
            this.normalizeL2InPlaceFast(phasor);
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
             this.normalizeL2InPlaceFast(operator);
             this.registerSkill(`L4_GRAVITY_${dirs[i]}`, seedBaseGrav + i, operator);
        }
    }

    /**
     * 🔍 RESONANCE SEARCH (Mencari Pencerahan)
     * V8 L1 Cache Optimized: Menyapu array Flat Float32 tanpa pointer hopping.
     */
    public findBestMatch(rawLogicPhasor: TensorVector): { name: string, seed: number, coherence: number, phasor: TensorVector } | null {
        // 1. CACHE CHECK (O(1)) - Insting langsung
        const cacheKey = this.getCacheKey(rawLogicPhasor);
        const cached = this.tensorCache.get(cacheKey);
        if (cached) return cached;

        const normalizedRaw = new Float32Array(rawLogicPhasor);
        this.normalizeL2InPlaceFast(normalizedRaw);

        // 2. HOT AXIOM CHECK - Fast Path untuk memori Fundamental (Level 1 & 2)
        for (const [name, phasor] of this.hotAxioms) {
            const coherence = FHRR.similarity(normalizedRaw, phasor);
            if (coherence > 0.95) { // Sangat mirip
                // Cari index aslinya (Bisa dioptimasi dengan nameToIndex Map, tapi karena hotAxioms kecil, ini sangat cepat)
                let seed = 0;
                for (let i = 0; i < this.activeCount; i++) {
                    if (this.ruleNames[i] === name) {
                        seed = this.ruleSeeds[i]!;
                        break;
                    }
                }
                const result = { name, seed, coherence, phasor };
                this.tensorCache.set(cacheKey, result);
                return result;
            }
        }

        // 3. LSH APPROXIMATE SEARCH (O(1) Locality Sensitive Hashing)
        let bestCoherence = -1.0;
        let bestIndex = -1;

        // Mengambil kandidat dari Hash Buckets alih-alih seluruh N (O(log N) / O(1))
        const candidates = this.lshIndex.query(normalizedRaw, 50);

        if (candidates.length > 0) {
            for (let c = 0; c < candidates.length; c++) {
                const idx = candidates[c]!;
                const skillPhasor = this.getTensor(idx);
                const coherence = FHRR.similarity(normalizedRaw, skillPhasor);
                if (coherence > bestCoherence) {
                    bestCoherence = coherence;
                    bestIndex = idx;
                }
            }

            // Jika hasil dari LSH sangat baik, kita bisa berhenti
            if (bestCoherence > 0.85 && bestIndex !== -1) {
                const result = {
                    name: this.ruleNames[bestIndex]!,
                    seed: this.ruleSeeds[bestIndex]!,
                    coherence: bestCoherence,
                    phasor: this.getTensor(bestIndex)
                };
                this.tensorCache.set(cacheKey, result);
                return result;
            }
        }

        // 4. FALLBACK: FULL SIMD LINEAR SEARCH (Jika LSH Meleset)
        bestCoherence = -1.0;
        bestIndex = -1;

        for (let i = 0; i < this.activeCount; i++) {
            const skillPhasor = this.getTensor(i);
            // similarity() di FHRR menggunakan dot product sederhana
            const coherence = FHRR.similarity(normalizedRaw, skillPhasor);

            if (coherence > bestCoherence) {
                bestCoherence = coherence;
                bestIndex = i;
            }
        }

        if (bestIndex !== -1) {
            const result = {
                name: this.ruleNames[bestIndex]!,
                seed: this.ruleSeeds[bestIndex]!,
                coherence: bestCoherence,
                phasor: this.getTensor(bestIndex)
            };
            this.tensorCache.set(cacheKey, result);
            return result;
        }

        return null;
    }

    // --- UTILITIES MATEMATIKA KUANTUM BRANCHLESS & SIMD UNROLLING ---

    /**
     * Memaksa V8 JIT Compiler menggunakan Instruksi SIMD perangkat keras
     * dengan menggulung loop (Loop Unrolling) 4 langkah sekaligus.
     */
    private normalizeL2InPlaceFast(v: TensorVector): void {
        let magSq = 0;
        const len = v.length;

        // Loop unrolling (4x)
        for (let i = 0; i < len; i += 4) {
            const v0 = v[i]!;
            const v1 = v[i + 1]!;
            const v2 = v[i + 2]!;
            const v3 = v[i + 3]!;
            magSq += v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3;
        }

        const invMag = 1.0 / (Math.sqrt(magSq) + 1e-15);

        for (let i = 0; i < len; i += 4) {
            v[i]! *= invMag;
            v[i + 1]! *= invMag;
            v[i + 2]! *= invMag;
            v[i + 3]! *= invMag;
        }
    }

    private getCacheKey(tensor: TensorVector): string {
        // Fast hash untuk cache key: mengambil sampel mikro dari vektor 8192-D
        let hash = 0;
        for (let i = 0; i < Math.min(32, tensor.length); i++) {
            const intVal = Math.floor(tensor[i]! * 1000);
            hash = ((hash << 5) - hash) + intVal;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }
}
