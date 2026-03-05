import { ARC_DATABASE } from './arc/data';
import { PDRSolver } from './pdr/pdr-solver';
import { PDRLogger, LogLevel } from './pdr/pdr-debug';
import { ARCLogic } from './arc/ARCLogic';

// Import Solvers
import { solveLevel1 } from './arc/solvers/pdr-level';
import { solveLevel2 } from './arc/solvers/vsa-level';
import { solveMultiStep } from './arc/solvers/multi-step-level';
import { solveLevel3 } from './arc/solvers/coord-level';
import { solveLevel4 } from './arc/solvers/physics-level';

export async function runARCAgent(): Promise<string> {
    PDRLogger.clearBuffer();
    PDRLogger.setLevel(LogLevel.TRACE);

    const log = (msg: string) => {
        PDRLogger.log(msg);
    };

    log("🚀 MENGAKTIFKAN AGEN ARC BERTINGKAT (MULTI-LEVEL)...");

    const startTime = performance.now();
    const pdrSolver = new PDRSolver();
    let solvedCount = 0;

    for (let taskIdx = 0; taskIdx < ARC_DATABASE.length; taskIdx++) {
        ARCLogic.resetTraumaVault();
        const task = ARC_DATABASE[taskIdx];
        log(`\n==================================================`);
        log(`🧩 MENGERJAKAN: ${task.name}`);
        log(`==================================================`);

        let taskSolved = false;

        // LEVEL 1: PDR SOLVER
        taskSolved = solveLevel1(task, pdrSolver, log);
        if (taskSolved) {
            solvedCount++;
            continue;
        }

        // LEVEL 2: VSA / HoloFFT
        const level2Result = solveLevel2(task, log);
        taskSolved = level2Result.taskSolved;
        const partialRules = level2Result.partialRules;

        if (taskSolved) {
            solvedCount++;
            continue;
        }

        // MULTI-STEP COMPOSITION
        if (Object.keys(partialRules).length > 0) {
            taskSolved = solveMultiStep(task, partialRules, log);
            if (taskSolved) {
                solvedCount++;
                continue;
            }
        }

        // LEVEL 3: COORDINATE SOLVER
        const level3Result = await solveLevel3(task, log);
        taskSolved = level3Result.solved;
        const level3Rule = level3Result.rule;
        if (taskSolved) {
            solvedCount++;
            continue;
        }

        // LEVEL 4: PHYSICS SIMULATION
        taskSolved = solveLevel4(task, log, level3Rule);
        if (taskSolved) {
            solvedCount++;
            continue;
        }

        if (!taskSolved) {
            log(`\n💀 GAGAL TOTAL: Agen kehabisan sudut pandang dan menyerah pada soal ini.`);
        }
    }

    const endTime = performance.now();
    log(`\n📊 SKOR AKHIR: ${solvedCount} / ${ARC_DATABASE.length} Soal Terpecahkan.`);
    log(`⏱️ Total Waktu Eksekusi: ${(endTime - startTime).toFixed(2)}ms`);
    return PDRLogger.getBuffer();
}

// Auto-run if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('arc-agent.ts')) {
    runARCAgent().then(() => process.exit(0));
}
