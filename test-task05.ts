import { VSAUtils } from './src/arc/VSAUtils.js';
import { ARCLogic } from './src/arc/ARCLogic.js';
import { HoloFFT } from './src/vsa/fft-math.js';

const train1In = [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0]
];
const train1Out = [
    [0, 0, 0, 0, 0],
    [0, 2, 2, 2, 0],
    [0, 2, 0, 2, 0],
    [0, 2, 2, 2, 0],
    [0, 0, 0, 0, 0]
];
const train2In = [
    [0, 0, 0, 0, 0],
    [0, 3, 3, 0, 0],
    [0, 3, 3, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
];
const train2Out = [
    [0, 0, 0, 0, 0],
    [0, 2, 2, 0, 0],
    [0, 2, 2, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
];

const lens = 'IGNORE_POSITION';
const rule1 = ARCLogic.extractRule(train1In, train1Out, lens);
const pred2 = ARCLogic.applyRule(train2In, rule1, lens);
const act2 = VSAUtils.encodeGrid(train2Out, lens);

console.log('Similarity:', HoloFFT.similarity(pred2, act2));
