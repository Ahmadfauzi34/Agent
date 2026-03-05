import { ZRouter } from '../arc/ZRouter';
import { Expert } from './experts';

export class SpectralMoE {
  private router: ZRouter;
  private experts: Expert[];

  constructor(dimension: number, experts: Expert[]) {
    this.router = new ZRouter(dimension);
    this.experts = experts; // Masukkan pakar pilihan Anda (misal: Architect, Sniper)
  }

  process(signal: Float64Array | number[]): Float64Array {
    // 1. Tanya Router: "Ini data apa?"
    const { isValid, freqPMR, spatPMR } = this.router.analyze(signal);
    
    // Noise Gate: Jika sinyal tidak valid, kembalikan nol
    if (!isValid) {
        const len = signal instanceof Float64Array ? signal.length : signal.length;
        return new Float64Array(len).fill(0); 
    }

    // 2. Winner-Takes-More Bias (Logika Sel 6)
    // Jika spatPMR jauh lebih tinggi dari freqPMR, kita beri bonus ke Sniper (Lokal)
    // Jika freqPMR lebih tinggi, kita beri bonus ke Architect (Global)
    const dominanceRatio = spatPMR / (freqPMR + 1e-8);
    
    const results: Float64Array[] = [];
    const weights: number[] = [];

    // 3. Eksekusi Pakar secara Terarah
    this.experts.forEach((expert, i) => {
      let bias = 1.0;
      
      // Logic: Architect (biasanya index 0) suka PMR rendah/periodik/global
      if (expert.name === "Architect_Symmetry" && dominanceRatio < 1) {
          bias = 2.0; // Bonus Architect
      }
      
      // Logic: Sniper (biasanya index 1 atau 3) suka PMR tinggi/impulse/lokal
      if (expert.name === "Sniper_LoneWolf" && dominanceRatio > 5) {
          bias = 2.0; // Bonus Sniper
      }

      const output = expert.execute(signal);
      results.push(output);
      weights.push(bias); 
    });

    // 4. Weighted Sum (Penyatuan Hasil)
    return this.combine(results, weights);
  }

  private combine(results: Float64Array[], weights: number[]): Float64Array {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const final = new Float64Array(results[0].length);
    
    for (let i = 0; i < final.length; i++) {
      for (let j = 0; j < results.length; j++) {
        final[i] += results[j][i] * (weights[j] / totalWeight);
      }
    }
    return final;
  }
}
