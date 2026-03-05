import { HoloFFT } from '../../vsa/fft-math';
import { VSAUtils, LensType } from '../VSAUtils';
import { ARCLogic } from '../ARCLogic';
import { Task } from '../types';

const LENSES: LensType[] = ['HOLISTIC', 'IGNORE_COLOR', 'IGNORE_POSITION', 'PURE_GEOMETRY', 'PURE_COLOR', 'COLOR_MAP', 'TRANSFORM_SWAP_XY', 'TRANSFORM_MIRROR_X', 'TRANSFORM_MIRROR_Y', 'NORMALIZE_POSITION'];

export interface PartialRule {
    type: 'transform' | 'constant';
    vector: Float64Array;
}

export function solveLevel2(task: Task, log: (msg: string) => void): { taskSolved: boolean, partialRules: Record<string, PartialRule> } {
    log(`\n[LEVEL 2] Mengaktifkan VSA (Holographic Reduced Representations)...`);
    let partialRules: Record<string, PartialRule> = {};
    let taskSolved = false;

    for (const currentLens of LENSES) {
        log(`\n🔭 Menguji Sudut Pandang: [${currentLens}]`);
        
        const extractedTransformRules: Float64Array[] = [];
        const extractedConstantRules: Float64Array[] = [];
        let isTraumatized = false;

        for (let i = 0; i < task.train.length; i++) {
            let transformRuleVec = ARCLogic.extractRule(task.train[i].input, task.train[i].output, currentLens);
            
            // Coba bersihkan rule dari crosstalk noise
            transformRuleVec = ARCLogic.cleanUpRule(transformRuleVec, currentLens);
            
            const constantRuleVec = ARCLogic.extractConstantRule(task.train[i].output, currentLens);
            
            if (ARCLogic.isBadLogic(transformRuleVec, currentLens)) {
                log(`   ⚠️ Firasat buruk di Lensa ${currentLens}! Mengganti Lensa...`);
                isTraumatized = true;
                break;
            }
            extractedTransformRules.push(transformRuleVec);
            extractedConstantRules.push(constantRuleVec);
        }

        if (isTraumatized) continue;

        if (extractedTransformRules.length >= 1) {
            let transformSimilarity = 0;
            let constantSimilarity = 0;

            if (extractedTransformRules.length >= 2) {
                if (currentLens === 'COLOR_MAP') {
                     const universalRule = HoloFFT.bundle(extractedTransformRules);
                     let totalSim = 0;
                     for(let i=0; i<task.train.length; i++) {
                          const pred = ARCLogic.applyRule(task.train[i].input, universalRule, currentLens);
                          const actual = VSAUtils.encodeGrid(task.train[i].output, currentLens);
                          totalSim += HoloFFT.similarity(pred, actual);
                     }
                     transformSimilarity = totalSim / task.train.length;
                } else {
                     const predictedTrain2Transform = ARCLogic.applyRule(task.train[1].input, extractedTransformRules[0], currentLens);
                     const actualTrain2Transform = VSAUtils.encodeGrid(task.train[1].output, currentLens);
                     transformSimilarity = HoloFFT.similarity(predictedTrain2Transform, actualTrain2Transform);
                }
                constantSimilarity = HoloFFT.similarity(extractedConstantRules[0], extractedConstantRules[1]);
            } else {
                transformSimilarity = 1.0;
                constantSimilarity = 1.0;
            }
            
            let bestSimilarity = 0;
            let bestRuleType: 'transform' | 'constant' = 'transform';
            let bestRules: Float64Array[] = [];
            
            if (transformSimilarity >= constantSimilarity) {
                bestSimilarity = transformSimilarity;
                bestRuleType = 'transform';
                bestRules = extractedTransformRules;
            } else {
                bestSimilarity = constantSimilarity;
                bestRuleType = 'constant';
                bestRules = extractedConstantRules;
            }
            
            log(`   ⚖️ Konsistensi Konsep (${bestRuleType}): ${(bestSimilarity * 100).toFixed(2)}%`);
            
            const threshold = currentLens === 'COLOR_MAP' ? 0.7 : 0.8;
            if (bestSimilarity > threshold) {
                log(`   💡 Konsep selaras! Menerapkan ke Test Data...`);
                const universalRule = HoloFFT.bundle(bestRules);
                
                let predictedOutputVec;
                if (bestRuleType === 'transform') {
                    predictedOutputVec = ARCLogic.applyRule(task.test[0].input, universalRule, currentLens);
                } else {
                    predictedOutputVec = universalRule;
                }
                
                const actualTestOutputVec = VSAUtils.encodeGrid(task.test[0].output, currentLens);
                const accuracy = HoloFFT.similarity(predictedOutputVec, actualTestOutputVec);
                log(`   🎯 Akurasi Prediksi Test: ${(accuracy * 100).toFixed(2)}%`);

                if (accuracy < threshold) {
                    log(`   ❌ Prediksi Meleset! Memanen Trauma...`);
                    ARCLogic.condenseTrauma(universalRule, currentLens);
                } else {
                    log(`   ✅ Lensa ${currentLens} berhasil memecahkan bagiannya!`);
                    partialRules[currentLens] = { type: bestRuleType, vector: universalRule };
                    
                    if (currentLens === 'HOLISTIC') {
                        log(`   🏆 BERHASIL! Agen menaklukkan soal ini secara HOLISTIC.`);
                        taskSolved = true;
                        break;
                    } else if (currentLens === 'COLOR_MAP') {
                        log(`   🏆 BERHASIL! Aturan COLOR_MAP sudah cukup untuk menyelesaikan soal secara keseluruhan!`);
                        taskSolved = true;
                        break;
                    } else {
                        if (bestRuleType === 'transform') {
                            const predictedHolistic = ARCLogic.applyRule(task.test[0].input, universalRule, 'HOLISTIC');
                            const actualHolistic = VSAUtils.encodeGrid(task.test[0].output, 'HOLISTIC');
                            const holisticAccuracy = HoloFFT.similarity(predictedHolistic, actualHolistic);
                            
                            log(`   🔍 Menguji aturan ${currentLens} pada layar HOLISTIC... Akurasi: ${(holisticAccuracy * 100).toFixed(2)}%`);
                            if (holisticAccuracy > 0.8) {
                                log(`   🏆 BERHASIL! Aturan ${currentLens} sudah cukup untuk menyelesaikan soal secara keseluruhan!`);
                                taskSolved = true;
                                break;
                            }
                        }
                    }
                }
            } else {
                log(`   ❌ Konsep berantakan. Memanen Trauma...`);
                if (extractedTransformRules[0]) ARCLogic.condenseTrauma(extractedTransformRules[0], currentLens);
                if (extractedTransformRules[1]) ARCLogic.condenseTrauma(extractedTransformRules[1], currentLens);
            }
        }
    }

    return { taskSolved, partialRules };
}
