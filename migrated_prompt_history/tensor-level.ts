import { ARCTensorEngine } from './arc-tensor-engine';
import { Task } from '../../shared';
import { MetaCritic } from '../evaluation/meta-critic';

export function solveLevel2_5(task: Task, log: (msg: string) => void): boolean {
    log(`[LEVEL 2.5] 🌌 Mengaktifkan ARCTensorEngine v5.1 (Holographic Quantum Edition)...`);

    const engine = new ARCTensorEngine();
    
    try {
        // 🌟 SEED SEARCH: Cek apakah ada logika sukses dari soal sebelumnya yang bisa direpositori
        const seeds = ARCTensorEngine.getSeeds();
        for (const [seedId, seedRules] of seeds.entries()) {
            log(`[LEVEL 2.5] 🔍 Mencoba Resonansi Seed dari Task: ${seedId}...`);
            let seedPassed = true;
            for (let i = 0; i < task.train.length; i++) {
                const predicted = engine.applyTensor(task.train[i].input, seedRules);
                if (!MetaCritic.verify(predicted, task.train[i].output)) {
                    seedPassed = false;
                    break;
                }
            }

            if (seedPassed) {
                log(`[LEVEL 2.5] ✨ Resonansi Seed Ditemukan! Menggunakan logika dari Task ${seedId}.`);
                // Terapkan ke test data
                let testPassed = true;
                for (let i = 0; i < task.test.length; i++) {
                    const predicted = engine.applyTensor(task.test[i].input, seedRules);
                    if (!MetaCritic.verify(predicted, task.test[i].output)) {
                        testPassed = false;
                        break;
                    }
                }
                if (testPassed) {
                    log(`[LEVEL 2.5] 🏆 BERHASIL! Soal diselesaikan via Seed Transfer.`);
                    return true;
                }
            }
        }

        const solution = engine.solveTensor(task.name, task.train);
        
        log(`[LEVEL 2.5] 🧠 Tensor Rules Extracted: ${solution.rules.length} rules found.`);
        solution.rules.forEach(r => {
            log(`  - Agent ${r.agent_id} (${r.op}): dx=${r.params.vector_x_abs}, dy=${r.params.vector_y_abs}, amp=${r.params.amplification}`);
            if (r.interactions.length > 0) {
                log(`    Interactions: ${r.interactions.map(i => `${i.force_type} with ${i.target_agent_id}`).join(', ')}`);
            }
            log(`    Holographic Law: ${r.holographic_law.substring(0, 16)}...`);
        });

        // Apply the rules to the test inputs
        let allTestsPassed = true;
        
        for (let i = 0; i < task.test.length; i++) {
            const testPair = task.test[i]!;
            const predictedOutput = engine.applyTensor(testPair.input, solution.rules);
            
            // Verify with MetaCritic
            const isValid = MetaCritic.verify(predictedOutput, testPair.output);
            if (!isValid) {
                allTestsPassed = false;
                log(`[LEVEL 2.5] ❌ Test ${i} failed verification.`);
                break;
            } else {
                log(`[LEVEL 2.5] ✅ Test ${i} passed verification!`);
            }
        }
        
        if (allTestsPassed && task.test.length > 0) {
            log(`[LEVEL 2.5] 🏆 BERHASIL! Agen menaklukkan soal ini menggunakan Tensor Engine.`);
            ARCTensorEngine.consolidate(task.name, solution.rules);
            return true;
        }
        
        return false;

    } catch (e: any) {
        log(`[LEVEL 2.5] ❌ Tensor Engine Error: ${e.message}`);
        return false;
    }
}
