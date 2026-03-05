// src/pdr/z-stream.ts
import FFT from 'fft.js';
import { Physics } from '../vsa/physics-utils';

export class ZStreamDual {
  private fft: any;
  constructor(dim = 1024) { this.fft = new FFT(dim); }

  // Mencari "Rhythm" (Irama) Global
  analyze(signal: Float64Array | number[]) {
    const out = this.fft.createComplexArray();
    const size = this.fft.size;
    const paddedSignal = new Array(size).fill(0);
    for (let i = 0; i < Math.min(signal.length, size); i++) {
        paddedSignal[i] = signal[i];
    }
    this.fft.realTransform(out, paddedSignal);
    const mags = Physics.getMagnitudes(out);
    
    const pmr = Physics.calculatePMR(mags);
    const hasGlobalPattern = pmr > 6.0; // Threshold riset kita

    return {
      mags,
      pmr,
      isStructured: hasGlobalPattern
    };
  }
}
