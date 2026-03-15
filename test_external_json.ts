import fs from 'node:fs';
import path from 'node:path';
import { PDRLogger, LogLevel } from './rrm_src/shared/logger';
import { RRM_Agent } from './rrm_src/RRM_Agent';

const agent = new RRM_Agent();

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

    // Load harvested memory from JSON before starting
    const memoryPath = path.join(process.cwd(), 'all_harvested_arc_seeds.json');
    if (fs.existsSync(memoryPath)) {
        const harvestedData = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
        agent.loadHarvestedMemories(harvestedData);
    }

    log(`\n==================================================`);
    log(`🧩 MENGERJAKAN EXTERNAL TASK: ${task.name} (VIA RRM ORCHESTRATOR)`);
    log(`==================================================`);

    const startTime = performance.now();
    const result = await agent.solveTask(task, log);
    const endTime = performance.now();

    // Print all log buffer
    console.log(PDRLogger.getBuffer());

    if (result) {
        console.log(`\n==================================================`);
        console.log(`✅ HASIL PREDIKSI (COLLAPSED REALITY):`);
        console.dir(result, { depth: null });
        console.log(`==================================================`);
    } else {
        console.log(`\n❌ AGEN MENYERAH. Entropi terlalu tinggi untuk meruntuhkan gelombang.`);
    }

    console.log(`\n⏱️ WAKTU EKSEKUSI ORKESTRATOR: ${(endTime - startTime).toFixed(2)} ms.`);
}

runExternalTask('b0c4d837.json').catch(err => {
    console.error("Script execution failed:", err);
});