// src/vsa/experts.ts

export interface Expert {
  name: string;
  execute(signal: Float64Array | number[]): Float64Array;
}

// CONTOH PAKAR 0: The Architect (Symmetry Detector)
// Ahli dalam melihat struktur global dan keseimbangan
export class SymmetryExpert implements Expert {
  name = "Architect_Symmetry";
  execute(signal: Float64Array | number[]): Float64Array {
    const sigArray = signal instanceof Float64Array ? signal : new Float64Array(signal);
    // Logika Sel 8: Mirroring
    const flipped = new Float64Array(sigArray).reverse();
    return sigArray.map((val, i) => val * flipped[i]); // Resonansi simetri (Auto-correlation at lag 0 of reversed)
  }
}

// CONTOH PAKAR 3: The Sniper (Lone Wolf Detector)
// Ahli dalam menemukan anomali lokal atau titik yang berdiri sendiri
export class LoneWolfExpert implements Expert {
  name = "Sniper_LoneWolf";
  execute(signal: Float64Array | number[]): Float64Array {
    const sigArray = signal instanceof Float64Array ? signal : new Float64Array(signal);
    // Logika Sel 9: Filter [-1, 2, -1] (Laplacian 1D sederhana)
    const out = new Float64Array(sigArray.length);
    for (let i = 1; i < sigArray.length - 1; i++) {
      // Deteksi lonjakan: (Tengah * 2) - Kiri - Kanan
      out[i] = (2 * sigArray[i]) - sigArray[i-1] - sigArray[i+1];
      if (out[i] < 0) out[i] = 0; // ReLU fisik (Hanya ambil lonjakan positif)
    }
    return out;
  }
}
