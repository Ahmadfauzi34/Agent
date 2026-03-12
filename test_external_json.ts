import fs from 'node:fs';
import path from 'node:path';
import { PDRLogger, LogLevel } from './rrm_src/reasoning/level1-pdr/pdr-debug';
import { solveLevel2_5 } from './rrm_src/reasoning/level-2-5-tensor/tensor-level';
import { solveLevel1 } from './rrm_src/reasoning/level1-pdr/pdr-level';
import { PDRSolver } from './rrm_src/reasoning/level1-pdr/pdr-solver';
import { solveLevel2 } from './rrm_src/reasoning/level2-vsa/vsa-level';
import { solveMultiStep } from './rrm_src/reasoning/level2-vsa/multi-step-level';
import { solveLevel3 } from './rrm_src/reasoning/level3-algebra/coord-level';
import { solveLevel4 } from './rrm_src/reasoning/level4-dynamics/physics-level';
import { ARCLogic } from './rrm_src/memory';

async function runExternalTask(filename: string) {
    const filePath = path.join(process.cwd(), filename);
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const parsedData = JSON.parse(rawData);

    // ARC JSON format typically has "train" and "test" pairs
    const task = {
        name: filename,
        train: parsedData.train.map((p: any) => ({ input: p.input, output: p.output })),
        test: parsedData.test.map((p: any) => ({ input: p.input, output: p.output }))
    };

    PDRLogger.clearBuffer();
    PDRLogger.setLevel(LogLevel.TRACE);

    const log = (msg: string) => {
        PDRLogger.log(msg);
    };

    log(`\n==================================================`);
    log(`🧩 MENGERJAKAN EXTERNAL TASK: ${task.name}`);
    log(`==================================================`);

    const pdrSolver = new PDRSolver();
    ARCLogic.resetTraumaVault();

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

    const resultsMessage = [
        "\n💀 GAGAL TOTAL: Agen kehabisan sudut pandang dan mesin logika menyerah pada soal ini.",
        "\n✅ SUKSES: Solusi ditemukan melalui konvergensi penalaran kognitif agen."
    ];
    log(resultsMessage[Number(isTaskSolved)] as string);

    // Print all log buffer
    console.log(PDRLogger.getBuffer());
}

runExternalTask('b0c4d837.json').catch(err => {
    console.error("Script execution failed:", err);
});