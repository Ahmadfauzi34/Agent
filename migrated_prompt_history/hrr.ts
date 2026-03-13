import { GLOBAL_DIMENSION, allocateBuffer, cloneBuffer } from './config';
import { FWHTContext } from './fwht';

export const DIMENSION = GLOBAL_DIMENSION;
const fwht = new FWHTContext(DIMENSION);

let seed = 42; 
const seededRandom = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};

export const HRR = {
  /**
   * 1. CREATE: Membuat Vektor Bipolar Acak (+1 atau -1)
   */
  create: (): Int32Array => {
    const vec = allocateBuffer(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) {
        vec[i] = seededRandom() > 0.5 ? 1 : -1;
    }
    return vec;
  },

  /**
   * 2. BIND: Menggabungkan dua vektor (Dyadic Convolution via FWHT)
   * Menggunakan FWHTContext untuk performa tinggi.
   */
  bind: (a: Int32Array, b: Int32Array): Int32Array => {
    const result = cloneBuffer(a); // Clone a
    fwht.dyadicConvolution(result, b, true); // true for bipolar output
    return result;
  },

  /**
   * 3. INVERSE: Di ruang Bipolar HRR, Inverse sama dengan vektor itu sendiri (Self-Inverse).
   */
  inverse: (a: Int32Array): Int32Array => {
    // Untuk VSA Bipolar dengan XOR/Hadamard, inverse adalah vektor itu sendiri
    return cloneBuffer(a);
  },

  /**
   * 4. BUNDLE: Superposisi (Penjumlahan)
   * Hasilnya bukan bipolar lagi, melainkan integer.
   */
  bundle: (vecs: Int32Array[]): Int32Array => {
    const res = allocateBuffer(DIMENSION);
    if (vecs.length === 0) return res;
    for (const vec of vecs) {
      for (let i = 0; i < DIMENSION; i++) {
        res[i] += vec[i];
      }
    }
    return res;
  },

  /**
   * 5. NORMALIZE: Mengembalikan vektor integer hasil bundle menjadi Bipolar (+1 / -1)
   */
  normalize: (a: Int32Array): Int32Array => {
    const res = allocateBuffer(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) {
        // Jika 0, kita pilih acak atau default ke 1
        res[i] = a[i] >= 0 ? 1 : -1;
    }
    return res;
  },

  /**
   * 6. SIMILARITY: Cosine Similarity (Dot Product dinormalisasi)
   */
  similarity: (a: Int32Array, b: Int32Array): number => {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < DIMENSION; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  },

  /**
   * 7. FRACTIONAL BINDING: Mengikat vektor dengan dirinya sendiri sebanyak N kali
   * (Berguna untuk merepresentasikan posisi/urutan)
   */
  fractionalBind: (base: Int32Array, power: number): Int32Array => {
    if (power === 0) {
        // Identity vector (semua 1)
        const id = allocateBuffer(DIMENSION);
        id.fill(1);
        return id;
    }
    let result = cloneBuffer(base);
    for (let i = 1; i < power; i++) {
        result = HRR.bind(result, base);
    }
    return result;
  },

  /**
   * 8. CLONE: Menduplikasi buffer
   */
  cloneBuffer: (a: Int32Array): Int32Array => {
    return cloneBuffer(a);
  }
};
