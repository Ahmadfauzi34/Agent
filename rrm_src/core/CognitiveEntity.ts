import { TensorVector } from './config';

/**
 * 🧩 COGNITIVE ENTITY (Fase 1: Penyatuan Entitas)
 * Interface tunggal agnostik yang menggantikan ARCObject, PhysicsObject, dan WaveAgent.
 * Mesin tidak peduli apakah ini representasi pixel 2D atau token teks 1D.
 */
export interface CognitiveEntity {
    /**
     * Identifier unik entitas dalam suatu state/ruang waktu.
     */
    id: string;

    /**
     * Massa entitas (bisa merepresentasikan jumlah pixel, panjang token, dsb).
     */
    mass: number;

    /**
     * Titik pusat entitas (Relatif antara 0.0 - 1.0 agar Agnostik terhadap ukuran Grid asli).
     * Jika data 1D (teks), sumbu y cukup diisi 0.
     */
    center_rel: { x: number, y: number };

    /**
     * Representasi Tensor VSA (The Unified Datatype) dari wujud entitas ini.
     */
    tensor: TensorVector;

    /**
     * Status keterkaitan (Kausalitas instan / Gravitasi Gelombang).
     * Akan dimanfaatkan oleh WaveDynamics di Fase 4.
     */
    entanglement_status: number;
}
