import { TensorVector, GLOBAL_DIMENSION } from '../core/config.js';
import { EntityManifold } from '../core/EntityManifold.js';
import { UniversalManifold } from './UniversalManifold.js';

/**
 * ============================================================================
 * HOLOGRAM DECODER (The Quantum Observer)
 * ============================================================================
 * Mengubah Medan Gelombang Kuantum (EntityManifold) kembali menjadi Realitas
 * Diskrit (Grid Piksel) melalui pengukuran resonansi individu per-entitas.
 */
export class HologramDecoder {
    private manifoldPerceiver: UniversalManifold;

    constructor(manifoldPerceiver: UniversalManifold) {
        this.manifoldPerceiver = manifoldPerceiver;
    }

    /**
     * 🌊 THE COLLAPSE FUNCTION 🌊
     * Memproyeksikan EntityManifold ke dalam Grid 2D.
     * Menggunakan ECS/SoA architecture dan probe iterasi cerdas tanpa If-Else.
     */
    public collapseToGrid(
        manifold: EntityManifold,
        width: number,
        height: number,
        threshold: number = 0.5 // Diturunkan agar toleran terhadap decoherence
    ): number[][] {
        // Inisialisasi grid kosong
        const grid: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

        // Karena kita menggunakan EntityManifold, kita akan "menembakkan" probe spasial
        // ke MASING-MASING entitas aktif, bukan ke 1 universeTensor raksasa yang rentan crosstalk.
        const numEntities = manifold.activeCount;

        for (let e = 0; e < numEntities; e++) {
            // V8 Optimized Control Flow (Abaikan entitas mati/vakum)
            if (manifold.masses[e] === 0.0) continue;

            const eTensor = manifold.getTensor(e);

            // Kita sudah tau token aslinya dari manifold (kecuali jika hukum termodinamika mengubah warna,
            // untuk iterasi ini kita asumsikan warna stabil dan posisi/bentuk yang berubah).
            const token = manifold.tokens[e]!;

            // Limit penyebaran probe berdasarkan spread awal entitas agar efisien (O(N) rendering lokal)
            // Akar kuadrat spread memberi kita radius radius pencarian spasial kasar
            const radius = Math.ceil(Math.sqrt(manifold.spreads[e]!)) + 1;

            // Titik tengah awal entitas (Sebagai patokan pencarian)
            const centerX = Math.floor(manifold.centersX[e]! * (width - 1));
            const centerY = Math.floor(manifold.centersY[e]! * (height - 1));

            const startX = Math.max(0, centerX - radius);
            const endX = Math.min(width - 1, centerX + radius);
            const startY = Math.max(0, centerY - radius);
            const endY = Math.min(height - 1, centerY + radius);

            // Tembakkan probe di seluruh grid (Mencari jika entitas teleportasi jauh)
            // Meskipun radius lokal bisa dihitung, karena ini superposisi yang mengalami WaveGravity,
            // posisinya bisa bergeser ke ujung grid.
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const relX = x / Math.max(1, width - 1);
                    const relY = y / Math.max(1, height - 1);

                    // Bangkitkan Sinar Probe (Hanya mencari kecocokan posisi, abaikan token karena token nempel di manifold)
                    const probePhasor = this.manifoldPerceiver.buildPixelTensor(relX, relY, token);

                    // PENGUKURAN RESONANSI (Dot Product / Holographic Interference)
                    let coherence = 0.0;
                    for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                        coherence += eTensor[d]! * probePhasor[d]!;
                    }

                    // Threshold disesuaikan dengan Dot Product dari tensor termodinamika.
                    // Karena telah mengalami banyak phase shift (decay, gravity), dot product mungkin kecil.
                    // Kita berikan threshold absolut yang lebih rendah.
                    const isConstructive = Number(coherence > 0.1);

                    // Branchless Overwrite
                    grid[y]![x] = (grid[y]![x]! * (1 - isConstructive)) + (token * isConstructive);
                }
            }
        }

        return grid;
    }
}