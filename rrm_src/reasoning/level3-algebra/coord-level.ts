import { FHRR as HoloFFT } from '../../core';
import { VSAUtils } from '../../perception';
import { CoordinateSolver } from './coordinate-solver';
import { GeometricResonanceSolver } from './geometric-resonance-solver';
import { Task } from '../../shared';
import { MetaCritic } from '../evaluation/meta-critic';

export async function solveLevel3(task: Task, log: (msg: string) => void): Promise<{ solved: boolean, rule?: any }> {
    log(`\n[LEVEL 3] Mengaktifkan Coordinate Solver (Logic Synthesis)...`);
    
    // [LEVEL 3-SHORTCUT] Resonance Logic
    const grs = new GeometricResonanceSolver();
    const fastResult = grs.solve(task.train, task.test[0].input);
    
    if (fastResult) {
        log("   🏆 LEVEL 3 SHORTCUT BERHASIL! (Resonance found)");
        // Verifikasi dengan Meta-Critic jika diperlukan, tapi GRS biasanya sangat akurat
        const isMetaCriticPassed = MetaCritic.verify(task.test[0].input, fastResult);
        if (isMetaCriticPassed) {
            return { solved: true, rule: { type: 'RESONANCE' } };
        }
        log("   ⚠️ GRS Shortcut gagal verifikasi Meta-Critic.");
    }

    log("   ⚠️ GRS Gagal. Mengaktifkan Brute-Force Coordinate Solver...");

    let taskSolved = false;
    let discoveredRule: any = null;

    const trainInputs = task.train.map(t => VSAUtils.getCenterOfMass(t.input));
    const trainOutputs = task.train.map(t => VSAUtils.getCenterOfMass(t.output));
    
    const validPairs = trainInputs.map((p, i) => ({ in: p, out: trainOutputs[i] }))
                                  .filter(pair => pair.in !== null && pair.out !== null);

    if (validPairs.length > 0) {
        // @ts-ignore
        const inputs = validPairs.map(p => p.in!);
        // @ts-ignore
        const outputs = validPairs.map(p => p.out!);
        const gridW = task.train[0].input[0].length;
        const gridH = task.train[0].input.length;

        const transformFn = await CoordinateSolver.solve(inputs, outputs, gridW, gridH);

        if (transformFn) {
            log(`   💡 Pola Transformasi Koordinat Ditemukan!`);
            discoveredRule = { transformFn }; // Simpan rule

            const testInputGrid = task.test[0].input;
            const testCenter = VSAUtils.getCenterOfMass(testInputGrid);
            
            if (testCenter) {
                const newCenter = transformFn(testCenter);
                log(`   📍 Prediksi Posisi Baru: (${newCenter.x.toFixed(2)}, ${newCenter.y.toFixed(2)})`);
                
                const inputGrid = task.test[0].input;
                const finalGrid = inputGrid.map(row => row.map(() => 0));
                
                const dx = Math.round(newCenter.x - testCenter.x);
                const dy = Math.round(newCenter.y - testCenter.y);
                
                log(`   📐 Pergeseran Relatif: dx=${dx}, dy=${dy}`);
                discoveredRule.dx = dx;
                discoveredRule.dy = dy;

                let colorDeltaCounts: Record<number, number> = {};
                let colorTransitions: Record<number, Record<number, number>> = {};
                
                task.train.forEach(pair => {
                    for(let y=0; y<pair.input.length; y++) {
                        for(let x=0; x<pair.input[0].length; x++) {
                            const newPos = transformFn({x, y});
                            const nx = Math.round(newPos.x);
                            const ny = Math.round(newPos.y);
                            
                            if (ny >= 0 && ny < pair.output.length && nx >= 0 && nx < pair.output[0].length) {
                                const cin = pair.input[y][x];
                                const cout = pair.output[ny][nx];
                                
                                if (!colorTransitions[cin]) colorTransitions[cin] = {};
                                colorTransitions[cin][cout] = (colorTransitions[cin][cout] || 0) + 1;
                                
                                if (cin !== 0 && cout !== 0) {
                                    const diff = cout - cin;
                                    colorDeltaCounts[diff] = (colorDeltaCounts[diff] || 0) + 1;
                                }
                            }
                        }
                    }
                });
                
                let colorMap: Record<number, number> = {};
                for (const cinStr in colorTransitions) {
                    const cin = parseInt(cinStr);
                    const transitions = colorTransitions[cin];
                    let bestCout = -1;
                    let maxFreq = -1;
                    let totalFreq = 0;
                    
                    for (const coutStr in transitions) {
                        const freq = transitions[coutStr];
                        totalFreq += freq;
                        if (freq > maxFreq) {
                            maxFreq = freq;
                            bestCout = parseInt(coutStr);
                        }
                    }
                    
                    // Jika pemetaan cukup dominan (> 80%), kita anggap sebagai aturan warna
                    if (maxFreq / totalFreq > 0.8) {
                        colorMap[cin] = bestCout;
                    }
                }
                
                let bestDelta = 0;
                let maxCount = 0;
                for (const d in colorDeltaCounts) {
                    if (colorDeltaCounts[d] > maxCount) {
                        maxCount = colorDeltaCounts[d];
                        bestDelta = parseInt(d);
                    }
                }
                
                // Jika kita memiliki pemetaan warna yang konsisten, gunakan itu. Jika tidak, gunakan delta.
                const useColorMap = Object.keys(colorMap).length > 0;
                if (useColorMap) {
                    log(`   🎨 Pola Warna Terdeteksi: Pemetaan Warna Spesifik (Color Map) -> ${JSON.stringify(colorMap)}`);
                } else {
                    log(`   🎨 Pola Warna Terdeteksi: Input ${bestDelta >= 0 ? '+' : ''}${bestDelta} -> Output`);
                }
                
                discoveredRule.colorDelta = bestDelta;
                discoveredRule.colorMap = colorMap;

                for(let y=0; y<inputGrid.length; y++) {
                    for(let x=0; x<inputGrid[0].length; x++) {
                        const newPos = transformFn({x, y});
                        const nx = Math.round(newPos.x);
                        const ny = Math.round(newPos.y);
                        
                        if (ny >= 0 && ny < finalGrid.length && nx >= 0 && nx < finalGrid[0].length) {
                            let cin = inputGrid[y][x];
                            let newColor = cin;
                            
                            // [LOW MATH FIX] Terapkan Color Map jika ada, jika tidak gunakan Delta
                            if (useColorMap && colorMap[cin] !== undefined) {
                                newColor = colorMap[cin];
                            } else {
                                if (cin !== 0) newColor += bestDelta;
                            }
                            
                            if (newColor < 0) newColor = 0;
                            if (newColor > 9) newColor = 9;
                            
                            // If the pixel is moving, we might overwrite the background.
                            // But if it's an identity transform (dx=0, dy=0), we just overwrite directly.
                            if (dx === 0 && dy === 0) {
                                finalGrid[ny][nx] = newColor;
                            } else {
                                // Prefer non-zero if multiple pixels map to the same spot during movement
                                if (finalGrid[ny][nx] === 0 || newColor !== 0) {
                                    finalGrid[ny][nx] = newColor;
                                }
                            }
                        }
                    }
                }
                
                const predictedVec = VSAUtils.encodeGrid(finalGrid, 'HOLISTIC');
                const actualVec = VSAUtils.encodeGrid(task.test[0].output, 'HOLISTIC');
                const accuracy = HoloFFT.similarity(predictedVec, actualVec);
                
                log(`   🎯 Akurasi Prediksi Level 3: ${(accuracy * 100).toFixed(2)}%`);

                // Meta-Critic Verification
                const isMetaCriticPassed = MetaCritic.verify(inputGrid, finalGrid);

                if (accuracy > 0.95 && isMetaCriticPassed) {
                    log(`   🏆 LEVEL 3 BERHASIL! Coordinate Solver memecahkan soal ini.`);
                    taskSolved = true;
                } else {
                    if (!isMetaCriticPassed) {
                        log(`   ❌ LEVEL 3 GAGAL (Meta-Critic Meleset).`);
                    } else {
                        log(`   ❌ LEVEL 3 GAGAL. Prediksi posisi/warna meleset.`);
                    }
                }
            }
        } else {
            log(`   ⚠️ Tidak ditemukan pola transformasi koordinat yang sederhana.`);
        }
    }

    return { solved: taskSolved, rule: discoveredRule };
}
