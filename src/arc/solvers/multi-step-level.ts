import { HoloFFT } from '../../vsa/fft-math';
import { VSAUtils } from '../VSAUtils';
import { ARCLogic } from '../ARCLogic';
import { Task } from '../types';
import { PartialRule } from './vsa-level';

export function solveMultiStep(task: Task, partialRules: Record<string, PartialRule>, log: (msg: string) => void): boolean {
    log(`\n🔗 MENGAKTIFKAN MULTI-STEP REASONING (Komposisi Lensa)...`);
    let taskSolved = false;

    // Skenario 0: Semantic Positioning (Hybrid Fourier Shift)
    if (partialRules['NORMALIZE_POSITION'] && partialRules['NORMALIZE_POSITION'].type === 'transform') {
       const posPattern = ARCLogic.detectPositionPattern(task.train);
       
       if (posPattern) {
           log(`   📍 Mendeteksi Pola Posisi: ${posPattern.type} (Hybrid Fourier Shift)...`);
           
           let targetCenter = { x: 0, y: 0 };
           const testInput = task.test[0].input;
           const gridH = testInput.length;
           const gridW = testInput[0].length;

           if (posPattern.type === 'ABSOLUTE') {
               targetCenter = { x: posPattern.x!, y: posPattern.y! };
           } else if (posPattern.type === 'CENTER') {
               targetCenter = { 
                   x: Math.floor(gridW / 2), 
                   y: Math.floor(gridH / 2) 
               };
           }

           const currentCenter = VSAUtils.getCenterOfMass(testInput);
           
           if (currentCenter) {
               const dx = targetCenter.x - currentCenter.x;
               const dy = targetCenter.y - currentCenter.y;
               
               log(`   📐 Pergeseran Dihitung: dx=${dx}, dy=${dy}`);

               const resultGrid = Array(gridH).fill(0).map(() => Array(gridW).fill(0));

               for (let y = 0; y < gridH; y++) {
                   for (let x = 0; x < gridW; x++) {
                       const val = testInput[y][x];
                       if (val !== 0) {
                           const newX = x + dx;
                           const newY = y + dy;
                           if (newX >= 0 && newX < gridW && newY >= 0 && newY < gridH) {
                               resultGrid[newY][newX] = val;
                           }
                       }
                   }
               }

               const finalPred = VSAUtils.encodeGrid(resultGrid, 'HOLISTIC');
               const actualTestOutput = VSAUtils.encodeGrid(task.test[0].output, 'HOLISTIC');
               const acc = HoloFFT.similarity(finalPred, actualTestOutput);
               
               log(`   🎯 Akurasi Prediksi Hybrid Shift: ${(acc * 100).toFixed(2)}%`);
               
               if (acc > 0.95) {
                   log(`   🏆 BERHASIL! Agen menaklukkan soal ini menggunakan HYBRID FOURIER SHIFT.`);
                   taskSolved = true;
               }
           } else {
               log(`   ⚠️ Gagal mendeteksi pusat massa input.`);
           }
       }
    }

    if (!taskSolved) {
        // Skenario 1: Transformasi Spasial + Warna Konstan
        if (partialRules['IGNORE_COLOR'] && partialRules['IGNORE_COLOR'].type === 'transform' &&
            partialRules['PURE_COLOR'] && partialRules['PURE_COLOR'].type === 'constant') {
            
            log(`   🧬 Menggabungkan Transformasi Spasial (IGNORE_COLOR) dengan Warna Konstan (PURE_COLOR)...`);
            
            const predictedSpatial = ARCLogic.applyRule(task.test[0].input, partialRules['IGNORE_COLOR'].vector, 'IGNORE_COLOR');
            const constantColor = partialRules['PURE_COLOR'].vector;
            const compositeOutput = HoloFFT.bind(predictedSpatial, constantColor);
            
            const actualTestOutputVec = VSAUtils.encodeGrid(task.test[0].output, 'HOLISTIC');
            const accuracy = HoloFFT.similarity(compositeOutput, actualTestOutputVec);
            
            log(`   🎯 Akurasi Prediksi Composite (HOLISTIC): ${(accuracy * 100).toFixed(2)}%`);
            
            if (accuracy > 0.8) {
                log(`   🏆 BERHASIL! Agen menaklukkan soal ini menggunakan MULTI-STEP COMPOSITION.`);
                taskSolved = true;
            }
        }
        
        // Skenario 2: Transformasi Spasial (IGNORE_COLOR) + Transformasi Warna (PURE_COLOR)
        if (!taskSolved && partialRules['IGNORE_COLOR'] && partialRules['IGNORE_COLOR'].type === 'transform' &&
            partialRules['PURE_COLOR'] && partialRules['PURE_COLOR'].type === 'transform') {
            
            log(`   🧬 Menggabungkan Transformasi Spasial (IGNORE_COLOR) dengan Transformasi Warna (PURE_COLOR)...`);
            
            const predictedSpatial = ARCLogic.applyRule(task.test[0].input, partialRules['IGNORE_COLOR'].vector, 'IGNORE_COLOR');
            const predictedColor = ARCLogic.applyRule(task.test[0].input, partialRules['PURE_COLOR'].vector, 'PURE_COLOR');
            const compositeOutput = HoloFFT.bind(predictedSpatial, predictedColor);
            
            const actualTestOutputVec = VSAUtils.encodeGrid(task.test[0].output, 'HOLISTIC');
            const accuracy = HoloFFT.similarity(compositeOutput, actualTestOutputVec);
            
            log(`   🎯 Akurasi Prediksi Composite (HOLISTIC): ${(accuracy * 100).toFixed(2)}%`);
            
            if (accuracy > 0.8) {
                log(`   🏆 BERHASIL! Agen menaklukkan soal ini menggunakan MULTI-STEP COMPOSITION.`);
                taskSolved = true;
            }
        }

        // Skenario 3: Transformasi SWAP_XY + Transformasi Warna (PURE_COLOR)
        if (!taskSolved && partialRules['TRANSFORM_SWAP_XY'] && partialRules['TRANSFORM_SWAP_XY'].type === 'transform' &&
            partialRules['PURE_COLOR'] && partialRules['PURE_COLOR'].type === 'transform') {
            
            log(`   🧬 Menggabungkan Transformasi SWAP_XY dengan Transformasi Warna (PURE_COLOR)...`);
            
            const predictedSpatial = ARCLogic.applyRule(task.test[0].input, partialRules['TRANSFORM_SWAP_XY'].vector, 'TRANSFORM_SWAP_XY');
            const predictedColor = ARCLogic.applyRule(task.test[0].input, partialRules['PURE_COLOR'].vector, 'PURE_COLOR');
            const compositeOutput = HoloFFT.bind(predictedSpatial, predictedColor);
            
            const actualTestOutputVec = VSAUtils.encodeGrid(task.test[0].output, 'HOLISTIC');
            const accuracy = HoloFFT.similarity(compositeOutput, actualTestOutputVec);
            
            log(`   🎯 Akurasi Prediksi Composite (HOLISTIC): ${(accuracy * 100).toFixed(2)}%`);
            
            if (accuracy > 0.8) {
                log(`   🏆 BERHASIL! Agen menaklukkan soal ini menggunakan MULTI-STEP COMPOSITION.`);
                taskSolved = true;
            }
        }

        // Skenario 4: Transformasi MIRROR_X + Transformasi Warna (PURE_COLOR)
        if (!taskSolved && partialRules['TRANSFORM_MIRROR_X'] && partialRules['TRANSFORM_MIRROR_X'].type === 'transform' &&
            partialRules['PURE_COLOR'] && partialRules['PURE_COLOR'].type === 'transform') {
            
            log(`   🧬 Menggabungkan Transformasi MIRROR_X dengan Transformasi Warna (PURE_COLOR)...`);
            
            const predictedSpatial = ARCLogic.applyRule(task.test[0].input, partialRules['TRANSFORM_MIRROR_X'].vector, 'TRANSFORM_MIRROR_X');
            const predictedColor = ARCLogic.applyRule(task.test[0].input, partialRules['PURE_COLOR'].vector, 'PURE_COLOR');
            const compositeOutput = HoloFFT.bind(predictedSpatial, predictedColor);
            
            const actualTestOutputVec = VSAUtils.encodeGrid(task.test[0].output, 'HOLISTIC');
            const accuracy = HoloFFT.similarity(compositeOutput, actualTestOutputVec);
            
            log(`   🎯 Akurasi Prediksi Composite (HOLISTIC): ${(accuracy * 100).toFixed(2)}%`);
            
            if (accuracy > 0.8) {
                log(`   🏆 BERHASIL! Agen menaklukkan soal ini menggunakan MULTI-STEP COMPOSITION.`);
                taskSolved = true;
            }
        }

        // Skenario 5: Transformasi MIRROR_Y + Transformasi Warna (PURE_COLOR)
        if (!taskSolved && partialRules['TRANSFORM_MIRROR_Y'] && partialRules['TRANSFORM_MIRROR_Y'].type === 'transform' &&
            partialRules['PURE_COLOR'] && partialRules['PURE_COLOR'].type === 'transform') {
            
            log(`   🧬 Menggabungkan Transformasi MIRROR_Y dengan Transformasi Warna (PURE_COLOR)...`);
            
            const predictedSpatial = ARCLogic.applyRule(task.test[0].input, partialRules['TRANSFORM_MIRROR_Y'].vector, 'TRANSFORM_MIRROR_Y');
            const predictedColor = ARCLogic.applyRule(task.test[0].input, partialRules['PURE_COLOR'].vector, 'PURE_COLOR');
            const compositeOutput = HoloFFT.bind(predictedSpatial, predictedColor);
            
            const actualTestOutputVec = VSAUtils.encodeGrid(task.test[0].output, 'HOLISTIC');
            const accuracy = HoloFFT.similarity(compositeOutput, actualTestOutputVec);
            
            log(`   🎯 Akurasi Prediksi Composite (HOLISTIC): ${(accuracy * 100).toFixed(2)}%`);
            
            if (accuracy > 0.8) {
                log(`   🏆 BERHASIL! Agen menaklukkan soal ini menggunakan MULTI-STEP COMPOSITION.`);
                taskSolved = true;
            }
        }
    }

    if (!taskSolved) {
        log(`   ⚠️ Tidak ada pola komposisi yang cocok untuk pecahan aturan yang tersedia.`);
    }

    return taskSolved;
}
