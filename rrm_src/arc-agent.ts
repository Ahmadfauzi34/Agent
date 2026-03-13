import { ARC_DATABASE } from './shared';
import { PDRLogger, LogLevel } from './reasoning/level1-pdr/pdr-debug';
import { ARCLogic } from './memory';
import { PDRSolver } from './reasoning/level1-pdr/pdr-solver';

// Import 5 Level Penalaran (The Brain Layers)
import { solveLevel1 } from './reasoning/level1-pdr/pdr-level';
import { solveLevel2 } from './reasoning/level2-vsa/vsa-level';
import { solveMultiStep } from './reasoning/level2-vsa/multi-step-level';
import { solveLevel2_5 } from './reasoning/level-2-5-tensor/tensor-level';
import { solveLevel3 } from './reasoning/level3-algebra/coord-level';
import { solveLevel4 } from './reasoning/level4-dynamics/physics-level';

export async function runARCAgent(): Promise<string> {
    PDRLogger.clearBuffer();
    PDRLogger.setLevel(LogLevel.TRACE);

    const log = (msg: string) => {
        PDRLogger.log(msg);
    };

    log("🚀 MENGAKTIFKAN AGEN ARC V83 (MULTI-LEVEL REASONING ENGINE)...");
    log(`📊 DATABASE: Menemukan ${ARC_DATABASE.length} Task.`);

    const startTime = performance.now();
    const pdrSolver = new PDRSolver();
    let solvedCount = 0;

    const maxTasks = Math.min(2, ARC_DATABASE.length);
    for (let taskIdx = 0; taskIdx < maxTasks; taskIdx++) {
        // Jeda sebentar agar Event Loop/UI browser tidak freeze
        await new Promise(resolve => setTimeout(resolve, 10));

        // 0. RESET MEMORI TRAUMA (Agar tidak bawa dendam dari soal sebelumnya)
        ARCLogic.resetTraumaVault();
        
        const task = ARC_DATABASE[taskIdx];
        log(`\n==================================================`);
        log(`🧩 MENGERJAKAN: ${task.name}`);
        log(`==================================================`);

        let taskSolved = false;

        // ---------------------------------------------------------
        // 📐 LEVEL 1: PDR SOLVER (Symbolic Physics)
        // ---------------------------------------------------------
        taskSolved = solveLevel1(task, pdrSolver, log);
        if (taskSolved) {
            solvedCount++;
            continue;
        }

        // ---------------------------------------------------------
        // 🌌 LEVEL 2.5: UNIVERSAL TENSOR SOLVER (Zero-Parameter Calculus)
        // Diletakkan sebelum VSA murni karena jika ini berhasil,
        // kita menghemat banyak komputasi pencarian rule.
        // ---------------------------------------------------------
        taskSolved = solveLevel2_5(task, log);
        if (taskSolved) {
            solvedCount++;
            continue;
        }

        // ---------------------------------------------------------
        // 🔮 LEVEL 2: VSA / HOLOFFT (Lensa Mental & Trauma)
        // ---------------------------------------------------------
        const level2Result = solveLevel2(task, log);
        taskSolved = level2Result.taskSolved;
        const partialRules = level2Result.partialRules;

        if (taskSolved) {
            solvedCount++;
            continue;
        }

        // ---------------------------------------------------------
        // 🧬 MULTI-STEP COMPOSITION (Sintesis dari partialRules Level 2)
        // ---------------------------------------------------------
        if (Object.keys(partialRules).length > 0) {
            taskSolved = solveMultiStep(task, partialRules, log);
            if (taskSolved) {
                solvedCount++;
                continue;
            }
        }

        // ---------------------------------------------------------
        // 🧮 LEVEL 3: COORDINATE SOLVER & GRS (Algebraic Synthesis)
        // ---------------------------------------------------------
        const level3Result = await solveLevel3(task, log);
        taskSolved = level3Result.solved;
        const level3Rule = level3Result.rule;
        
        if (taskSolved) {
            solvedCount++;
            continue;
        }

        // ---------------------------------------------------------
        // 🍎 LEVEL 4: PHYSICS SIMULATION (Cellular Automata)
        // ---------------------------------------------------------
        taskSolved = solveLevel4(task, log, level3Rule);
        if (taskSolved) {
            solvedCount++;
            continue;
        }

        // 💀 FALLBACK JIKA SEMUA LEVEL GAGAL
        if (!taskSolved) {
            log(`\n💀 GAGAL TOTAL: Agen kehabisan sudut pandang dan mesin logika menyerah pada soal ini.`);
        }
    }

    const endTime = performance.now();
    log(`\n📊 SKOR AKHIR: ${solvedCount} / ${ARC_DATABASE.length} Soal Terpecahkan.`);
    log(`⏱️ Total Waktu Eksekusi: ${(endTime - startTime).toFixed(2)}ms`);
    return PDRLogger.getBuffer();
}

// Auto-run jika dieksekusi langsung (Node.js/Terminal)
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('arc-agent.ts')) {
    runARCAgent().then(() => process.exit(0));
}
