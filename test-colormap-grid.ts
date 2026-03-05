import { ARCLogic } from './src/arc/ARCLogic.js';
import { HoloFFT } from './src/vsa/fft-math.js';
import { VSAUtils, ARC_COLORS, POS_X, POS_Y } from './src/arc/VSAUtils.js';

const gridIn = [
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1]
];
const gridOut = [
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0]
];

const rules = [];
let inVecs = [];
let outVecs = [];

for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
        const cIn = ARC_COLORS[gridIn[y][x]];
        const cOut = ARC_COLORS[gridOut[y][x]];
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

console.log('sim(predicted, expected):', HoloFFT.similarity(predictedOutVec, expectedOutVec));
