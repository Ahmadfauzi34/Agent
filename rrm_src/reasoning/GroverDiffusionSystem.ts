import { TensorVector, GLOBAL_DIMENSION, MAX_HYPOTHESES } from '../core/config.js';
import { EntityManifold } from '../core/EntityManifold.js';
import { MultiverseSandbox } from './MultiverseSandbox.js';
import { Hypothesis } from './HamiltonianPruner.js';

export interface GroverConfig {
  readonly dimensions: number;
  readonly searchSpaceSize: number;
  readonly temperature: number;
  readonly freeEnergyThreshold: number;
  readonly maxIterations: number;
}

/**
 * ============================================================================
 * GROVER DIFFUSION SYSTEM (Real-Valued VSA/FHRR Implementation)
 * ============================================================================
 * Menjalankan algoritma Grover (Amplitude Amplification) menggunakan
 * Termodinamika Berkelanjutan (Continuous Free Energy Oracle).
 * Beroperasi secara Zero-GC dan Math-Branchless menggunakan Array of Structures.
 */
export class GroverDiffusionSystem {
  public config: GroverConfig;

  // SoA Layout untuk State Grover
  public amplitudes: Float32Array;
  public multipliers: Float32Array;
  public energies: Float32Array;

  // Buffer sementara untuk kalkulasi Inversion About Mean
  private meanBuffer: Float32Array;

  // Referensi ke Alam Semesta Simulasi untuk Evaluasi Oracle
  private sandbox: MultiverseSandbox;

  constructor(sandbox: MultiverseSandbox, config: GroverConfig) {
    this.sandbox = sandbox;
    this.config = config;

    const totalSize = config.searchSpaceSize * config.dimensions;

    this.amplitudes = new Float32Array(totalSize);
    this.multipliers = new Float32Array(config.searchSpaceSize);
    this.energies = new Float32Array(config.searchSpaceSize);

    this.meanBuffer = new Float32Array(config.dimensions);
  }

