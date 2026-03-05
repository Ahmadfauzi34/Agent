import FFT from 'fft.js';
import { Physics } from '../vsa/physics-utils';

export class ZRouter {
  private fft: any;
  private freqThreshold = 6.0;  // Paten dari riset kita
  private spatThreshold = 10.0; // Paten dari riset kita

  constructor(private dimension: number = 1024) {
    this.fft = new FFT(dimension);
  }

  // Menganalisa Sinyal: Apakah ini Data atau Sampah?
  analyze(signal: Float64Array | number[]): { isValid: boolean; freqPMR: number; spatPMR: number } {
    // 1. ANALISA FREKUENSI (Mata Frekuensi)
    const out = this.fft.createComplexArray();
    this.fft.realTransform(out, Array.from(signal));
    const mags = Physics.getMagnitudes(out);
    const freqPMR = Physics.calculatePMR(mags);

    // 2. ANALISA SPASIAL (Mata Spasial)
    const absSignal = Array.from(signal).map(Math.abs);
    const spatPMR = Math.max(...absSignal) / (absSignal.reduce((a, b) => a + b, 0) / absSignal.length + 1e-8);

    // 3. DUAL-DOMAIN GATING (Logic OR)
    const gateFreq = Physics.sigmoid(freqPMR - this.freqThreshold);
    const gateSpat = Physics.sigmoid(spatPMR - this.spatThreshold);
    
    // Jika salah satu gerbang tembus > 0.5, sinyal valid
    const isValid = Math.max(gateFreq, gateSpat) > 0.5;

    return { isValid, freqPMR, spatPMR };
  }
}
