import fs from 'node:fs';
import path from 'node:path';
import { PDRLogger, LogLevel } from './rrm_src/shared/logger.js';
import { RRM_Agent } from './rrm_src/RRM_Agent.js';

// ==========================================
// VISUALIZER & VALIDATOR KUANTUM
// ==========================================

// Fungsi untuk mengecek apakah dua grid identik 100%
function isGridEqual(grid1: any[][], grid2: any[][]): boolean {
    if (!grid1 || !grid2) return false;
    if (grid1.length !== grid2.length) return false;

    for (let r = 0; r < grid1.length; r++) {
        if (!grid1[r] || !grid2[r] || grid1[r].length !== grid2[r].length) return false;
        for (let c = 0; c < grid1[r].length; c++) {
            if (grid1[r][c] !== grid2[r][c]) return false;
        }
    }
    return true;
}

// Fungsi untuk mengubah Matriks menjadi String Emoji berformat (Bisa di-print & di-save)
function gridToString(grid: any[][], title: string): string {
    const sprites: Record<number, string> = {
        0: "⬛", 1: "🟦", 2: "🟥", 3: "🟩", 4: "🟨",
        5: "⬜", 6: "🟪", 7: "🟧", 8: "🩵", 9: "🟫"
    };

    let out = `\n   === ${title} ===\n`;
    if (!grid || !Array.isArray(grid) || !Array.isArray(grid[0])) {
        return out + "   [Grid Kosong / Invalid / Agen Pingsan]\n";
    }

    for (const row of grid) {
        const rowString = row.map(cell => sprites[cell] || "❔").join("");
        out += `   ${rowString}\n`;
    }
    return out;
}

// ==========================================
// ANALYTICS & METRICS STRUCTURES
// ==========================================
interface TaskMetrics {
    filename: string;
    duration: number;
    success: boolean;
    gridSize: string;
    entityCount: number;
    iterations: number;
    freeEnergyFinal: number;
    error?: string;
    visualLog?: string; // Menyimpan gambar emoji untuk dimasukkan ke report txt
}

interface BatchStatistics {
    total: number;
    success: number;
    failed: number;
    totalDuration: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    medianDuration: number;
    throughput: number;
    memoryPeak: number;
    startTime: number;
}

const metrics: TaskMetrics[] = [];
let batchStats: BatchStatistics | null = null;

function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return `${bytes.toFixed(2)} ${units[i]}`;
}

