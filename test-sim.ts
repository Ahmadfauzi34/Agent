import { HoloFFT } from './src/vsa/fft-math.js';
const BASE_COLOR = HoloFFT.create();
const c1 = HoloFFT.power(BASE_COLOR, 1);
const c3 = HoloFFT.power(BASE_COLOR, 3);
console.log(HoloFFT.similarity(c1, c3));
