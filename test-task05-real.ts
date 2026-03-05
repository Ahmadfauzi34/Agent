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

const lensGeo = 'PURE_GEOMETRY';
const rule1Geo = ARCLogic.extractRule(train1In, train1Out, lensGeo);
const pred2Geo = ARCLogic.applyRule(train2In, rule1Geo, lensGeo);
const act2Geo = VSAUtils.encodeGrid(train2Out, lensGeo);

console.log('PURE_GEOMETRY Similarity:', HoloFFT.similarity(pred2Geo, act2Geo));
