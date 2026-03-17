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
     * 🌊 THE COLLAPSE FUNCTION (True Quantum Collapse) 🌊
     * Memproyeksikan Superposisi Entitas Kuantum kembali menjadi Grid 2D.
     * Menggunakan "Coherence Z-Buffer" dan "Multi-Spectrum Probe" untuk
     * merender mutasi warna secara otomatis tanpa `if/else`.
     */
    public collapseToGrid(
        manifold: EntityManifold,
        width: number,
        height: number,
        threshold: number = 0.1 // Minimum coherence to overcome vacuum noise
    ): number[][] {
        // Inisialisasi grid realitas (0 = vakum)
        const grid: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

        // Inisialisasi Z-Buffer (Mengukur kedalaman amplitudo/coherence tertinggi)
        // 0.0 adalah vakum. Benda dengan resonansi lebih kuat akan mengalahkan benda samar.
        const zBuffer: number[][] = Array.from({ length: height }, () => Array(width).fill(0.0));

        const numEntities = manifold.activeCount;

        for (let e = 0; e < numEntities; e++) {
            // Abaikan entitas yang telah runtuh menjadi ruang hampa (mass = 0)
            if (manifold.masses[e] === 0.0) continue;

            const eTensor = manifold.getTensor(e);

            // OPTIMASI: Batasi area Sinar Probe berdasarkan Pusat Massa & Bounding Box Anisotropik aslinya.
            // Menembak seluruh grid akan melumpuhkan CPU.
            const spanX = manifold.spansX[e]!;
            const spanY = manifold.spansY[e]!;

            const centerX = Math.floor(manifold.centersX[e]! * (width - 1));
            const centerY = Math.floor(manifold.centersY[e]! * (height - 1));

            // Radius pencarian = setengah span + padding untuk mentolerir pergeseran kecil
            const halfX = Math.floor(spanX / 2) + 1;
            const halfY = Math.floor(spanY / 2) + 1;

            const startX = Math.max(0, centerX - halfX);
            const endX = Math.min(width - 1, centerX + halfX);
            const startY = Math.max(0, centerY - halfY);
            const endY = Math.min(height - 1, centerY + halfY);

            // Misi 2 (Mutasi Warna) & Evaluasi Z-Buffer
            // Memindai probabilitas spektrum secara penuh HANYA di dalam area Anisotropik Bounding Box lokal
            // Mengatasi clipping bug pada objek linier panjang (garis 1x30).
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    const relX = x / Math.max(1, width - 1);
                    const relY = y / Math.max(1, height - 1);

                    // ==========================================
                    // SENSOR MULTI-SPEKTRUM (Scan Semua 10 Warna ARC)
                    // ==========================================
                    let bestColor = 0;
                    let bestCoherence = -Infinity;

                    // Kita uji resonansi Entitas ini terhadap semua kemungkinan 10 Warna ARC (0-9)
                    // pada koordinat (X, Y) ini. Warna yang paling beresonansi adalah warna sejatinya.
                    for (let c = 0; c < 10; c++) {
                        const probePhasor = this.manifoldPerceiver.buildPixelTensor(relX, relY, c);

                        let coherence = 0.0;
                        for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                            coherence += eTensor[d]! * probePhasor[d]!;
                        }

                        // Branchless Max
                        const isBetter = Number(coherence > bestCoherence);
                        bestCoherence = (bestCoherence * (1 - isBetter)) + (coherence * isBetter);
                        bestColor = (bestColor * (1 - isBetter)) + (c * isBetter);
                    }

                    // ==========================================
                    // KONDISI KOLAPS (The Quantum Z-Buffer)
                    // ==========================================
                    // Apakah sinyal entitas ini cukup kuat untuk menembus vakum?
                    const isVisible = Number(bestCoherence > threshold);

                    // Apakah sinyal entitas ini lebih kuat (solid) dari benda lain yang sudah ada di koordinat ini?
                    const isFront = Number(bestCoherence > zBuffer[y]![x]!);

                    // Hanya menimpa grid jika entitas ini TERLIHAT dan BERADA DI DEPAN (Coherence tertinggi)
                    const shouldOverwrite = isVisible * isFront;

                    zBuffer[y]![x] = (zBuffer[y]![x]! * (1 - shouldOverwrite)) + (bestCoherence * shouldOverwrite);
                    grid[y]![x] = (grid[y]![x]! * (1 - shouldOverwrite)) + (bestColor * shouldOverwrite);
                }
            }
        }

        return grid;
    }
}