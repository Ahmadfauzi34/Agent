import FFT from 'fft.js';
import { Physics } from '../core/physics';
import { GLOBAL_DIMENSION } from '../core/config';

export class ZStreamDual {
  private fft: any;
  constructor() { this.fft = new FFT(GLOBAL_DIMENSION); }

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
    const hasGlobalPattern = pmr > 6.0;

    return { mags, pmr, isStructured: hasGlobalPattern };
  }
}
