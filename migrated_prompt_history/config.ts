/**
 * ============================================================================
 * RRM v83 - GLOBAL CONFIGURATION & PHYSICS CONSTANTS
 * ============================================================================
 */

// 1. RESOLUSI ALAM SEMESTA (Hardware-Aligned)
// 8192 memakan ~32KB per vektor. Sangat optimal untuk L1 Cache CPU.
export const GLOBAL_DIMENSION = 8192; 
export const COMPLEX_DIMENSION = GLOBAL_DIMENSION * 2; 

// 2. STANDARISASI TIPE DATA MEMORI (The Unified Type)
// Menggunakan Float32Array agar mendukung Kalkulus Fase Kontinu (Huygens/Hamiltonian)
// dengan kecepatan eksekusi setara instruksi SIMD di mesin V8/WASM.
export type Tensor = Float32Array;

// 3. KONSTANTA FISIKA AI
export const PHYSICS = {
    // Epsilon untuk mencegah Division by Zero pada kalkulasi gelombang (NaN blocker)
    EPSILON: 1e-15,
    
    // Konstanta Planck Kustom (Untuk mengatur kecepatan peluruhan Hamiltonian)
    H_BAR: 1.0,
    
    // Ambang batas keruntuhan (Wavefunction Collapse Threshold)
    COLLAPSE_THRESHOLD: 0.01,

    // Toleransi Ortogonalitas (Jika kemiripan < 0.05, dianggap ortogonal/berbeda)
    ORTHOGONAL_TOLERANCE: 0.05
};

/**
 * Utilitas Pabrik Tensor: Menciptakan kekosongan (Vakum)
 */
export function createEmptyTensor(): Tensor {
    return new Float32Array(COMPLEX_DIMENSION).fill(0);
}
