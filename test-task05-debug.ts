import { VSAUtils } from './src/arc/VSAUtils.js';
import { ARCLogic } from './src/arc/ARCLogic.js';
import { HoloFFT } from './src/vsa/fft-math.js';

const train1In = [[1,1,0,0], [1,1,0,0], [0,0,0,0], [0,0,0,0]];
const train1Out = [[0,0,0,0], [0,0,0,0], [0,0,2,2], [0,0,2,2]];
const train2In = [[0,3,3,0], [0,3,3,0], [0,0,0,0], [0,0,0,0]];
const train2Out = [[0,0,0,0], [4,4,0,0], [4,4,0,0], [0,0,0,0]];

const lens = 'IGNORE_POSITION';
const rule1 = ARCLogic.extractRule(train1In, train1Out, lens);
const pred2 = ARCLogic.applyRule(train2In, rule1, lens);
const act2 = VSAUtils.encodeGrid(train2Out, lens);

console.log('IGNORE_POSITION Similarity:', HoloFFT.similarity(pred2, act2));

const in1 = VSAUtils.encodeGrid(train1In, lens);
const out1 = VSAUtils.encodeGrid(train1Out, lens);
const in2 = VSAUtils.encodeGrid(train2In, lens);
const out2 = VSAUtils.encodeGrid(train2Out, lens);

console.log('sim(in1, in2):', HoloFFT.similarity(in1, in2));
console.log('sim(out1, out2):', HoloFFT.similarity(out1, out2));
console.log('sim(rule1 * in2, out2):', HoloFFT.similarity(HoloFFT.bind(rule1, in2), out2));