  /**
   * MENGINISIALISASI "WARM START" (Hybrid ARC Architecture)
   * Berbeda dengan Grover konvensional (1/√N), kita memulai dengan
   * amplitudo awal proporsional terhadap keyakinan awal (Skor MCTS).
   */
  public warmStart(candidates: any[]): void {
    const N = Math.min(this.config.searchSpaceSize, candidates.length);
    const D = this.config.dimensions;

    this.amplitudes.fill(0.0);

    // Hitung L2 Norm Total dari Energi awal untuk Normalisasi
    let totalInitialEnergySq = 0.0;
    for (let i = 0; i < N; i++) {
      const energy = candidates[i]!.energy; // energy (0.0 to 1.0)
      const baseAmp = Math.max(0.001, Math.sqrt(energy)); // Prevent zero-amplitude vacuum
      totalInitialEnergySq += baseAmp * baseAmp;
    }

    const normalizationFactor = 1.0 / Math.sqrt(totalInitialEnergySq + 1e-15);

    // Suntikkan Amplitudo Kuantum Berbias (Biased Superposition)
    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      const ruleTensor = candidates[i]!.tensor_rule || candidates[i]!.tensor; // Mendukung format Hypothesis atau Trajectory
      const energy = candidates[i]!.energy;

      // Amplitudo awal berbanding lurus dengan kekuatan hipotesis (energy)
      const amp = Math.sqrt(energy) * normalizationFactor;

      for (let d = 0; d < D; d++) {
        this.amplitudes[baseIdx + d] = ruleTensor[d]! * amp;
      }
    }
  }

  /**
   * CONTINUOUS FREE ENERGY ORACLE
   * Tidak butuh tahu mana jawaban yang benar. Oracle ini akan
   * menjalankan setiap kandidat di Sandbox dan menghitung Free Energy-nya.
   * Semakin rendah Free Energy, semakin kuat pembalikan fasanya (Phase Inversion).
   */
  public evaluateOracle(candidates: any[], trainStates: { in: EntityManifold, out: EntityManifold }[]): void {
    const N = Math.min(this.config.searchSpaceSize, candidates.length);
    const D = this.config.dimensions;
    const T = this.config.temperature;
    const threshold = this.config.freeEnergyThreshold;

    for (let i = 0; i < N; i++) {
      const candidate = candidates[i]!;
      let totalFreeEnergy = 0.0;

      // Ambil metadata skalar kinetik jika tersedia (fallback),
      // untuk MCTS Trajectory biasanya null karena sudah encoded
      const deltaX = candidate.deltaX || 0.0;
      const deltaY = candidate.deltaY || 0.0;
      const tensorRule = candidate.tensor_rule || candidate.tensor;
      const isSwarm = candidate.isSwarm || false;

      // 1. Dynamic Evaluation: Jalankan Kandidat di Sandbox melintasi semua state pelatihan
      for (let s = 0; s < trainStates.length; s++) {
        const state = trainStates[s]!;
        // Gunakan Universe 0 untuk evaluasi sementara (O(1) memcpy)
        this.sandbox.cloneToUniverse(state.in, 0);
        this.sandbox.applyAxiom(0, tensorRule, deltaX, deltaY, isSwarm);
        totalFreeEnergy += this.sandbox.calculateFreeEnergy(0, state.out);
      }

      this.energies[i] = totalFreeEnergy;

      // 2. Continuous Phase Multiplier
      // Sigmoid: 0.0 (Surprise Tinggi/Buruk) -> 1.0 (Surprise Rendah/Sempurna)
      const score = 0.5 * (1.0 + Math.tanh((threshold - totalFreeEnergy) / T));

      // 3. Inversion Strength:
      // Score 1.0 (Sempurna) -> Multiplier -1.0 (Pembalik Fase Penuh / Target)
      // Score 0.0 (Buruk) -> Multiplier 1.0 (Fase Tidak Berubah)
      this.multipliers[i] = 1.0 - (2.0 * score);
    }

    // 4. Menerapkan Multiplier (Branchless) ke Amplitudo Kuantum
    for (let i = 0; i < N; i++) {
      const mult = this.multipliers[i]!;
      const baseIdx = i * D;

      for (let d = 0; d < D; d += 8) {
        this.amplitudes[baseIdx + d] *= mult;
        this.amplitudes[baseIdx + d + 1] *= mult;
        this.amplitudes[baseIdx + d + 2] *= mult;
        this.amplitudes[baseIdx + d + 3] *= mult;
        this.amplitudes[baseIdx + d + 4] *= mult;
        this.amplitudes[baseIdx + d + 5] *= mult;
        this.amplitudes[baseIdx + d + 6] *= mult;
        this.amplitudes[baseIdx + d + 7] *= mult;
      }
    }
  }

  /**
   * DIFFUSION OPERATOR (Inversion About Mean)
   * Menyebarkan kembali probabilitas amplitudo. Amplitudo yang fasanya terbalik
   * (Target) akan meledak nilainya, sementara yang lain saling meniadakan.
   */
  public applyDiffusion(N: number): void {
    const D = this.config.dimensions;
    const amps = this.amplitudes;
    const meanBuf = this.meanBuffer;

    // Step 1: Hitung Mean Amplitude per dimensi (Reduction)
    meanBuf.fill(0);
    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      for (let d = 0; d < D; d++) {
        meanBuf[d] += amps[baseIdx + d]!;
      }
    }

    const invN = 1.0 / N;
    for (let d = 0; d < D; d++) {
      meanBuf[d] *= invN;
    }

    // Step 2: Refleksi (Inversion about Mean)
    // amp' = 2 * mean - amp
    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      for (let d = 0; d < D; d++) {
        const mean = meanBuf[d]!;
        amps[baseIdx + d] = 2.0 * mean - amps[baseIdx + d]!;
      }
    }

    // Normalisasi peluruhan opsional untuk menjaga stabilitas Float32
    this.thermalNormalize(N);
  }

  /**
   * Normalisasi Energi Kinetik menggunakan distribusi Boltzmann tiruan.
   */
  private thermalNormalize(N: number): void {
    const D = this.config.dimensions;
    const amps = this.amplitudes;
    const T = this.config.temperature;

    const norms = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      let sumSq = 0.0;

      for (let d = 0; d < D; d += 4) {
        const a0 = amps[baseIdx + d]!;
        const a1 = amps[baseIdx + d + 1]!;
        const a2 = amps[baseIdx + d + 2]!;
        const a3 = amps[baseIdx + d + 3]!;
        sumSq += a0*a0 + a1*a1 + a2*a2 + a3*a3;
      }

      norms[i] = Math.sqrt(sumSq);
    }

    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      const norm = norms[i]! + 1e-10;

      const thermalFactor = Math.exp(-norm / T);
      const scale = 1.0 / (norm + thermalFactor);

      for (let d = 0; d < D; d++) {
        amps[baseIdx + d] *= scale;
      }
    }
  }

  /**
   * Eksekusi Amplifikasi Kuantum (Grover Iteration)
   * Menyelesaikan ambiguitas (Tie-breaker) pada N kandidat terbaik MCTS.
   */
  public search(candidates: any[], trainStates: { in: EntityManifold, out: EntityManifold }[]): any | null {
    const N = Math.min(this.config.searchSpaceSize, candidates.length);
    if (N === 0) return null;

    // Hybrid Phase: Warm Start berdasar energi kandidat (bukan Uniform Superposition)
    this.warmStart(candidates);

    // K_opt (Jika N kecil misal 10, iterasi ≈ 2. Sangat cepat!)
    const iterations = Math.min(this.config.maxIterations, Math.ceil((Math.PI / 4) * Math.sqrt(N)));

    for (let k = 0; k < iterations; k++) {
      // 1. Evaluasi Dinamis (The Free Energy Oracle)
      this.evaluateOracle(candidates, trainStates);

      // 2. Resonansi & Amplifikasi Amplitudo (Inversion About Mean)
      this.applyDiffusion(N);
    }

    // 3. Pengukuran (The Measurement Collapse)
    let maxAmp = -9999.0;
    let winnerIdx = 0;

    for (let i = 0; i < N; i++) {
      const baseIdx = i * this.config.dimensions;
      let stateEnergy = 0.0;

      // Hitung "Probability Amplitude" (L2 Norm) dari masing-masing vektor di superposisi
      for (let d = 0; d < this.config.dimensions; d++) {
        const a = this.amplitudes[baseIdx + d]!;
        stateEnergy += a * a;
      }

      // Branchless Max Selection
      const isGreater = Number(stateEnergy > maxAmp);
      maxAmp = (stateEnergy * isGreater) + (maxAmp * (1 - isGreater));
      winnerIdx = (i * isGreater) + (winnerIdx * (1 - isGreater));
    }

    return candidates[winnerIdx] || null;
  }
}
