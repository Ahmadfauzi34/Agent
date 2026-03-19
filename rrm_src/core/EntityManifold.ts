import { GLOBAL_DIMENSION, MAX_ENTITIES, TensorVector } from './config.js';

/**
 * 🌌 ENTITY MANIFOLD (Structure of Arrays - SoA)
 * 100% Bebas Dosa Pemujaan Objek (OOP) & Bebas Pemujaan Dinamis (.push).
 *
 * Mengelola seluruh entitas (CognitiveEntity) di alam semesta menggunakan
 * array paralel linier yang pre-allocated. Menjamin L1 Cache Hit rate tertinggi.
 */
export class EntityManifold {
    /** Pointer ke indeks kosong berikutnya */
    public activeCount: number = 0;

    /** Resolusi Dunia Kuantum X (Lebar Layar Maksimal) */
    public globalWidth: number = 1;

    /** Resolusi Dunia Kuantum Y (Tinggi Layar Maksimal) */
    public globalHeight: number = 1;

    // --- STRUKTUR ECS (Data Terpisah Berdasar Komponen, Bukan Objek) --- //

    /** ID String (Satu-satunya properti non-numerik, diakses jarang) */
    public ids: string[];

    /** Nilai fisik warna / ASCII (Kunci Klasifikasi), Float32 untuk performa mesin */
    public tokens: Float32Array;

    /** Energi amplitudo (Jumlah piksel pembentuk) */
    public masses: Float32Array;

    /** Penyebaran dimensi spasial maksimum X (Lebar Bounding Box) */
    public spansX: Float32Array;

    /** Penyebaran dimensi spasial maksimum Y (Tinggi Bounding Box) */
    public spansY: Float32Array;

    /** Pusat massa relatif X (0.0 - 1.0) */
    public centersX: Float32Array;

    /** Pusat massa relatif Y (0.0 - 1.0) */
    public centersY: Float32Array;

    /** Arah pergerakan / Inersia kinematika X */
    public momentumsX: Float32Array;

    /** Arah pergerakan / Inersia kinematika Y */
    public momentumsY: Float32Array;

    /** Tensor Raksasa: 500 x 8192 Dimention Array. Semua hypervector ditumpuk dalam 1 blok linier RAM */
    public tensors: Float32Array;

    /** Status keterikatan kuantum Hebbian (0.0 - 1.0) */
    public entanglementStatus: Float32Array;

    constructor() {
        this.ids = new Array(MAX_ENTITIES).fill("");
        this.tokens = new Float32Array(MAX_ENTITIES);
        this.masses = new Float32Array(MAX_ENTITIES);
        this.spansX = new Float32Array(MAX_ENTITIES);
        this.spansY = new Float32Array(MAX_ENTITIES);
        this.centersX = new Float32Array(MAX_ENTITIES);
        this.centersY = new Float32Array(MAX_ENTITIES);
        this.momentumsX = new Float32Array(MAX_ENTITIES);
        this.momentumsY = new Float32Array(MAX_ENTITIES);
        this.tensors = new Float32Array(MAX_ENTITIES * GLOBAL_DIMENSION);
        this.entanglementStatus = new Float32Array(MAX_ENTITIES);
    }

    /**
     * Membersihkan alam semesta. Mengembalikan pointer ke nol tanpa melepaskan alokasi RAM.
     * Cepat dan ramah Garbage Collector.
     */
    public clear(): void {
        this.activeCount = 0;
        this.globalWidth = 1;
        this.globalHeight = 1;
        // Kita tidak perlu mengisi nol seluruh array karena alokasi pointer `activeCount`
        // sudah memblokir akses ke indeks sampah masa lalu. Hanya membersihkan apa yang diperlukan.
        // Jika butuh nol mutlak, Float32Array.fill() sangat dioptimasi V8.
    }

    /**
     * 🏭 Mengalokasikan "Slot Ruang" untuk entitas baru (Bebas Push).
     * @returns index integer entitas yang baru dialokasikan, atau -1 jika penuh.
     */
    public allocateEntity(): number {
        if (this.activeCount >= MAX_ENTITIES) return -1;
        const index = this.activeCount++;

        // Zero-initialization untuk slot tensor agar bersih dari kehidupan sebelumnya
        const offset = index * GLOBAL_DIMENSION;
        this.tensors.fill(0.0, offset, offset + GLOBAL_DIMENSION);

        // Reset properties
        this.masses[index] = 0.0;
        this.spansX[index] = 0.0;
        this.spansY[index] = 0.0;
        this.centersX[index] = 0.0;
        this.centersY[index] = 0.0;
        this.momentumsX[index] = 0.0;
        this.momentumsY[index] = 0.0;
        this.entanglementStatus[index] = 0.0;

        return index;
    }

    /**
     * Menghancurkan entitas dari realitas fisik (Keadaan Vakum - Hukum 5)
     * Tanpa memicu `splice` array dan kebocoran indeks.
     */
    public annihilateEntity(index: number): void {
        if (index < 0 || index >= this.activeCount) return;

        this.masses[index] = 0.0; // Math branchless death (Kehilangan energi)

        // Tensor dikalikan dengan nol (Vakum)
        const offset = index * GLOBAL_DIMENSION;
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            this.tensors[offset + i] = 0.0;
        }
    }

    /**
     * Membantu mengambil Sub-array 8192-D (Hypervector) dari satu entitas
     * secara efisien tanpa membuat copy baru di memori (Pointer Share).
     */
    public getTensor(index: number): TensorVector {
        const offset = index * GLOBAL_DIMENSION;
        return this.tensors.subarray(offset, offset + GLOBAL_DIMENSION);
    }

    /**
     * Menerapkan normalisasi L2 untuk satu entitas (Math Branchless)
     */
    public normalizeL2(index: number): void {
        const tensor = this.getTensor(index);
        let magSq = 0;
        for (let i = 0; i < GLOBAL_DIMENSION; i++) magSq += tensor[i]! * tensor[i]!;

        const invMag = 1.0 / (Math.sqrt(magSq) + 1e-15);
        for (let i = 0; i < GLOBAL_DIMENSION; i++) tensor[i] *= invMag;
    }

    /**
     * 🏎️ V8 Optimized Iterator untuk Entitas Aktif (Hukum 5 & L1 Cache)
     * Hanya mengeksekusi callback jika massa entitas > 0 (bukan Vacuum State).
     */
    public forEachActive(
        callback: (index: number, mass: number, relX: number, relY: number, token: number) => void
    ): void {
        for (let i = 0; i < this.activeCount; i++) {
            const m = this.masses[i]!;
            if (m > 0.0) {
                callback(i, m, this.centersX[i]!, this.centersY[i]!, this.tokens[i]!);
            }
        }
    }
}
