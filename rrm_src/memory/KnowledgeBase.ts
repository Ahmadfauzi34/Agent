import * as fs from 'fs';
import * as path from 'path';
import { GLOBAL_DIMENSION } from '../core/config.js';
import { CoreSeeds } from '../core/CoreSeeds.js';
import { FHRR } from '../core/fhrr.js';

export interface SymbolicComponent {
    seed: string; // Nama konseptual (misal "X_AXIS_SEED", "COLOR_RED")
    weight?: number; // Opsional: bobot ikatan (default: 1.0)
    phase?: number;  // Opsional: fasa fraksional, e.g. -1 untuk inverse/mundur
}

export interface MemoryTrace {
    axiomType: string;         // e.g. "Translasi Y+1", "Rotasi90"
    composition: SymbolicComponent[];
    entropyAtCreation: number;
    timestamp: number;
    version: string;           // Seed bank version (e.g. "v1.0")
    dimensionAtCreation: number;
}

/**
 * KnowledgeBase (Pusat Transfer Pengetahuan)
 * Menerapkan prinsip: WORA (Write Once, Run Anywhere) untuk Tensor Space.
 * Meng-export/import "Resep Simbolik" (.json) dan "Binary Cache" (.bin).
 */
export class KnowledgeBase {
    private readonly VERSION = "v1.0";

    constructor(private memoryDir: string) {
        if (!fs.existsSync(this.memoryDir)) {
            fs.mkdirSync(this.memoryDir, { recursive: true });
        }
    }

    /**
     * Memuat Aksioma/Skill dari penyimpanan (JSON + BIN).
     * Jika cache binary (BIN) valid dan dimensinya cocok, load secepat kilat (O(1) I/O).
     * Jika cache miss atau dimensi berubah (contoh: load model 8192-D ke engine 1024-D),
     * rekonstruksi ulang (rebuild) dari resep Simbolik JSON.
     */
    public loadAxiom(baseName: string): Float32Array {
        const tracePath = path.join(this.memoryDir, `${baseName}.json`);
        const binPath = path.join(this.memoryDir, `${baseName}.bin`);

        if (!fs.existsSync(tracePath)) {
            throw new Error(`[KnowledgeBase] Gagal memuat aksioma: File simbolik ${tracePath} tidak ditemukan.`);
        }

        const trace: MemoryTrace = JSON.parse(fs.readFileSync(tracePath, 'utf8'));

        // 1. Validasi Cache Binary
        if (this.isCacheValid(trace, binPath)) {
            console.log(`[KnowledgeBase] Memuat Aksioma '${trace.axiomType}' dari Fast Binary Cache...`);
            return this.loadFastBinary(binPath);
        }

        // 2. Skenario Rekonstruksi (Cache Miss / Dimensi Berubah)
        console.log(`[KnowledgeBase] Merakit ulang Aksioma '${trace.axiomType}' (v${trace.version}) pada dimensi ${GLOBAL_DIMENSION}...`);
        const reconstructedTensor = new Float32Array(GLOBAL_DIMENSION);

        // Memulai dari "Kanvas Kosong" Tensor Identitas (Semua nilai 0 phase / real 1.0)
        // Note: Sebenarnya identitas FHRR adalah buffer dengan angka 0 semua, yang saat di-bind tidak mengubah apa-apa.
        // Tapi secara praktis, kita akan men-generate Seed pertama, lalu mem-bind sisa komponennya.

        if (trace.composition.length === 0) {
            return reconstructedTensor; // Kosong
        }

        // Ambil komponen pertama sebagai base
        const firstComp = trace.composition[0]!;
        const baseSeed = this.resolveSeedVector(firstComp.seed, firstComp.phase);
        reconstructedTensor.set(baseSeed);

        // Bind berurutan untuk sisa komponen
        let currentTensor = reconstructedTensor;
        for (let i = 1; i < trace.composition.length; i++) {
            const comp = trace.composition[i]!;
            const seedVector = this.resolveSeedVector(comp.seed, comp.phase);

            // FHRR Bind = Menggabungkan konsep (Resonansi Interferensi)
            // Note: FHRR TS version uses .bind(), so we update currentTensor
            currentTensor = FHRR.bind(currentTensor, seedVector);
        }
        reconstructedTensor.set(currentTensor);

        // 3. Simpan hasil rakitan baru ke .bin agar load berikutnya instan!
        this.saveFastBinary(binPath, reconstructedTensor);

        return reconstructedTensor;
    }

    /**
     * Menyimpan Aksioma/Skill ke disk dalam format Simbolik (JSON) dan Binary Cache (BIN).
     */
    public saveAxiom(baseName: string, axiomType: string, composition: SymbolicComponent[], tensor: Float32Array, entropy: number): void {
        const tracePath = path.join(this.memoryDir, `${baseName}.json`);
        const binPath = path.join(this.memoryDir, `${baseName}.bin`);

        const trace: MemoryTrace = {
            axiomType,
            composition,
            entropyAtCreation: entropy,
            timestamp: Date.now(),
            version: this.VERSION,
            dimensionAtCreation: GLOBAL_DIMENSION
        };

        // 1. Simpan Symbolic (Eternal & Portable)
        fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2));

        // 2. Simpan Binary (Fast Cache)
        this.saveFastBinary(binPath, tensor);

        console.log(`[KnowledgeBase] Aksioma '${axiomType}' berhasil diekspor ke disk.`);
    }

    private isCacheValid(trace: MemoryTrace, binPath: string): boolean {
        if (!fs.existsSync(binPath)) return false;

        // Verifikasi apakah versi Engine (v1.0) sama dan Dimensi Tensor saat ini (GLOBAL_DIMENSION)
        // sama dengan saat cache dibuat. Jika dimensi berubah, file .bin sudah tidak relevan.
        return trace.version === this.VERSION && trace.dimensionAtCreation === GLOBAL_DIMENSION;
    }

    private loadFastBinary(binPath: string): Float32Array {
        const buffer = fs.readFileSync(binPath);
        // Mengkonversi NodeJS Buffer kembali menjadi memori Float32Array secepat kilat (Zero-Parsing)
        return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT);
    }

    private saveFastBinary(binPath: string, tensor: Float32Array): void {
        // Menyimpan memori blok Float32Array langsung ke disk (Zero-Serialization overhead)
        const buffer = Buffer.from(tensor.buffer, tensor.byteOffset, tensor.byteLength);
        fs.writeFileSync(binPath, buffer);
    }

    /**
     * Menerjemahkan nama String (Symbolic) menjadi vektor fisik 8192-D (atau dimensi berapapun saat ini).
     */
    private resolveSeedVector(seedName: string, phase?: number): Float32Array {
        let baseSeed: Float32Array;

        // Memetakan simbol ke konstanta CoreSeeds
        switch (seedName) {
            case "X_AXIS_SEED": baseSeed = CoreSeeds.X_AXIS_SEED; break;
            case "Y_AXIS_SEED": baseSeed = CoreSeeds.Y_AXIS_SEED; break;
            default:
                // Generate pseudo-random vector based on string hash for unknown seeds
                baseSeed = FHRR.create(this.hashStringToInt(seedName));
                break;
        }

        // Jika memiliki fasa spesifik (misal fasa -1 untuk inverse/mundur)
        if (phase !== undefined && phase !== 1.0) {
            return FHRR.fractionalBind(baseSeed, phase);
        } else {
            return baseSeed; // Standar
        }
    }

    private hashStringToInt(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash); // Pastikan seed positif
    }
}
