import { PDRSolver } from '../../pdr/pdr-solver';
import { Task } from '../types';
import { MetaCritic } from '../MetaCritic';

export function solveLevel1(task: Task, pdrSolver: PDRSolver, log: (msg: string) => void): boolean {
    log(`\n[LEVEL 1] Mengaktifkan PDR Solver (Symbolic Physics)...`);
    const trainInputs = task.train.map(t => t.input);
    const trainOutputs = task.train.map(t => t.output);
    const testInput = task.test[0].input;
    const expectedOutput = task.test[0].output;

    const pdrPrediction = pdrSolver.solveTask(trainInputs, trainOutputs, testInput);
    
    // Meta-Critic Verification
    const isMetaCriticPassed = MetaCritic.verify(testInput, pdrPrediction);
    const isPdrCorrect = JSON.stringify(pdrPrediction) === JSON.stringify(expectedOutput);

    if (isPdrCorrect && isMetaCriticPassed) {
        log(`   🏆 LEVEL 1 BERHASIL! PDR Solver memecahkan soal ini.`);
        return true;
    } else {
        if (!isMetaCriticPassed) {
            log(`   ❌ LEVEL 1 GAGAL (Meta-Critic Meleset). Beralih ke Level 2...`);
        } else {
            log(`   ❌ LEVEL 1 GAGAL. Beralih ke Level 2...`);
        }
        return false;
    }
}
