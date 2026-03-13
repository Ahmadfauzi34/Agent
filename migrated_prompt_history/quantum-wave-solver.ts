import { dotProduct, scaleVector, addVectors, matVecMultiply, addMatricesWeighted, waveCollapse } from './math-utils';

/**
 * Quantum Wave Solver (Pure TypeScript, No if-else)
 * 
 * Modul ini mendemonstrasikan penggabungan Quantum Tensor Router dan WaveAgent.
 * Kasus: Sebuah Agen (WavePacket) harus mencari dan bergerak menuju Target.
 * 
 * CARA LAMA (If-Else):
 * if (agent.x < target.x) agent.x += 1;
 * else if (agent.x > target.x) agent.x -= 1;
 * 
 * CARA BARU (Quantum/Tensor):
 * 1. Target memancarkan "Medan Energi" (Gaussian Field) ke seluruh ruang.
 * 2. Agen memproyeksikan dirinya ke masa depan (Superposisi: Geser Kiri, Kanan, Diam).
 * 3. Agen menghitung resonansi (Dot Product) antara masa depannya dengan Medan Target.
 * 4. Resonansi runtuh (Wave Collapse) menjadi matriks transformasi tunggal.
 * 5. Agen berpindah secara matematis tanpa satu pun evaluasi kondisional.
 */

// ============================================================================
// 2. GENERATOR OPERATOR SPASIAL (Matriks Transformasi)
// ============================================================================

/** Membuat Matriks Identitas (Operator Diam) */
const createStayMatrix = (size: number): number[][] => 
    Array.from({ length: size }, (_, i) => 
        Array.from({ length: size }, (_, j) => (i === j ? 1 : 0))
    );

/** Membuat Matriks Geser Kanan (Operator Translasi +1) */
const createShiftRightMatrix = (size: number): number[][] => 
    Array.from({ length: size }, (_, i) => 
        Array.from({ length: size }, (_, j) => (i === j + 1 ? 1 : 0)) // Shift down/right
    );

/** Membuat Matriks Geser Kiri (Operator Translasi -1) */
const createShiftLeftMatrix = (size: number): number[][] => 
    Array.from({ length: size }, (_, i) => 
        Array.from({ length: size }, (_, j) => (i === j - 1 ? 1 : 0)) // Shift up/left
    );

// ============================================================================
// 3. SIMULASI QUANTUM WAVE SOLVER
// ============================================================================

export class QuantumWaveSolver {
    private size: number;
    private opStay: number[][];
    private opRight: number[][];
    private opLeft: number[][];

    constructor(size: number) {
        this.size = size;
        this.opStay = createStayMatrix(size);
        this.opRight = createShiftRightMatrix(size);
        this.opLeft = createShiftLeftMatrix(size);
    }

    /**
     * Membuat Medan Target (Gaussian Field).
     * Target tidak hanya berada di satu titik, tapi memancarkan "aroma" ke seluruh ruang.
     * Ini memungkinkan gradien dihitung melalui Dot Product.
     */
    public createTargetField(targetPos: number, spread: number = 2.0): number[] {
        return Array.from({ length: this.size }, (_, i) => 
            Math.exp(-Math.pow(i - targetPos, 2) / (2 * spread * spread))
        );
    }

    /**
     * Membuat State Agen (WavePacket) di posisi tertentu.
     */
    public createAgentState(pos: number): number[] {
        const state = new Array(this.size).fill(0);
        state[pos] = 1.0; // Amplitudo penuh di posisi awal
        return state;
    }

    /**
     * Mengevolusikan agen satu langkah waktu menuju target TANPA if-else.
     */
    public step(agentState: number[], targetField: number[]): number[] {
        // 1. PROYEKSI MASA DEPAN (Superposisi)
        // Agen membayangkan dirinya berada di 3 state sekaligus: Diam, Kanan, Kiri
        const futureStay = matVecMultiply(this.opStay, agentState);
        const futureRight = matVecMultiply(this.opRight, agentState);
        const futureLeft = matVecMultiply(this.opLeft, agentState);

        // 2. EVALUASI RESONANSI
        // Seberapa besar tumpang tindih (overlap) masa depan agen dengan medan target?
        const energyStay = dotProduct(futureStay, targetField);
        const energyRight = dotProduct(futureRight, targetField);
        const energyLeft = dotProduct(futureLeft, targetField);

        // 3. WAVE COLLAPSE (Pengambilan Keputusan Kuantum)
        // Mengubah energi menjadi probabilitas aksi (0.0 hingga 1.0)
        const probabilities = waveCollapse([energyStay, energyRight, energyLeft], 0.05);

        // 4. SINTESIS OPERATOR (Superposisi Matriks)
        // Kita gabungkan ketiga matriks aksi berdasarkan probabilitasnya.
        // Jika probabilitas Kanan = 0.99, maka matriks akhir hampir identik dengan opRight.
        const finalOperator = addMatricesWeighted(
            [this.opStay, this.opRight, this.opLeft], 
            probabilities
        );

        // 5. EKSEKUSI (Transformasi Spasial)
        // Kalikan state agen saat ini dengan operator final.
        // Agen berpindah secara matematis!
        return matVecMultiply(finalOperator, agentState);
    }
}

// ============================================================================
// DEMONSTRASI (Bisa dijalankan untuk melihat hasilnya)
// ============================================================================
/*
const SIZE = 15;
const solver = new QuantumWaveSolver(SIZE);

// Target ada di indeks 12, memancarkan medan
const targetField = solver.createTargetField(12, 3.0);

// Agen mulai di indeks 2
let agentState = solver.createAgentState(2);

console.log("=== SIMULASI QUANTUM WAVE SOLVER ===");
console.log("Target berada di posisi 12.");

for (let step = 0; step < 12; step++) {
    // Cari posisi dengan amplitudo tertinggi untuk visualisasi (hanya untuk print)
    const currentPos = agentState.indexOf(Math.max(...agentState));
    
    // Visualisasi sederhana
    let vis = new Array(SIZE).fill('.');
    vis[12] = 'T'; // Target
    if (currentPos === 12) vis[currentPos] = 'X'; // Agen mencapai target
    else vis[currentPos] = 'A'; // Agen
    
    console.log(`Step ${step.toString().padStart(2, '0')}: [${vis.join('')}]`);

    // Evolusi agen (TANPA IF-ELSE)
    agentState = solver.step(agentState, targetField);
}
*/
