import { UniversalManifold } from './rrm_src/perception/UniversalManifold';
import { LogicSeedBank } from './rrm_src/memory/logic-seed-bank';
import { GLOBAL_DIMENSION } from './rrm_src/core/config';

function injectNoise(phasor: Float32Array, noiseRatio: number): Float32Array {
    const noisyPhasor = new Float32Array(phasor.length);
    for (let i = 0; i < phasor.length; i++) {
        // Inject small random variations
        const noise = (Math.random() * 2 - 1) * noiseRatio;
        noisyPhasor[i] = phasor[i]! + noise;
    }
    return noisyPhasor;
}

function testLogicSeedBank() {
    console.log("🌌 Memulai Ekspedisi Quantum Memory: Logic Seed Bank");
    const perceiver = new UniversalManifold();
    const seedBank = new LogicSeedBank(perceiver);

    // Minta seed 1000 + (0.5+10)*100 + (-0.3+10) = bukan lagi format integer sederhana.
    // Kita gunakan indeks SoA flat sekarang. Kita panggil nama saja.
    const targetName = "L1_SHIFT_0.5_-0.5"; // Contoh salah satu aksioma
    console.log(`\n1. Mengambil Axiom Seed dasar (${targetName}) dari memory bank...`);

    // Karena kita sudah memindahkannya ke SoA array, kita loop mencari indexnya:
    let targetIndex = -1;
    for(let i=0; i<seedBank.activeCount; i++){
        if (seedBank.ruleNames[i] === targetName) {
            targetIndex = i;
            break;
        }
    }

    if (targetIndex === -1) {
        console.error("❌ GAGAL: Seed target tidak ditemukan di dalam memory bank.");
        return;
    }

    const purePhasor = seedBank.getTensor(targetIndex);

    if (!purePhasor) {
        console.error("❌ GAGAL: Seed target tidak ditemukan di dalam memory bank.");
        return;
    }
    console.log("✅ Seed ditemukan.");

    console.log("\n2. Mensimulasikan Noise Spasial (Holographic Interference / 30% Noise)...");
    const noisyPhasor = injectNoise(purePhasor, 0.3);

    console.log("\n3. Mengeksekusi Resonance Search: Bisakah mesin memulihkan ingatan murninya?");
    const match = seedBank.findBestMatch(noisyPhasor);

    if (match) {
        console.log(`✅ Ingatan Terpulihkan!`);
        console.log(`   - Nama Aturan     : ${match.name} (Harusnya ${targetName})`);
        console.log(`   - Koherensi       : ${(match.coherence * 100).toFixed(2)}%`);

        if (match.name === targetName) {
            console.log("\n🎯 KESIMPULAN: Logic Seed Bank (SoA) BERFUNGSI SEMPURNA.");
            console.log("Meskipun sinyal yang diterima agen buram/bising, fungsi `findBestMatch` yang berjalan sangat cepat di L1 Cache berhasil melakukan auto-correction menggunakan Cosine Similarity untuk mengenali hukum fundamental alam.");
        } else {
            console.log("\n⚠️ KESIMPULAN: Mesin salah mengenali memori, terlalu banyak crosstalk noise.");
        }
    } else {
        console.log("\n❌ KESIMPULAN: Mesin GAGAL. Ia kehilangan ingatan mengenai apa itu pergeseran spasial.");
    }
}

testLogicSeedBank();