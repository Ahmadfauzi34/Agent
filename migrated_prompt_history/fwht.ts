import { allocateBuffer } from './config';

/**
 * Fast Walsh-Hadamard Transform (FWHT) Context - Production Ready
 * Dioptimalkan dengan Instance-Based Object Pool, Safe Negative Division,
 * dan L1 Cache-Friendly Matrix Transposition.
 */
export class FWHTContext {
    private workBuffer: Int32Array;
    private transposeBuffer: Int32Array | null = null;

    /**
     * @param maxSize Ukuran memori maksimal yang diprediksi untuk agen (mengurangi Garbage Collection).
     */
    constructor(maxSize: number = 1024) {
        this.workBuffer = allocateBuffer(maxSize);
    }

    // Mengambil buffer internal tanpa memicu Garbage Collection baru
    private getBuffer(size: number): Int32Array {
        if (this.workBuffer.length < size) {
            this.workBuffer = allocateBuffer(size);
        }
        return this.workBuffer.subarray(0, size);
    }

    /**
     * In-place 1D FWHT.
     */
    public transform1D(data: Int32Array): void {
        const N = data.length;
        if (N === 0 || (N & (N - 1)) !== 0) {
            throw new Error(`FWHT Error: Panjang array (${N}) harus pangkat 2.`);
        }

        for (let h = 1; h < N; h *= 2) {
            for (let i = 0; i < N; i += h * 2) {
                for (let j = i; j < i + h; j++) {
                    const x = data[j]!;
                    const y = data[j + h]!;
                    data[j] = x + y;
                    data[j + h] = x - y;
                }
            }
        }
    }

    /**
     * In-place Inverse 1D FWHT.
     * @param skipNormalization Jika true, proses normalisasi dilewati untuk komputasi Bipolar VSA.
     */
    public inverse1D(data: Int32Array, skipNormalization: boolean = false): void {
        this.transform1D(data);
        
        if (!skipNormalization) {
            const N = data.length;
            // Solusi Pergeseran Bit: Menggunakan Math.trunc untuk menjamin 
            // pembulatan bilangan negatif selalu akurat (menuju nol), bukan menuju negatif tak terhingga.
            for (let i = 0; i < N; i++) {
                data[i] = Math.trunc(data[i]! / N); 
            }
        }
    }

    /**
     * Utilitas transpose matriks 2D untuk mencegah L1 Cache Miss.
     */
    private transpose(data: Int32Array, width: number, height: number): void {
        const N = data.length;
        if (!this.transposeBuffer || this.transposeBuffer.length < N) {
            this.transposeBuffer = allocateBuffer(N);
        }

        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                this.transposeBuffer[c * height + r] = data[r * width + c]!;
            }
        }
        data.set(this.transposeBuffer.subarray(0, N));
    }

    /**
     * In-place 2D FWHT - L1 Cache Optimized
     * Melakukan operasi baris, lalu men-transpose matriks untuk mengubah kolom 
     * menjadi baris secara fisik di RAM, sehingga memori diakses berurutan.
     */
    public transform2D(data: Int32Array, width: number, height: number): void {
        if ((width & (width - 1)) !== 0 || (height & (height - 1)) !== 0) {
            throw new Error("FWHT2D Error: Lebar dan tinggi harus pangkat 2.");
        }

        // 1. Evaluasi Baris (Horizontal - L1 Cache Hits 100%)
        for (let r = 0; r < height; r++) {
            const row = data.subarray(r * width, (r + 1) * width);
            this.transform1D(row);
        }

        // 2. Transpose matriks agar kolom menjadi baris
        this.transpose(data, width, height);

        // 3. Evaluasi Kolom (Sekarang secara fisik berada pada indeks berurutan di L1 Cache)
        for (let c = 0; c < width; c++) {
            const col = data.subarray(c * height, (c + 1) * height);
            this.transform1D(col);
        }

        // 4. Kembalikan matriks ke orientasi spasial awalnya
        this.transpose(data, height, width);
    }

    /**
     * In-place Inverse 2D FWHT.
     */
    public inverse2D(data: Int32Array, width: number, height: number, skipNormalization: boolean = false): void {
        this.transform2D(data, width, height);
        
        if (!skipNormalization) {
            const N = width * height;
            for (let i = 0; i < data.length; i++) {
                data[i] = Math.trunc(data[i]! / N);
            }
        }
    }

    /**
     * Dyadic Convolution (Holographic Binding).
     */
    public dyadicConvolution(a: Int32Array, b: Int32Array, bipolarOutput: boolean = false): void {
        const N = a.length;
        if (N !== b.length || (N & (N - 1)) !== 0) {
            throw new Error("Dyadic Convolution Error: Kedua array harus berukuran sama dan pangkat 2.");
        }

        const bClone = this.getBuffer(N);
        bClone.set(b);

        this.transform1D(a);
        this.transform1D(bClone);

        // Perkalian skalar di ruang Spektrum Hadamard
        for (let i = 0; i < N; i++) {
            a[i] *= bClone[i]!;
        }

        this.inverse1D(a, bipolarOutput);

        // Kuantisasi ambang batas (Thresholding) jika mode bipolar aktif
        if (bipolarOutput) {
            for (let i = 0; i < N; i++) {
                a[i] = a[i]! >= 0 ? 1 : -1;
            }
        }
    }
}
