import { ARCLogic } from './src/arc/ARCLogic.js';
import { HoloFFT } from './src/vsa/fft-math.js';
import { ARC_COLORS } from './src/arc/VSAUtils.js';

const c0 = ARC_COLORS[0];
const c1 = ARC_COLORS[1];

// rule = C0*inv(C1) + C1*inv(C0)
const rule = HoloFFT.bundle([
    HoloFFT.bind(c0, HoloFFT.inverse(c1)),
    HoloFFT.bind(c1, HoloFFT.inverse(c0))
]);

const out1 = HoloFFT.bind(rule, c1);
const out0 = HoloFFT.bind(rule, c0);

console.log('sim(out1, c0):', HoloFFT.similarity(out1, c0));
console.log('sim(out1, c1):', HoloFFT.similarity(out1, c1));
console.log('sim(out0, c1):', HoloFFT.similarity(out0, c1));
console.log('sim(out0, c0):', HoloFFT.similarity(out0, c0));
