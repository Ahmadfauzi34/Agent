import { HolographicManifold } from './rrm_src/memory/holographic-manifold';
import { LogicSeedBank } from './rrm_src/memory/logic-seed-bank';
import { PhasorGenerator } from './rrm_src/core/generator';
import { GLOBAL_DIMENSION, COMPLEX_DIMENSION } from './rrm_src/core/config';

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
    const manifold = new HolographicManifold();
    const seedBank = new LogicSeedBank(manifold);

    // Seed untuk pergeseran (DX=5, DY=-3) -> rumusnya 1000 + (15) * 100 + 7 = 2507
    const targetSeed = 2507;
    console.log(`\n1. Mengambil Axiom Seed dasar (DX=5, DY=-3) dari memory bank...`);
    const purePhasor = seedBank.getPhasorBySeed(targetSeed);

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
        console.log(`   - Prediksi Seed   : ${match.seed} (Seharusnya ${targetSeed})`);
        console.log(`   - Nama Aturan     : ${match.name}`);
        console.log(`   - Koherensi       : ${(match.coherence * 100).toFixed(2)}%`);

        if (match.seed === targetSeed) {
            console.log("\n🎯 KESIMPULAN: Logic Seed Bank dan Holographic Manifold BERFUNGSI SEMPURNA.");
            console.log("Meskipun sinyal yang diterima agen buram/bising, fungsi `findBestMatch` yang berjalan tanpa IF-ELSE berhasil melakukan auto-correction menggunakan Cosine Similarity untuk mengenali hukum fundamental alam.");
        } else {
            console.log("\n⚠️ KESIMPULAN: Mesin salah mengenali memori, terlalu banyak crosstalk noise.");
        }
    } else {
        console.log("\n❌ KESIMPULAN: Mesin GAGAL. Ia kehilangan ingatan mengenai apa itu pergeseran spasial.");
    }
}

testLogicSeedBank();