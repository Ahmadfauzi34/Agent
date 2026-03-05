import { PDRSolver } from '../pdr/pdr-solver';
import { ARC_DATABASE } from '../arc/data';

export function runPhysicsAgent(): string {
    let output = "";
    const log = (msg: string) => {
        console.log(msg);
        output += msg + "\n";
    };

    log("🚀 MENGAKTIFKAN AGEN FISIKA (PDR SOLVER)...");
    log("============================================");

    const solver = new PDRSolver();
    let solvedCount = 0;

    for (const task of ARC_DATABASE) {
        log(`\n🧩 MENGERJAKAN: ${task.name}`);
        
        // Ambil Data Train
        const trainInputs = task.train.map(t => t.input);
        const trainOutputs = task.train.map(t => t.output);
        
        // Ambil Data Test
        const testInput = task.test[0].input;
        const expectedOutput = task.test[0].output;

        // Jalankan Solver
        const predictedOutput = solver.solveTask(trainInputs, trainOutputs, testInput);

        // Evaluasi Hasil
        const isCorrect = JSON.stringify(predictedOutput) === JSON.stringify(expectedOutput);
        
        if (isCorrect) {
            log(`   🏆 BERHASIL! Prediksi sesuai dengan Output Harapan.`);
            solvedCount++;
        } else {
            log(`   ❌ GAGAL. Prediksi tidak sesuai.`);
            // Debug: Tampilkan prediksi vs harapan (jika kecil)
            if (testInput.length <= 5) {
                log(`   Ekspektasi: ${JSON.stringify(expectedOutput)}`);
                log(`   Realita   : ${JSON.stringify(predictedOutput)}`);
            }
        }
    }

    log(`\n📊 SKOR AKHIR: ${solvedCount} / ${ARC_DATABASE.length} Soal Terpecahkan.`);
    return output;
}

