import { ARCLogic } from './src/arc/ARCLogic.js';
import { HoloFFT } from './src/vsa/fft-math.js';
import { VSAUtils, ARC_COLORS, POS_X, POS_Y } from './src/arc/VSAUtils.js';

const size = 10;
const rules = [];
let inVecs = [];
let outVecs = [];

for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
        const cIn = ARC_COLORS[(x + y) % 2];
        const cOut = ARC_COLORS[1 - ((x + y) % 2)];
        const pos = HoloFFT.bind(POS_X[x], POS_Y[y]);
        
        rules.push(HoloFFT.bind(cOut, HoloFFT.inverse(cIn)));
        inVecs.push(HoloFFT.bind(cIn, pos));
        outVecs.push(HoloFFT.bind(cOut, pos));
    }
}

const rule = HoloFFT.bundle(rules);
const inVec = HoloFFT.bundle(inVecs);
const expectedOutVec = HoloFFT.bundle(outVecs);

const predictedOutVec = HoloFFT.bind(rule, inVec);

console.log(`sim(predicted, expected) for ${size}x${size}:`, HoloFFT.similarity(predictedOutVec, expectedOutVec));
