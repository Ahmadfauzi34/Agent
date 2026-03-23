import FFT from 'fft.js';
import { GLOBAL_DIMENSION } from './config';

export const DIMENSION = GLOBAL_DIMENSION; // Harus kelipatan 2 (Power of 2)
const fft = new FFT(DIMENSION);

// Seeded Random untuk Determinisme (Penting untuk Reproducibility)
let seed = 42; 
const seededRandom = (customSeed?: number) => {
    if (customSeed !== undefined) seed = customSeed;
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};

// 🛑 PERHATIAN ARSITEK: Shared Memory Buffers untuk mencegah Garbage Collection Panic.
// Dosa 4: Alokasi Memori Dinamis (.push, new Array) dilarang keras di dalam VSA Core loop.
const _sharedInA = new Float64Array(DIMENSION);
const _sharedInB = new Float64Array(DIMENSION);
const _sharedcA = fft.createComplexArray();
const _sharedcB = fft.createComplexArray();
const _sharedcRes = fft.createComplexArray();
const _sharedcOut = fft.createComplexArray();
const _sharedResArray = new Array(DIMENSION);

export const FHRR = {
  /**
   * 1. CREATE: Membuat Vektor Unitary (Flat-Spectrum)
   */
  create: (customSeed?: number): Float32Array => {
    // DC (0) & Nyquist (N/2) harus Real
    _sharedcRes[0] = 1.0; _sharedcRes[1] = 0.0;
    _sharedcRes[DIMENSION] = 1.0; _sharedcRes[DIMENSION + 1] = 0.0;

    // Isi frekuensi dengan fase acak (Unit Magnitude)
    // Jika customSeed diberikan, ia mereset PRNG agar deterministik sesuai seed
    if (customSeed !== undefined) seededRandom(customSeed);

    for (let k = 1; k < DIMENSION / 2; k++) {
      const phase = seededRandom() * Math.PI * 2;
      const cosP = Math.cos(phase);
      const sinP = Math.sin(phase);

      // Frekuensi positif
      _sharedcRes[k * 2] = cosP;
      _sharedcRes[k * 2 + 1] = sinP;

      // Frekuensi negatif (Conjugate simetri agar hasil IFFT riil)
      const symK = DIMENSION - k;
      _sharedcRes[symK * 2] = cosP;
      _sharedcRes[symK * 2 + 1] = -sinP;
    }

    fft.inverseTransform(_sharedResArray, _sharedcRes);

    const finalVec = new Float32Array(DIMENSION);
    let magSq = 0;
    for(let i = 0; i < DIMENSION; i++) {
        finalVec[i] = _sharedResArray[i * 2];
        magSq += finalVec[i] * finalVec[i];
    }
    
    // Normalisasi L2 (Math Branchless)
    const invMag = 1.0 / (Math.sqrt(magSq) + 1e-15);
    for(let i = 0; i < DIMENSION; i++) finalVec[i] *= invMag;

    return finalVec;
  },

  /**
   * 2. BIND (Convolution): Mengikat dua konsep.
   */
  bind: (a: Float32Array, b: Float32Array): Float32Array => {
    // Zero-Copy/Minimal-Copy float transfer
    for (let i = 0; i < DIMENSION; i++) {
        _sharedInA[i] = a[i];
        _sharedInB[i] = b[i];
    }

    fft.realTransform(_sharedcA, _sharedInA);
    fft.realTransform(_sharedcB, _sharedInB);
    
    for (let i = 0; i < _sharedcA.length; i += 2) {
      const rA = _sharedcA[i], iA = _sharedcA[i+1];
      const rB = _sharedcB[i], iB = _sharedcB[i+1];
      
      // (a+bi)(c+di) = (ac-bd) + (ad+bc)i
      _sharedcRes[i] = (rA * rB) - (iA * iB);
      _sharedcRes[i+1] = (rA * iB) + (iA * rB);
    }

    fft.inverseTransform(_sharedcOut, _sharedcRes);
    
    const finalVec = new Float32Array(DIMENSION);
    let magSq = 0;
    
    for(let i = 0; i < DIMENSION; i++) {
        finalVec[i] = _sharedcOut[i * 2]; // Ambil bagian Real
        magSq += finalVec[i] * finalVec[i];
    }
    
    // Normalisasi (Math Branchless)
    const invMag = 1.0 / (Math.sqrt(magSq) + 1e-15);
    for(let i = 0; i < DIMENSION; i++) finalVec[i] *= invMag;

    return finalVec;
  },

  /**
   * 3. BUNDLE (Superposition): Menjumlahkan konsep.
   */
  bundle: (vectors: Float32Array[]): Float32Array => {
    const res = new Float32Array(DIMENSION);
    if (vectors.length === 0) return res;

    for (const v of vectors) {
      for (let i = 0; i < DIMENSION; i++) {
        res[i] += v[i];
      }
    }
    return res;
  },

  /**
   * 4. INVERSE (Involution): Kebalikan dari vektor.
   */
  inverse: (a: Float32Array): Float32Array => {
    const res = new Float32Array(DIMENSION);
    res[0] = a[0];
    for (let i = 1; i < DIMENSION; i++) {
      res[i] = a[DIMENSION - i];
    }
    return res;
  },

  /**
   * 5. SIMILARITY (Cosine Similarity)
   */
  similarity: (a: Float32Array, b: Float32Array): number => {
    let dot = 0, magA = 0, magB = 0;
    
    for (let i = 0; i < DIMENSION; i++) {
      const valA = a[i]!;
      const valB = b[i]!;
      dot += valA * valB;
      magA += valA * valA;
      magB += valB * valB;
    }

    // 🛡️ ANTI-NAN PROTECTION Branchless Math
    const denominator = Math.sqrt(magA * magB) + 1e-15;
    const sim = dot / denominator;
    
    return Math.max(-1.0, Math.min(1.0, sim));
  },

  /**
   * 6. FRACTIONAL BINDING (Fisika Kuantum)
   */
  fractionalBind: (vec: Float32Array, power: number): Float32Array => {
    for (let i = 0; i < DIMENSION; i++) {
        _sharedInA[i] = vec[i]!;
    }
    fft.realTransform(_sharedcA, _sharedInA);

    for (let i = 0; i < _sharedcA.length; i += 2) {
        const real = _sharedcA[i]!;
        const imag = _sharedcA[i+1]!;
        
        // Konversi ke Polar
        const r = Math.sqrt(real*real + imag*imag);
        const theta = Math.atan2(imag, real);
        
        // Pangkatkan (r^k, theta*k)
        const newR = Math.pow(r, power);
        const newTheta = theta * power;
        
        // Kembali ke Rectangular
        _sharedcRes[i] = newR * Math.cos(newTheta);
        _sharedcRes[i+1] = newR * Math.sin(newTheta);
    }

    fft.inverseTransform(_sharedcOut, _sharedcRes);
    
    const finalVec = new Float32Array(DIMENSION);
    let magSq = 0;
    for(let i = 0; i < DIMENSION; i++) {
        finalVec[i] = _sharedcOut[i * 2]!;
        magSq += finalVec[i] * finalVec[i];
    }

    // Normalisasi Branchless
    const invMag = 1.0 / (Math.sqrt(magSq) + 1e-15);
    for(let i = 0; i < DIMENSION; i++) finalVec[i] *= invMag;

    return finalVec;
  }
};
