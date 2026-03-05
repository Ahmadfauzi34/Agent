import { SpectralMoE } from './vsa/spectral-moe';
import { SymmetryExpert, LoneWolfExpert } from './vsa/experts';

// Inisialisasi MoE dengan 2 Pakar
const DIMENSION = 16;
const experts = [new SymmetryExpert(), new LoneWolfExpert()];
const moe = new SpectralMoE(DIMENSION, experts);

// Skenario 1: Sinyal Simetris (Architect harus dominan)
// Pola: [1, 2, 3, 3, 2, 1] di tengah
const symmetricSignal = new Float64Array(DIMENSION).fill(0);
symmetricSignal.set([1, 2, 3, 3, 2, 1], 5);

// Skenario 2: Sinyal Impuls/Lone Wolf (Sniper harus dominan)
// Pola: [0, 0, 10, 0, 0] (Satu titik tajam)
const impulseSignal = new Float64Array(DIMENSION).fill(0);
impulseSignal[8] = 10;

console.log("🚀 MENGAKTIFKAN SPECTRAL MoE (MIXTURE OF EXPERTS)...\n");

// --- Tes 1: Simetri ---
console.log("🧪 Tes 1: Sinyal Simetris (Harapan: Architect Dominan)");
console.log(`Input: [${Array.from(symmetricSignal).join(', ')}]`);
const outSym = moe.process(symmetricSignal);
console.log(`Output MoE: [${Array.from(outSym).map(x => x.toFixed(2)).join(', ')}]`);
// Analisis manual: Jika Architect dominan, nilai tengah akan tinggi karena resonansi simetri

// --- Tes 2: Impuls ---
console.log("\n🧪 Tes 2: Sinyal Impuls (Harapan: Sniper Dominan)");
console.log(`Input: [${Array.from(impulseSignal).join(', ')}]`);
const outImp = moe.process(impulseSignal);
console.log(`Output MoE: [${Array.from(outImp).map(x => x.toFixed(2)).join(', ')}]`);
// Analisis manual: Jika Sniper dominan, nilai di sekitar impuls akan tajam (Laplacian)

console.log("\n✅ MoE Berhasil Dijalankan!");