function formatTime(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

function getMemoryUsage(): number { return process.memoryUsage().heapUsed; }

async function runExternalTask(filename: string, logDir: string, current: number, total: number) {
    const filePath = path.join(process.cwd(), filename);
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const parsedData = JSON.parse(rawData);

    const firstInput = parsedData.train[0]?.input || parsedData.test[0]?.input;
    const is2D = Array.isArray(firstInput?.[0]);
    const gridSize = is2D ? `${firstInput.length}x${firstInput[0]?.length || 0}` : `${firstInput?.length || 0} tokens`;

    let entityCount = 0;
    if (is2D) {
        firstInput.forEach((row: number[]) => {
            row.forEach((cell: number) => { if (cell !== 0) entityCount++; });
        });
    }

    const task = {
        name: path.basename(filename),
        train: parsedData.train.map((p: any) => ({ input: p.input, output: p.output })),
        test: parsedData.test.map((p: any) => ({ input: p.input, output: p.output }))
    };

    PDRLogger.clearBuffer();
    PDRLogger.setLevel(LogLevel.TRACE);
    const log = (msg: string) => { PDRLogger.log(msg); };

    const percent = ((current / total) * 100).toFixed(1);
    const elapsed = batchStats ? (performance.now() - batchStats.startTime) : 0;
    const eta = current > 1 ? (elapsed / (current - 1)) * (total - current) : 0;

    console.log(`\n[${current}/${total}] ${percent}% | ETA: ${formatTime(eta)}`);
    console.log(`🧩 ${task.name} | Grid: ${gridSize} | Entities: ${entityCount}`);

    const startTime = performance.now();
    let success = false;
    let errorMsg = '';
    let iterations = 0;
    let finalFreeEnergy = 0;
    let outputGrid: any[][] | null = null;
    const expectedGrid = task.test[0]?.output; // Ambil Kunci Jawaban!

    const agent = new RRM_Agent();

    try {
        const result = await agent.solveTask(task, log);

        // Ekstrak hasil agen dengan aman
        if (result) {
            outputGrid = Array.isArray(result) ? result as any[][] : (result as any).output || (result as any).grid;
        }

        // VALIDASI GROUND TRUTH! (Bukan sekadar mengecek apakah ada output)
        success = isGridEqual(outputGrid as any[][], expectedGrid);

        const logBuffer = PDRLogger.getBuffer();
        const iterMatch = logBuffer.match(/(\d+)\s*iterations?/i);
        const energyMatch = logBuffer.match(/Free\s*Energy[:\s]+([\d.]+)/i);
        iterations = iterMatch ? parseInt(iterMatch[1]) : 0;
        finalFreeEnergy = energyMatch ? parseFloat(energyMatch[1]) : 0;

    } catch (e: any) {
        errorMsg = e.message || 'Unknown error';
    }

    const duration = performance.now() - startTime;

    // ==========================================
    // MERAKIT BUKTI VISUAL (Untuk Terminal & Report)
    // ==========================================
    let visualLog = "";
    if (task.test && task.test[0] && task.test[0].input) {
        visualLog += gridToString(task.test[0].input, "SOAL UJIAN (INPUT)");
    }
    if (expectedGrid) {
        visualLog += gridToString(expectedGrid, "KUNCI JAWABAN (EXPECTED)");
    }
    visualLog += gridToString(outputGrid as any[][], "HASIL AGEN (ACTUAL)");

    // Tampilkan di terminal JIKA GAGAL atau 5 tugas pertama
    if (!success || current <= 5) {
        console.log(visualLog);
    }

    // Masukkan ke Logger agar tersimpan di file log per-tugas
    log(visualLog);
    log(`STATUS KELULUSAN: ${success ? 'LULUS (100% MATCH)' : 'GAGAL (TIDAK COCOK)'}`);

    metrics.push({
        filename: task.name, duration, success, gridSize,
        entityCount, iterations, freeEnergyFinal: finalFreeEnergy, error: errorMsg || undefined,
        visualLog: visualLog // Simpan ke array metrics untuk Report Akhir
    });

    const statusIcon = success ? '✅' : '💀';
    console.log(`   ${statusIcon} ${success ? 'SUKSES' : 'GAGAL'} | Duration: ${formatTime(duration)} | F.Energy: ${finalFreeEnergy.toFixed(4)}`);

    fs.writeFileSync(path.join(logDir, `${task.name}.log`), PDRLogger.getBuffer());
    return success;
}

function generateFinalReport(logDir: string): string {
    const stats = calculateStatistics();
    const report: string[] = [];

    report.push(`\n${'='.repeat(70)}`);
    report.push(`📊 RRM PHASE 6 - BATCH EXECUTION REPORT (STRICT VALIDATION)`);
    report.push(`${'='.repeat(70)}`);
    report.push(`Timestamp: ${new Date().toISOString()}`);
    report.push(`\n🎯 SUMMARY (GROUND TRUTH ACCURACY)`);
    report.push(`   Total Tasks: ${stats.total}`);
    report.push(`   Success: ${stats.success} ✅ (${((stats.success/stats.total)*100).toFixed(1)}%)`);
    report.push(`   Failed: ${stats.failed} 💀 (${((stats.failed/stats.total)*100).toFixed(1)}%)`);
    report.push(`   Throughput: ${stats.throughput.toFixed(2)} tasks/minute`);

    report.push(`\n⏱️  TIMING STATISTICS`);
    report.push(`   Avg Duration: ${formatTime(stats.avgDuration)}`);
    report.push(`   Max Duration: ${formatTime(stats.maxDuration)}`);

    // Tambahkan Laporan Visual Khusus Untuk Kegagalan ke File TXT
    if (stats.failed > 0) {
        report.push(`\n${'='.repeat(70)}`);
        report.push(`💀 FAILED TASKS VISUAL AUDIT (WHY DID THEY FAIL?)`);
        report.push(`${'='.repeat(70)}`);

        metrics.filter(m => !m.success).forEach(m => {
            report.push(`\n--- FILE: ${m.filename} ---`);
            report.push(`Error Log: ${m.error || 'Agen tidak crash, tetapi logikanya salah / amnesia.'}`);
            report.push(`Free Energy: ${m.freeEnergyFinal}`);
            report.push(m.visualLog || "[Visual Tidak Tersedia]");
        });
    }

    report.push(`\n${'='.repeat(70)}`);
    const reportStr = report.join('\n');
    fs.writeFileSync(path.join(logDir, 'FINAL_REPORT.txt'), reportStr);

    // Hapus properti string emoji yang panjang sebelum menyimpan ke metrics.json agar tidak bengkak
    const cleanMetrics = metrics.map(({ visualLog, ...rest }) => rest);
    fs.writeFileSync(path.join(logDir, 'metrics.json'), JSON.stringify(cleanMetrics, null, 2));

    return reportStr;
}

function calculateStatistics(): BatchStatistics {
    const durations = metrics.map(m => m.duration);
    const sorted = [...durations].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0 ? (sorted[Math.floor(sorted.length / 2) - 1] + sorted[Math.floor(sorted.length / 2)]) / 2 : sorted[Math.floor(sorted.length / 2)];
    const total = metrics.length;
    const success = metrics.filter(m => m.success).length;
    const totalDuration = batchStats ? (performance.now() - batchStats.startTime) : 0;

    return {
        total, success, failed: total - success, totalDuration,
        avgDuration: totalDuration / total, minDuration: Math.min(...durations), maxDuration: Math.max(...durations),
        medianDuration: median, throughput: (total / (totalDuration / 60000)),
        memoryPeak: Math.max(...metrics.map(() => getMemoryUsage())), startTime: batchStats?.startTime || performance.now()
    };
}

async function main() {
    const trainingDir = path.join(process.cwd(), 'training');
    const logDir = path.join(process.cwd(), 'training_logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    const files = fs.readdirSync(trainingDir).filter(f => f.endsWith('.json')).sort();

    console.log(`\n🚀 RRM PHASE 6: STRICT GROUND TRUTH VALIDATION`);
    console.log(`   Target: ${files.length} tasks in ${trainingDir}`);

    batchStats = {
        total: files.length, success: 0, failed: 0, totalDuration: 0, avgDuration: 0,
        minDuration: Infinity, maxDuration: 0, medianDuration: 0, throughput: 0, memoryPeak: 0, startTime: performance.now()
    };

    const promises = files.map((file, i) => {
        return runExternalTask(path.join('training', file), logDir, i + 1, files.length)
            .catch((e: any) => {
                console.error(`   🔥 FATAL ERROR in ${file}:`, e.message);
            });
    });

    await Promise.all(promises);

    console.log(generateFinalReport(logDir));
    console.log(`\n📁 Cek FINAL_REPORT.txt untuk melihat gambar emoji dari agen yang gagal!`);
}

main().catch(console.error);
