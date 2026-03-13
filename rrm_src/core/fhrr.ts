import FFT from 'fft.js';
import { GLOBAL_DIMENSION } from './config';

export const DIMENSION = GLOBAL_DIMENSION; // Harus kelipatan 2 (Power of 2)
const fft = new FFT(DIMENSION);

// Seeded Random untuk Determinisme (Penting untuk Reproducibility)
let seed = 42; 
const seededRandom = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};

export const FHRR = {
  /**
   * 1. CREATE: Membuat Vektor Unitary (Flat-Spectrum)
   * Vektor ini memiliki magnitudo 1.0 di domain frekuensi, 
   * sehingga tidak akan meledak/hilang saat di-bind berulang kali.
   */
  create: (): Float32Array => {
    const cSpectrum = fft.createComplexArray();

    // DC (0) & Nyquist (N/2) harus Real
    cSpectrum[0] = 1.0; cSpectrum[1] = 0.0; 
    cSpectrum[DIMENSION] = 1.0; cSpectrum[DIMENSION + 1] = 0.0;

    // Isi frekuensi dengan fase acak (Unit Magnitude)
    for (let k = 1; k < DIMENSION / 2; k++) {
      const phase = seededRandom() * Math.PI * 2;
      const cosP = Math.cos(phase);
      const sinP = Math.sin(phase);

      // Frekuensi positif
      cSpectrum[k * 2] = cosP;
      cSpectrum[k * 2 + 1] = sinP;

      // Frekuensi negatif (Conjugate simetri agar hasil IFFT riil)
      const symK = DIMENSION - k;
      cSpectrum[symK * 2] = cosP;
      cSpectrum[symK * 2 + 1] = -sinP;
    }

    const resArray = new Array(DIMENSION);
    fft.inverseTransform(resArray, cSpectrum);

    // Ambil bagian Real saja (karena input kita riil) dan Normalisasi Spasial
    const finalVec = new Float32Array(DIMENSION);
    let magSq = 0;
    for(let i = 0; i < DIMENSION; i++) {
        finalVec[i] = resArray[i * 2]; 
        magSq += finalVec[i] * finalVec[i];
    }
    
    // Normalisasi L2 agar panjang vektor = 1.0
    const mag = Math.sqrt(magSq);
    for(let i = 0; i < DIMENSION; i++) finalVec[i] /= (mag + 1e-12);

    return finalVec;
  },

  /**
   * 2. BIND (Convolution): Mengikat dua konsep.
   * A * B (di domain waktu) <-> FFT(A) . FFT(B) (di domain frekuensi)
   */
  bind: (a: Float32Array, b: Float32Array): Float32Array => {
    const cA = fft.createComplexArray();
    const cB = fft.createComplexArray();
    
    fft.realTransform(cA, Array.from(a));
    
    fft.realTransform(cB, Array.from(b));

    // Perkalian Kompleks Element-wise
    // Layout fft.js untuk realTransform: [r0, i0, r1, i1, ..., rN/2, iN/2]
    // Perlu diperhatikan: r0 dan rN/2 adalah real murni, i0 dan iN/2 biasanya 0 atau packed.
    // Untuk keamanan di fft.js, kita proses sebagai array kompleks biasa setelah transform.
    
    const cRes = new Float64Array(cA.length);
    
    for (let i = 0; i < cA.length; i += 2) {
      const rA = cA[i], iA = cA[i+1];
      const rB = cB[i], iB = cB[i+1];
      
      // (a+bi)(c+di) = (ac-bd) + (ad+bc)i
      cRes[i] = (rA * rB) - (iA * iB);     
      cRes[i+1] = (rA * iB) + (iA * rB);   
    }

    const cOut = fft.createComplexArray();
    fft.inverseTransform(cOut, cRes);
    
    const finalVec = new Float32Array(DIMENSION);
    let magSq = 0;
    
    for(let i = 0; i < DIMENSION; i++) {
        finalVec[i] = cOut[i * 2]; // Ambil bagian Real
        magSq += finalVec[i] * finalVec[i];
    }
    
    // Normalisasi Soft (mencegah overflow/underflow ekstrim)
    const mag = Math.sqrt(magSq);
    if (mag > 1e-9) {
        for(let i = 0; i < DIMENSION; i++) finalVec[i] /= mag;
    }

    return finalVec;
  },

  /**
   * 3. BUNDLE (Superposition): Menjumlahkan konsep.
   * Hasilnya mirip dengan kedua input.
   */
  bundle: (vectors: Float32Array[]): Float32Array => {
    const res = new Float32Array(DIMENSION);
    if (vectors.length === 0) return res;

    for (const v of vectors) {
      for (let i = 0; i < DIMENSION; i++) {
        res[i] += v[i];
      }
    }
    // Tidak dinormalisasi di sini agar "kuat sinyal" (magnitude) terjaga sebagai confidence
    return res;
  },

  /**
   * 4. INVERSE (Involution): Kebalikan dari vektor.
   * Di FHRR (Unitary), Inverse ~= Conjugate ~= Time Reverse.
   * Berguna untuk "Unbinding" (Melepas ikatan).
   * R = Y * X^-1
   */
  inverse: (a: Float32Array): Float32Array => {
    const res = new Float32Array(DIMENSION);
    res[0] = a[0];
    // Membalik urutan elemen [1..N-1] -> [N-1..1]
    for (let i = 1; i < DIMENSION; i++) {
      res[i] = a[DIMENSION - i];
    }
    return res;
  },

  /**
   * 5. SIMILARITY (Cosine Similarity)
   * 🛡️ FIX: Menangani kasus Zero Vector agar tidak NaN.
   */
  similarity: (a: Float32Array, b: Float32Array): number => {
    if (a === b) return 1.0;

    let dot = 0, magA = 0, magB = 0;
    
    for (let i = 0; i < DIMENSION; i++) {
      const valA = a[i];
      const valB = b[i];
      dot += valA * valB;
      magA += valA * valA;
      magB += valB * valB;
    }

    // 🛡️ ANTI-NAN PROTECTION 🛡️
    // Jika vektor kosong (energi sangat kecil), anggap tidak ada kemiripan
    if (magA <= 1e-15 || magB <= 1e-15) return 0.0;

    const sim = dot / Math.sqrt(magA * magB);
    
    // Clipping untuk stabilitas numerik floating point
    return Math.max(-1.0, Math.min(1.0, sim));
  },

  /**
   * 6. FRACTIONAL BINDING (Fisika Kuantum)
   * Memungkinkan pergerakan "setengah langkah" atau transformasi parsial.
   * V^0.5 = Akar kuadrat dari rotasi fase vektor.
   */
  fractionalBind: (vec: Float32Array, power: number): Float32Array => {
    const cA = fft.createComplexArray();
    fft.realTransform(cA, Array.from(vec));

    const cRes = fft.createComplexArray();
    // Proses di domain frekuensi (Polar coordinate power)
    for (let i = 0; i < cA.length; i += 2) {
        const real = cA[i];
        const imag = cA[i+1];
        
        // Konversi ke Polar
        const r = Math.sqrt(real*real + imag*imag);
        const theta = Math.atan2(imag, real);
        
        // Pangkatkan (r^k, theta*k)
        const newR = Math.pow(r, power);
        const newTheta = theta * power;
        
        // Kembali ke Rectangular
        cRes[i] = newR * Math.cos(newTheta);
        cRes[i+1] = newR * Math.sin(newTheta);
    }

    const cOut = fft.createComplexArray();
    fft.inverseTransform(cOut, cRes);
    
    const finalVec = new Float32Array(DIMENSION);
    let magSq = 0;
    for(let i = 0; i < DIMENSION; i++) {
        finalVec[i] = cOut[i * 2];
        magSq += finalVec[i] * finalVec[i];
    }
    const mag = Math.sqrt(magSq);
    if (mag > 1e-9) {
        for(let i = 0; i < DIMENSION; i++) finalVec[i] /= mag;
    }
    return finalVec;
  }
};
