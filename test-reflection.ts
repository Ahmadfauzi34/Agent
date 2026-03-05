import { HoloFFT } from './src/vsa/fft-math.js';
import { VSAUtils, POS_X, POS_Y, OBJ_WIDTH, OBJ_HEIGHT } from './src/arc/VSAUtils.js';

const out1 = HoloFFT.bind(HoloFFT.bind(OBJ_WIDTH[2], OBJ_HEIGHT[2]), HoloFFT.bind(POS_X[2], POS_Y[2]));
const in1 = HoloFFT.bind(HoloFFT.bind(OBJ_WIDTH[2], OBJ_HEIGHT[2]), HoloFFT.bind(POS_X[0], POS_Y[0]));
const R1 = HoloFFT.bind(out1, in1);

const out2 = HoloFFT.bind(HoloFFT.bind(OBJ_WIDTH[2], OBJ_HEIGHT[2]), HoloFFT.bind(POS_X[0], POS_Y[2]));
const in2 = HoloFFT.bind(HoloFFT.bind(OBJ_WIDTH[2], OBJ_HEIGHT[2]), HoloFFT.bind(POS_X[2], POS_Y[0]));
const R2 = HoloFFT.bind(out2, in2);

console.log('sim(R1, R2):', HoloFFT.similarity(R1, R2));
