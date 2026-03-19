/**
 * ============================================================================
 * ARCHIVE: GroverDiffusionSystem_v1 (Konsep Awal)
 * ============================================================================
 * Konsep simulasi Quantum Amplitude Amplification menggunakan VSA/FHRR Real-Valued
 * yang diusulkan sebelum evaluasi Oracle Free Energy yang sepenuhnya dinamis.
 * (Termasuk Dosa "Oracle Paradox" di mana `targetIndices` harus diketahui di awal).
 */

interface VectorSoA {
  amplitudes: Float32Array;
  phases: Float32Array;
  energies: Float32Array;
  flags: Uint8Array;
}

interface GroverConfig {
  readonly dimensions: number;
  readonly searchSpaceSize: number;
  readonly temperature: number;
  readonly rotationAngle: number;
  readonly maxIterations: number;
}

class BranchlessOps {
  static abs(x: number): number {
    const mask = x >> 31;
    return (x ^ mask) - mask;
  }

  static sign(x: number): number {
    return (x > 0 ? 1 : 0) - (x < 0 ? 1 : 0);
  }

  static invSqrt(x: number): number {
    const buffer = new ArrayBuffer(4);
    const f32 = new Float32Array(buffer);
    const u32 = new Uint32Array(buffer);

    f32[0] = x;
    u32[0] = 0x5f3759df - (u32[0] >> 1);
    let y = f32[0];
    y = y * (1.5 - 0.5 * x * y * y);
    y = y * (1.5 - 0.5 * x * y * y);
    return y;
  }

  static clamp(x: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, x));
  }
}

export class GroverDiffusionSystem {
  private config: GroverConfig;
  private state: VectorSoA;
  private meanBuffer: Float32Array;

  constructor(config: GroverConfig) {
    this.config = {
      ...config,
      rotationAngle: Math.asin(1 / Math.sqrt(config.searchSpaceSize))
    };

    const totalSize = config.searchSpaceSize * config.dimensions;

    this.state = {
      amplitudes: new Float32Array(totalSize),
      phases: new Float32Array(totalSize),
      energies: new Float32Array(config.searchSpaceSize),
      flags: new Uint8Array(config.searchSpaceSize)
    };

    this.meanBuffer = new Float32Array(config.dimensions);

    this.initializeUniformSuperposition();
  }

  private initializeUniformSuperposition(): void {
    const N = this.config.searchSpaceSize;
    const D = this.config.dimensions;
    const amp = 1.0 / Math.sqrt(N);

    for (let i = 0; i < N * D; i++) {
      this.state.amplitudes[i] = amp;
      this.state.phases[i] = (Math.random() > 0.5 ? 1 : -1) * Math.PI * 0.5;
    }
  }

  applyOracle(targetIndices: Set<number>): void {
    const N = this.config.searchSpaceSize;
    const D = this.config.dimensions;
    const flags = this.state.flags;

    flags.fill(0);
    targetIndices.forEach(idx => {
      if (idx < N) flags[idx] |= 0x1;
    });

    for (let i = 0; i < N; i++) {
      const isTarget = flags[i] & 0x1;
      const multiplier = 1 - (isTarget << 1);

      const baseIdx = i * D;
      const amps = this.state.amplitudes;

      for (let d = 0; d < D; d += 8) {
        amps[baseIdx + d] *= multiplier;
        amps[baseIdx + d + 1] *= multiplier;
        amps[baseIdx + d + 2] *= multiplier;
        amps[baseIdx + d + 3] *= multiplier;
        amps[baseIdx + d + 4] *= multiplier;
        amps[baseIdx + d + 5] *= multiplier;
        amps[baseIdx + d + 6] *= multiplier;
        amps[baseIdx + d + 7] *= multiplier;
      }
    }
  }

  applyDiffusion(): void {
    const N = this.config.searchSpaceSize;
    const D = this.config.dimensions;
    const amps = this.state.amplitudes;
    const meanBuf = this.meanBuffer;

    meanBuf.fill(0);

    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      for (let d = 0; d < D; d++) {
        meanBuf[d] += amps[baseIdx + d];
      }
    }

    const invN = 1.0 / N;
    for (let d = 0; d < D; d++) {
      meanBuf[d] *= invN;
    }

    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      for (let d = 0; d < D; d++) {
        const mean = meanBuf[d];
        amps[baseIdx + d] = 2.0 * mean - amps[baseIdx + d];
      }
    }

    this.thermalNormalize();
  }

  iterate(targetIndices: Set<number>, iteration: number): void {
    this.applyOracle(targetIndices);
    this.applyDiffusion();
    this.injectThermalNoise(iteration);
  }

  private injectThermalNoise(iteration: number): void {
    const N = this.config.searchSpaceSize;
    const D = this.config.dimensions;
    const T = this.config.temperature;
    const amps = this.state.amplitudes;

    const noiseScale = T * (1 + iteration * 0.01);

    for (let i = 0; i < N * D; i++) {
      const noise = (Math.random() * 2 - 1) * noiseScale;
      amps[i] += noise;
    }

    this.thermalNormalize();
  }

  private thermalNormalize(): void {
    const N = this.config.searchSpaceSize;
    const D = this.config.dimensions;
    const amps = this.state.amplitudes;
    const T = this.config.temperature;

    const norms = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      let sumSq = 0;

      for (let d = 0; d < D; d += 4) {
        const a0 = amps[baseIdx + d];
        const a1 = amps[baseIdx + d + 1];
        const a2 = amps[baseIdx + d + 2];
        const a3 = amps[baseIdx + d + 3];
        sumSq += a0*a0 + a1*a1 + a2*a2 + a3*a3;
      }

      norms[i] = Math.sqrt(sumSq);
    }

    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      const norm = norms[i] + 1e-10;

      const thermalFactor = Math.exp(-norm / T);
      const scale = 1.0 / (norm + thermalFactor);

      for (let d = 0; d < D; d++) {
        amps[baseIdx + d] *= scale;
      }
    }
  }

  measure(): { winnerIndex: number; confidence: number; state: Float32Array } {
    const N = this.config.searchSpaceSize;
    const D = this.config.dimensions;
    const amps = this.state.amplitudes;

    let maxAmp = -Infinity;
    let winnerIdx = 0;

    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      let stateEnergy = 0;

      for (let d = 0; d < D; d++) {
        const a = amps[baseIdx + d];
        stateEnergy += a * a;
      }

      const isGreater = Number(stateEnergy > maxAmp);
      maxAmp = isGreater ? stateEnergy : maxAmp;
      winnerIdx = isGreater ? i : winnerIdx;
    }

    const confidence = Math.sqrt(maxAmp);
    const winnerState = new Float32Array(D);
    const baseIdx = winnerIdx * D;

    for (let d = 0; d < D; d++) {
      winnerState[d] = amps[baseIdx + d];
    }

    return { winnerIndex: winnerIdx, confidence, state: winnerState };
  }
}
