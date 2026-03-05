import { HoloFFT } from '../../vsa/fft-math';
import { VSAUtils } from '../VSAUtils';
import { CoordinateSolver } from '../../pdr/coordinate-solver';
import { Task } from '../types';
import { MetaCritic } from '../MetaCritic';

export async function solveLevel3(task: Task, log: (msg: string) => void): Promise<{ solved: boolean, rule?: any }> {
    log(`\n[LEVEL 3] Mengaktifkan Coordinate Solver (Logic Synthesis)...`);
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
                
                task.train.forEach(pair => {
                    const inColors = new Set<number>();
                    const outColors = new Set<number>();
                    pair.input.forEach(r => r.forEach(c => { if(c!==0) inColors.add(c) }));
                    pair.output.forEach(r => r.forEach(c => { if(c!==0) outColors.add(c) }));
                    
                    if (inColors.size === 1 && outColors.size === 1) {
                        const cin = [...inColors][0];
                        const cout = [...outColors][0];
                        const diff = cout - cin;
                        colorDeltaCounts[diff] = (colorDeltaCounts[diff] || 0) + 1;
                    }
                });
                
                let bestDelta = 0;
                let maxCount = 0;
                for (const d in colorDeltaCounts) {
                    if (colorDeltaCounts[d] > maxCount) {
                        maxCount = colorDeltaCounts[d];
                        bestDelta = parseInt(d);
                    }
                }
                log(`   🎨 Pola Warna Terdeteksi: Input ${bestDelta >= 0 ? '+' : ''}${bestDelta} -> Output`);
                discoveredRule.colorDelta = bestDelta;

                for(let y=0; y<inputGrid.length; y++) {
                    for(let x=0; x<inputGrid[0].length; x++) {
                        if (inputGrid[y][x] !== 0) {
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (ny >= 0 && ny < finalGrid.length && nx >= 0 && nx < finalGrid[0].length) {
                                let newColor = inputGrid[y][x] + bestDelta;
                                if (newColor < 0) newColor = 0;
                                if (newColor > 9) newColor = 9;
                                finalGrid[ny][nx] = newColor;
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
