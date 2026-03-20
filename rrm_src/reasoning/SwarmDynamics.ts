import { EntityManifold } from '../core/EntityManifold.js';
import { TensorVector, GLOBAL_DIMENSION, MAX_ENTITIES } from '../core/config.js';
import { FHRR } from '../core/fhrr.js';
import { CoreSeeds } from '../core/CoreSeeds.js';
import { AxiomGenerator } from './AxiomGenerator.js';

/**
 * 🐝 SWARM DYNAMICS (Multi-Agent Particle System)
 * Menggunakan prinsip "Subarray View" (Zero-GC) dan Termodinamika Berkelanjutan
 * untuk mengatur perilaku gerombolan (Gravitasi, Kohesi, Cairan, dsb) secara paralel
 * pada ribuan piksel di MultiverseSandbox.
 */
export class SwarmDynamics {

    /**
     * Menerapkan "Kinetika Gerombolan" (Swarm Kinematics).
     * Semua entitas yang memenuhi syarat akan bergerak bersamaan (misal: "Gravity Drop", "Flocking").
     * @param u EntityManifold (Universenya)
     * @param directionX Arah dorongan (misal 0.0)
     * @param directionY Arah dorongan (misal 1.0 untuk gravitasi ke bawah)
     * @param threshold Massa atau kriteria (0.0 = semua bergerak, >0 = hanya mass tertentu)
     */
    public static applySwarmGravity(u: EntityManifold, directionX: number, directionY: number, massThreshold: number = 0.0): void {
        const width = u.globalWidth;
        const height = u.globalHeight;

        // Gerakkan entitas satu langkah piksel penuh pada arah yang ditentukan
        const stepX = directionX / Math.max(1, width - 1);
        const stepY = directionY / Math.max(1, height - 1);

        // Pre-generate fasa translasi dari CoreSeeds (O(1) Memory, digunakan oleh ribuan entitas)
        const swarmShiftTensor = AxiomGenerator.generateTranslationAxiom(
            stepX, stepY,
            CoreSeeds.X_AXIS_SEED, CoreSeeds.Y_AXIS_SEED
        );

        // 1. Kumpulkan semua kandidat yang mau bergerak ke bawah
        // Gunakan buffer TypedArray kecil jika butuh tracking, tapi loop langsung lebih cepat
        for (let i = 0; i < u.activeCount; i++) {
            // Abaikan hantu/ruang hampa
            if (u.masses[i] === 0.0) continue;

            // Kriteria filter matematis (Branchless jika mungkin)
            // Tapi untuk logika "apakah dia membentur dasar?", kita butuh IF karena ini boundary check absolut

            const currentRelY = u.centersY[i]!;
            const currentRelX = u.centersX[i]!;
            const spanX = u.spansX[i]!;
            const spanY = u.spansY[i]!;

            // Hitung radius absolut
            const ry = spanY / 2.0;
            const rx = spanX / 2.0;

            const nextRelX = currentRelX + stepX;
            const nextRelY = currentRelY + stepY;

            // CEK 1: Apakah menabrak batas Grid alam semesta? (Lantai / Dinding)
            // (Mengubah kembali ke piksel)
            const nextPy = nextRelY * (height - 1);
            const nextPx = nextRelX * (width - 1);
            const pyRad = ry;
            const pxRad = rx;

            if (nextPy + pyRad > height - 0.5 || nextPy - pyRad < -0.5) continue;
            if (nextPx + pxRad > width - 0.5 || nextPx - pxRad < -0.5) continue;

            // CEK 2: Swarm Collision Check (Apakah ada teman di bawah/sampingnya yang memblokir?)
            // Fluid/Sand dynamics: "Jika terblokir, jangan jatuh"
            let blocked = false;
            for (let j = 0; j < u.activeCount; j++) {
                if (i === j || u.masses[j] === 0.0) continue;

                // Konversi agen kedua ke absolut
                const cX2 = u.centersX[j]! * (width - 1);
                const cY2 = u.centersY[j]! * (height - 1);
                const rx2 = u.spansX[j]! / 2.0;
                const ry2 = u.spansY[j]! / 2.0;

                const overlapX = (pxRad + rx2) - Math.abs(nextPx - cX2);
                const overlapY = (pyRad + ry2) - Math.abs(nextPy - cY2);

                if (overlapX >= -0.01 && overlapY >= -0.01) { // Collision toleransi margin float
                    blocked = true;
                    break;
                }
            }

            if (!blocked) {
                // Terapkan Kinetika
                u.centersX[i] = nextRelX;
                u.centersY[i] = nextRelY;

                // Terapkan Quantum Shift (Update 8192-D phase)
                const entityTensor = u.getTensor(i);
                const futureState = FHRR.bind(entityTensor, swarmShiftTensor);
                entityTensor.set(futureState);
            }
        }
    }
}
