export const Physics = {
  // Sigmoid manual (Gating)
  sigmoid: (x: number): number => 1 / (1 + Math.exp(-x)),

  // Menghitung Amplitudo dari output fft.js (Real + Imaginary)
  getMagnitudes: (fftOutput: Float64Array | number[]): number[] => {
    const mags: number[] = [];
    // Skip index 0 & 1 (DC component biasanya sangat tinggi)
    for (let i = 2; i < fftOutput.length; i += 2) {
      const re = fftOutput[i];
      const im = fftOutput[i + 1];
      mags.push(Math.sqrt(re * re + im * im));
    }
    return mags;
  },

  // Peak-to-Mean Ratio (Inti dari Teori SRG kita)
  calculatePMR: (mags: number[]): number => {
    if (mags.length === 0) return 0;
    const max = Math.max(...mags);
    const mean = mags.reduce((a, b) => a + b, 0) / mags.length;
    return max / (mean + 1e-8);
  },

  // Cosine Similarity untuk Relational Bridge
  cosineSimilarity: (vecA: Float64Array | number[], vecB: Float64Array | number[]): number => {
    let dot = 0, mA = 0, mB = 0;
    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      mA += vecA[i] * vecA[i];
      mB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(mA) * Math.sqrt(mB) + 1e-8);
  }
};
