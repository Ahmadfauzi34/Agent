import { TensorVector, GLOBAL_DIMENSION } from '../core/config';
import { UniversalManifold } from './UniversalManifold';

/**
 * ============================================================================
 * HOLOGRAM DECODER (The Quantum Observer)
 * ============================================================================
 * Mengubah Medan Gelombang Kuantum (Tensor) kembali menjadi Realitas
 * Diskrit (Grid Piksel) melalui pengukuran resonansi.
 */
export class HologramDecoder {
    private manifold: UniversalManifold;

    constructor(manifold: UniversalManifold) {
        this.manifold = manifold;
    }

    /**
     * 🌊 THE COLLAPSE FUNCTION 🌊
     * Memproyeksikan Tensor (Hologram Universe) ke dalam Grid 2D.
     * Secara murni menggunakan interferensi optik dan gating matematis tanpa If-Else.
     *
     * @param universeTensor Total penjumlahan (Superposisi) dari semua memori/entitas
     * @param width Lebar kanvas target
     * @param height Tinggi kanvas target
     * @param threshold Ambang batas interferensi konstruktif agar sinyal diakui sebagai warna
     */
    public collapseToGrid(
        universeTensor: TensorVector,
        width: number,
        height: number,
        threshold: number = 0.5
    ): number[][] {
        // Inisialisasi grid kosong
        const grid: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

        // Buat matriks 1D untuk menampung intensitas (koherensi) dari setiap tebakan warna
        const colorIntensities = new Float32Array(width * height * 10); // W x H x 10 Spektrum Warna

        // --- 1. MEMBUAT PROBE SUPERPOSISI (Probe semua piksel & warna sekaligus) ---
        // Menciptakan "Sinar Laser" (Probe Phasor) untuk setiap kemungkinan kombinasi spasial dan warna
        for (let c = 1; c < 10; c++) { // Mulai dari warna 1 (Abaikan 0/background)
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const relX = x / Math.max(1, width - 1);
                    const relY = y / Math.max(1, height - 1);

                    // Bangkitkan Sinar Probe
                    const probePhasor = this.manifold.buildPixelTensor(relX, relY, c);

                    // --- 2. PENGUKURAN RESONANSI (Dot Product / Holographic Interference) ---
                    // Mengukur seberapa mirip tebakan posisi dan warna ini dengan semesta asli
                    let coherence = 0.0;
                    for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                        coherence += universeTensor[d]! * probePhasor[d]!;
                    }

                    const index = (y * width + x) * 10 + c;

                    // Kita asumsikan vektor telah dinormalisasi secara L2, namun bisa diskalakan
                    colorIntensities[index] = coherence / GLOBAL_DIMENSION;
                }
            }
        }

        // --- 3. PROSES PEMILIHAN PEMENANG (Winner-Takes-All, 100% Branchless) ---
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let maxIntensity = threshold; // Jika semua warna < threshold, pemenangnya 0 (hitam)
                let winningColor = 0;

                for (let c = 1; c < 10; c++) {
                    const index = (y * width + x) * 10 + c;
                    const intensity = colorIntensities[index]!;

                    // GATING MATEMATIS (Zero If-Else Branching):
                    // Number(intensity > maxIntensity) akan menghasilkan 1 atau 0.
                    const isNewWinner = Number(intensity > maxIntensity);

                    // Update Pemenang:
                    // Jika isNewWinner=1:  (winningColor * 0) + (c * 1) = c
                    // Jika isNewWinner=0:  (winningColor * 1) + (c * 0) = winningColor
                    winningColor = (winningColor * (1 - isNewWinner)) + (c * isNewWinner);
                    maxIntensity = (maxIntensity * (1 - isNewWinner)) + (intensity * isNewWinner);
                }

                grid[y]![x] = winningColor;
            }
        }

        return grid;
    }
}