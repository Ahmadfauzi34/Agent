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

        // ---------------------------------------------------------
        // 🌌 UNIVERSAL PIPELINE: QUANTUM TENSOR CALCULUS & OPTICAL INTERFERENCE
        // ---------------------------------------------------------
        // Mengeksekusi semua level dengan logika boolean (OR-ing) berurutan
        // agar menghindari struktur blok if-else, sehingga agen mengalir secara konseptual

        let isTaskSolved = false;
        let partialRules: any = {};
        let level3Rule: any = null;

        isTaskSolved = isTaskSolved || solveLevel1(task, pdrSolver, log);
        isTaskSolved = isTaskSolved || solveLevel2_5(task, log);

        isTaskSolved = isTaskSolved || (() => {
            const level2Result = solveLevel2(task, log);
            partialRules = level2Result.partialRules;
            return level2Result.taskSolved;
        })();

        isTaskSolved = isTaskSolved || (Object.keys(partialRules).length > 0 && solveMultiStep(task, partialRules, log));
        
        isTaskSolved = isTaskSolved || await (async () => {
            const level3Result = await solveLevel3(task, log);
            level3Rule = level3Result.rule;
            return level3Result.solved;
        })();

        isTaskSolved = isTaskSolved || solveLevel4(task, log, level3Rule);

        // Menjumlahkan dengan konversi Boolean->Number
        solvedCount += Number(isTaskSolved);

        // Pesan keluaran tanpa percabangan if
        const resultsMessage = [
            "\n💀 GAGAL TOTAL: Agen kehabisan sudut pandang dan mesin logika menyerah pada soal ini.",
            "\n✅ SUKSES: Solusi ditemukan melalui konvergensi penalaran kognitif agen."
        ];
        log(resultsMessage[Number(isTaskSolved)] as string);
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
