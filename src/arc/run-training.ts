import { Task } from './types';
import * as fs from 'fs';
import * as path from 'path';

export async function runTrainingTask(filePath: string) {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`File not found: ${fullPath}`);
        return;
    }

    const data = fs.readFileSync(fullPath, 'utf-8');
    const tasks: Task[] = JSON.parse(data);

    console.log(`🚀 Memproses ${tasks.length} tugas dari ${filePath}...`);

    for (const task of tasks) {
        console.log(`\n🧩 Menganalisis: ${task.name || 'Unnamed Task'}`);
        // Di sini kita bisa memanggil solver agen untuk melihat apakah bisa memecahkan tugas ini
        // Untuk sekarang, kita hanya log struktur input/output
        console.log(`   Input Grid: ${task.train[0].input.length}x${task.train[0].input[0].length}`);
        console.log(`   Output Grid: ${task.train[0].output.length}x${task.train[0].output[0].length}`);
    }
}

// Jalankan jika dipanggil langsung
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('run-training.ts')) {
    const file = process.argv[2] || 'src/arc/training/sample1.json';
    runTrainingTask(file).then(() => process.exit(0));
}
