import FFT from 'fft.js';
import { Physics } from '../core/physics';
import { GLOBAL_DIMENSION } from '../core/config';

export class ZRouter {
  private fft = new FFT(GLOBAL_DIMENSION);
  private freqThreshold = 6.0;  
  private spatThreshold = 10.0; 

  constructor() {}

  analyze(signal: Float64Array | number[]): { isValid: boolean; freqPMR: number; spatPMR: number; dominanceRatio: number } {
    const out = this.fft.createComplexArray();
    this.fft.realTransform(out, Array.from(signal));
    
    let fMax = 0, fSum = 0, fCount = 0;
    for (let i = 2; i < out.length / 2; i += 2) {
      const mag = Math.sqrt(out[i]**2 + out[i+1]**2);
      if (mag > fMax) fMax = mag;
      fSum += mag; fCount++;
    }
    const freqPMR = fMax / (fSum / fCount + 1e-8);

    let sMax = 0, sSum = 0;
    for (let i = 0; i < signal.length; i++) {
      const val = Math.abs(signal[i]);
      if (val > sMax) sMax = val;
      sSum += val;
    }
    const spatPMR = sMax / (sSum / signal.length + 1e-8);

    const dominanceRatio = spatPMR / (freqPMR + 1e-8);
    const gateFreq = Physics.sigmoid(freqPMR - this.freqThreshold);
    const gateSpat = Physics.sigmoid(spatPMR - this.spatThreshold);
    const isValid = Math.max(gateFreq, gateSpat) > 0.5;

    return { isValid, freqPMR, spatPMR, dominanceRatio };
  }
}
