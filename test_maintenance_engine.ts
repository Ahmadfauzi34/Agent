import { LogicSeedBank } from './rrm_src/memory/logic-seed-bank';
import { MaintenanceEngine } from './rrm_src/memory/MaintenanceEngine';
import { PDRLogger, LogLevel } from './rrm_src/shared/logger';
import { UniversalManifold } from './rrm_src/perception/UniversalManifold';

function testMaintenanceEngine() {
    console.log("🛠️ Memulai Pengujian Quantum Annealer (Maintenance Engine)...");
    PDRLogger.setLevel(LogLevel.TRACE);

    // Inisialisasi Bank Memori
    const perceiver = new UniversalManifold();
    const seedBank = new LogicSeedBank(perceiver);

    // Inject custom test rules untuk membuat crosstalk disengaja
    console.log("1. Menginjeksi aturan memori kasar untuk simulasi crosstalk...");
    const rawPhasor1 = new Float32Array(8192).fill(0.5);
    const rawPhasor2 = new Float32Array(8192).fill(0.51); // Sangat mirip dengan 1, crosstalk tinggi

    seedBank.registerSkill("TEST_DUMMY_1", 100, rawPhasor1);
    seedBank.registerSkill("TEST_DUMMY_2", 101, rawPhasor2);

    // Inisialisasi Maintenance Engine
    const annealer = new MaintenanceEngine(seedBank);

    console.log("2. Menjalankan proses Quantum Annealing...");
    const results = annealer.annealMemory(0.1, 10);

    console.log(`\n📊 HASIL ANNEALING:`);
    console.log(`   - Rata-rata Crosstalk Awal  : ${results.beforeNoise.toFixed(5)}`);
    console.log(`   - Rata-rata Crosstalk Akhir : ${results.afterNoise.toFixed(5)}`);

    if (results.afterNoise < results.beforeNoise) {
        console.log("\n✅ KESIMPULAN: Maintenance Engine berhasil mengurangi benturan memori (crosstalk) antar memori agen, membuat VSA lebih orthogonal.");
    } else {
        console.log("\n❌ KESIMPULAN: Annealing gagal memisahkan vektor memori.");
    }
}

testMaintenanceEngine();