import { TensorVector } from './config.js';

/**
 * 🧩 COGNITIVE ENTITY (Fase 1: Penyatuan Entitas)
 * Interface tunggal agnostik yang menggantikan ARCObject, PhysicsObject, dan WaveAgent.
 * Mesin tidak peduli apakah ini representasi pixel 2D atau token teks 1D.
 */
export interface CognitiveEntity {
    /**
     * Identifier unik entitas dalam suatu state/ruang waktu (misal: "Token7_Island1").
     */
    id: string;

    /**
     * Nilai atomik asli (Warna 0-9 untuk ARC, kode ASCII untuk Teks).
     * Digunakan sebagai kunci klasifikasi cepat sebelum masuk ke alam Tensor.
     */
    token: number | string;

    /**
     * Massa entitas (Amplitudo energi: jumlah pixel, panjang karakter, dsb).
     */
    mass: number;

    /**
     * Sebaran spasial (Jangkauan dimensi maksimal dari entitas).
     * Penting untuk membedakan bentuk objek yang massanya sama.
     */
    spread: number;

    /**
     * Titik pusat entitas (Relatif antara 0.0 - 1.0 agar Agnostik terhadap ukuran Grid asli).
     * Jika data 1D (teks), sumbu y wajib diisi 0.0.
     */
    center_rel: { x: number, y: number };

    /**
     * Momentum / Inersia (Arah pergerakan saat ini).
     * Dibutuhkan oleh WaveDynamics jika objek memiliki kecepatan konstan.
     */
    momentum: { dx: number, dy: number };

    /**
     * Representasi Tensor VSA (The Unified Datatype / 8192-D) dari wujud entitas ini.
     */
    tensor: TensorVector;

    /**
     * Status keterkaitan (Kausalitas Instan / Quantum Entanglement).
     * Status keruntuhan gelombang (0.0 - 1.0) untuk Hebbian Matrix branchless.
     */
    entanglement_status: number;
}
