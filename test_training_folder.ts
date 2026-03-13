import fs from 'node:fs';
import path from 'node:path';
import { PDRLogger, LogLevel } from './rrm_src/reasoning/level1-pdr/pdr-debug';
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

    const isTaskSolved = await agent.solveTask(task, log);

    // Log the output
    const buffer = PDRLogger.getBuffer();
    console.log(`Finished ${task.name} -> ${isTaskSolved ? "✅ SUKSES" : "💀 GAGAL"}`);
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

    const files = fs.readdirSync(trainingDir).filter(f => f.endsWith('.json'));
    console.log(`Memulai batch processing untuk ${files.length} task di folder training...`);

    let totalSolved = 0;

    for (const file of files) {
        try {
            const isSolved = await runExternalTask(path.join('training', file), logDir);
            totalSolved += Number(isSolved);
        } catch(e) {
            console.error(`Task ${file} gagal dieksekusi dengan error:`, e);
        }
    }

    console.log(`\n📊 BATCH SELESAI: Berhasil memecahkan ${totalSolved} dari ${files.length} soal.`);
}

main().catch(console.error);