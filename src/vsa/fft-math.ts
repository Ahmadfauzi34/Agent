import FFT from 'fft.js';

export const DIMENSION = 1024; // Harus kelipatan 2 (Power of 2) untuk FFT
const fft = new FFT(DIMENSION);

// Seeded Random untuk Audit Fisika (Determinisme)
let seed = 42; 
const seededRandom = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};

export const HoloFFT = {
  // 1. Membuat vektor riil acak (Distribusi Normal/Gaussian aproksimasi)
    // 1. Membuat Vektor Unitary (Flat-Spectrum)
    // 1. Membuat Vektor Unitary (Flat-Spectrum) untuk Akurasi 100%
  create: (): Float64Array => {
    const cSpectrum = fft.createComplexArray();

    // Frekuensi DC (0) dan Nyquist (N/2) wajib riil
    cSpectrum[0] = 1.0; cSpectrum[1] = 0.0;
    cSpectrum[DIMENSION] = 1.0; cSpectrum[DIMENSION + 1] = 0.0;

    // Isi sisa spektrum frekuensi dengan fase acak, tapi Amplitudo mutlak 1.0
    for (let k = 1; k < DIMENSION / 2; k++) {
      const phase = seededRandom() * Math.PI * 2;
      const cosP = Math.cos(phase);
      const sinP = Math.sin(phase);

      cSpectrum[k * 2] = cosP;
      cSpectrum[k * 2 + 1] = sinP;

      const symK = DIMENSION - k;
      cSpectrum[symK * 2] = cosP;
      cSpectrum[symK * 2 + 1] = -sinP;
    }

    const resArray = new Array(DIMENSION);
    fft.inverseTransform(resArray, cSpectrum);

    const finalVec = new Float64Array(DIMENSION);
    let magSq = 0;
    for(let i = 0; i < DIMENSION; i++) {
        // 🚨 BUG FIX: Ambil index genap (i * 2) agar sinkron dengan fungsi bind!
        finalVec[i] = resArray[i * 2]; 
        magSq += finalVec[i] * finalVec[i];
    }
    
    const mag = Math.sqrt(magSq);
    for(let i = 0; i < DIMENSION; i++) finalVec[i] /= mag;

    return finalVec;
  },


  // 2. BINDING (Circular Convolution via FFT)
  // Rumus: Z = IFFT( FFT(X) ⊙ FFT(Y) )
    // 2. BINDING (Circular Convolution via FFT) MURNI TANPA NORMALISASI
    // 2. BINDING (Circular Convolution via FFT)
  bind: (a: Float64Array, b: Float64Array): Float64Array => {
    const cA = fft.createComplexArray();
    const cB = fft.createComplexArray();
    
    fft.realTransform(cA, Array.from(a));
    fft.completeSpectrum(cA);
    fft.realTransform(cB, Array.from(b));
    fft.completeSpectrum(cB);

    const cRes = fft.createComplexArray();
    
    // Perkalian Kompleks
    for (let i = 0; i < DIMENSION * 2; i += 2) {
      const rA = cA[i], iA = cA[i+1];
      const rB = cB[i], iB = cB[i+1];
      cRes[i] = (rA * rB) - (iA * iB);     
      cRes[i+1] = (rA * iB) + (iA * rB);   
    }

    const cOut = fft.createComplexArray();
    fft.inverseTransform(cOut, cRes);
    
    const finalVec = new Float64Array(DIMENSION);
    let magSq = 0;
    
    for(let i = 0; i < DIMENSION; i++) {
        // 🚨 BUG FIX KRUSIAL: Ambil index genap (i * 2) untuk mendapatkan nilai Real murni!
        finalVec[i] = cOut[i * 2];
        magSq += finalVec[i] * finalVec[i];
    }
    
    // Normalisasi dikembalikan untuk mencegah Overflow pada superposisi tinggi
    const mag = Math.sqrt(magSq);
    if (mag > 0) {
        for(let i = 0; i < DIMENSION; i++) finalVec[i] /= mag;
    }

    return finalVec;
  },

  // 3. BUNDLING (Penjumlahan Vektor Murni - Superposition)
  // Tidak ada lagi masalah Majority Rule yang merusak data!
  bundle: (vectors: Float64Array[]): Float64Array => {
    const res = new Float64Array(DIMENSION);
    if (vectors.length === 0) return res;

    for (const v of vectors) {
      for (let i = 0; i < DIMENSION; i++) {
        res[i] += v[i];
      }
    }
    // Biarkan tanpa normalisasi keras agar bobot (weight) terakumulasi,
    // Cosine similarity akan otomatis menangani magnitudo-nya.
    return res;
  },

  // 4. INVERSE (Membalik ruang dimensi untuk mencari Rule)
  // V_inv[0] = V[0], dan V_inv[i] = V[DIMENSION - i]
  inverse: (a: Float64Array): Float64Array => {
    const res = new Float64Array(DIMENSION);
    res[0] = a[0];
    for (let i = 1; i < DIMENSION; i++) {
      res[i] = a[DIMENSION - i];
    }
    return res;
  },

  // 5. SIMILARITY (Cosine Similarity)
  // Menghasilkan rentang -1.0 (Berlawanan) hingga 1.0 (Identik)
  similarity: (a: Float64Array, b: Float64Array): number => {
    // 🚀 OPTIMISASI 1: Fast-Bailout. Jika referensi memorinya sama persis, 
    // langsung kembalikan 1.0 tanpa perlu iterasi 1024 kali.
    if (a === b) return 1.0;

    let dot = 0, magA = 0, magB = 0;
    
    for (let i = 0; i < DIMENSION; i++) {
      // 🚀 OPTIMISASI 2: Cache pembacaan array ke variabel lokal
      // Ini membantu JIT Compiler (V8) menghindari array lookups berulang
      const valA = a[i];
      const valB = b[i];
      
      dot += valA * valB;
      magA += valA * valA;
      magB += valB * valB;
    }

    // 🛡️ SAFETY 1: Mencegah NaN karena zero magnitude atau presisi teramat kecil
    if (magA <= 1e-15 || magB <= 1e-15) return 0;

    // 🚀 OPTIMISASI 3: Menggabungkan Math.sqrt
    // Math.sqrt(A) * Math.sqrt(B) sama dengan Math.sqrt(A * B).
    // Ini memangkas 1 operasi pemanggilan fungsi C++ yang berat di bawah kap V8.
    const sim = dot / Math.sqrt(magA * magB);

    // 🛡️ SAFETY 2: Float Clipping
    // Penyatuan FFT (Bundle) berulang kali bisa menghasilkan nilai seperti 1.0000000000000002.
    // Jepit nilainya agar mutlak berada di rentang [-1.0, 1.0].
    return Math.max(-1.0, Math.min(1.0, sim));
  },

  // 6. POWER (Fractional/Integer Power of a Vector)
  // V^x = IFFT( FFT(V)^x )
  power: (a: Float64Array, x: number): Float64Array => {
    const cA = fft.createComplexArray();
    fft.realTransform(cA, Array.from(a));
    fft.completeSpectrum(cA);

    const cRes = fft.createComplexArray();
    for (let i = 0; i < DIMENSION * 2; i += 2) {
      const real = cA[i];
      const imag = cA[i+1];
      
      // Convert to polar
      const r = Math.sqrt(real * real + imag * imag);
      const theta = Math.atan2(imag, real);
      
      // Apply power
      const r_pow = Math.pow(r, x);
      const theta_pow = theta * x;
      
      // Convert back to rectangular
      cRes[i] = r_pow * Math.cos(theta_pow);
      cRes[i+1] = r_pow * Math.sin(theta_pow);
    }

    const cOut = fft.createComplexArray();
    fft.inverseTransform(cOut, cRes);
    
    const finalVec = new Float64Array(DIMENSION);
    let magSq = 0;
    for(let i = 0; i < DIMENSION; i++) {
        finalVec[i] = cOut[i * 2];
        magSq += finalVec[i] * finalVec[i];
    }
    
    const mag = Math.sqrt(magSq);
    if (mag > 0) {
        for(let i = 0; i < DIMENSION; i++) finalVec[i] /= mag;
    }
    return finalVec;
  }
};
