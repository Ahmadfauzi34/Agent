/**
 * 🌌 KONSTANTA ALAM SEMESTA V83 (RRM GRAND BLUEPRINT)
 * Jika Anda mengubah angka ini, seluruh otak Agen akan menyesuaikan diri.
 * Wajib Power of 2 (contoh: 1024, 2048, 4096, 8192, 16384) untuk FFT/FWHT.
 */
export const GLOBAL_DIMENSION = 8192;
export const COMPLEX_DIMENSION = GLOBAL_DIMENSION * 2; // Untuk Phasor (Real + Imaginary)

/**
 * THE UNIFIED TENSOR DATATYPE (Fase 1)
 * Menggunakan Float32Array agar HamiltonianPruner dapat mengeksekusi
 * mekanisme disipatif (decaying trauma) secara elegan sesuai hukum termodinamika.
 */
export type TensorVector = Float32Array;

/**
 * BATAS POPULASI ENTITAS (Mencegah Alokasi Dinamis RAM / Dosa 4)
 * Menetapkan ukuran pra-alokasi (Pre-allocation) matriks ECS.
 */
export const MAX_ENTITIES = 500;
