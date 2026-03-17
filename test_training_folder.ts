import fs from 'node:fs';
import path from 'node:path';
import { PDRLogger, LogLevel } from './rrm_src/shared/logger';
import { RRM_Agent } from './rrm_src/RRM_Agent';

const agent = new RRM_Agent();

async function runExternalTask(filename: string, logDir: string) {
    const filePath = path.join(process.cwd(), filename);
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const parsedData = JSON.parse(rawData);

    // ARC JSON format typically has "train" and "test" pairs
    const task = {
        name: path.basename(filename),
        train: parsedData.train.map((p: any) => ({ input: p.input, output: p.output })),
        test: parsedData.test.map((p: any) => ({ input: p.input, output: p.output }))
    };

    PDRLogger.clearBuffer();
    PDRLogger.setLevel(LogLevel.TRACE);

    const log = (msg: string) => {
        PDRLogger.log(msg);
    };

    log(`\n==================================================`);
    log(`🧩 MENGERJAKAN EXTERNAL TASK: ${task.name} (VIA RRM ORCHESTRATOR)`);
    log(`==================================================`);

    const startTime = performance.now();
    const isTaskSolved = await agent.solveTask(task, log);
    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    // Log the output
    const buffer = PDRLogger.getBuffer();
    console.log(`Finished ${task.name} in ${duration}ms -> ${isTaskSolved ? "✅ SUKSES" : "💀 GAGAL"}`);
    fs.writeFileSync(path.join(logDir, `${task.name}.log`), buffer);

    return isTaskSolved;
}

async function main() {
    const trainingDir = path.join(process.cwd(), 'training');
    const logDir = path.join(process.cwd(), 'training_logs');

    // Bikin folder buat log kalo belum ada
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }

    const allFiles = fs.readdirSync(trainingDir).filter(f => f.endsWith('.json'));
    // STRESS TEST: Jalankan SEMUA task (400 task) di folder training
    const files = allFiles;
    console.log(`Memulai STRESS TEST untuk ${files.length} task di folder training dengan Arsitektur Kuantum ECS...`);

    let totalSolved = 0;
    const batchStart = performance.now();

    for (const file of files) {
        try {
            const isSolved = await runExternalTask(path.join('training', file), logDir);
            totalSolved += Number(!!isSolved);
        } catch(e) {
            console.error(`Task ${file} gagal dieksekusi dengan error:`, e);
        }
    }

    const batchEnd = performance.now();
    const batchDuration = ((batchEnd - batchStart) / 1000).toFixed(2);

    console.log(`\n📊 BATCH SELESAI: Orchestrator menyelesaikan run penuh untuk ${files.length} soal (Hasil Render: ${totalSolved}).`);
    console.log(`⏱️ TOTAL WAKTU BATCH (30 Task): ${batchDuration} detik.`);
}

main().catch(console.error);