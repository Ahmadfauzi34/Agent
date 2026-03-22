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
     * @param deltaX Total target translasi skalar X relatif (0.0-1.0)
     * @param deltaY Total target translasi skalar Y relatif (0.0-1.0)
     */
    public static applySwarmGravity(u: EntityManifold, deltaX: number, deltaY: number): void {
        const width = u.globalWidth;
        const height = u.globalHeight;

        // Kita mengubah delta relatif kembali ke jarak piksel untuk melakukan iterasi step-by-step
        // Hal ini sangat penting untuk mencegah entitas 'menembus' satu sama lain (Quantum Tunneling Bug)
        const totalPixelStepsX = Math.round(Math.abs(deltaX * (width - 1)));
        const totalPixelStepsY = Math.round(Math.abs(deltaY * (height - 1)));

        // Ambil jumlah langkah terbanyak sebagai iterasi maksimum
        const maxSteps = Math.max(totalPixelStepsX, totalPixelStepsY);

        if (maxSteps === 0) return;

        // Hitung langkah relatif kecil per iterasi (Continuous Sub-Pixel Movement)
        const stepX = deltaX / maxSteps;
        const stepY = deltaY / maxSteps;

        // Pre-generate fasa translasi mikro per iterasi dari CoreSeeds (O(1) Memory)
        const swarmShiftTensor = AxiomGenerator.generateTranslationAxiom(
            stepX, stepY,
            CoreSeeds.X_AXIS_SEED, CoreSeeds.Y_AXIS_SEED
        );

        // Simulasi Fisika: Loop per langkah waktu hingga tujuan tercapai
        for (let step = 0; step < maxSteps; step++) {

            let anyMoved = false;

            for (let i = 0; i < u.activeCount; i++) {
                // Abaikan hantu/ruang hampa
                if (u.masses[i] === 0.0) continue;

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
                const nextPy = nextRelY * (height - 1);
                const nextPx = nextRelX * (width - 1);

                if (nextPy + ry > height - 0.5 || nextPy - ry < -0.5) continue;
                if (nextPx + rx > width - 0.5 || nextPx - rx < -0.5) continue;

                // CEK 2: Swarm Collision Check (Apakah terhalang entitas lain?)
                let blocked = false;
                for (let j = 0; j < u.activeCount; j++) {
                    if (i === j || u.masses[j] === 0.0) continue;

                    const cX2 = u.centersX[j]! * (width - 1);
                    const cY2 = u.centersY[j]! * (height - 1);
                    const rx2 = u.spansX[j]! / 2.0;
                    const ry2 = u.spansY[j]! / 2.0;

                    const overlapX = (rx + rx2) - Math.abs(nextPx - cX2);
                    const overlapY = (ry + ry2) - Math.abs(nextPy - cY2);

                    if (overlapX >= -0.01 && overlapY >= -0.01) {
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

                    anyMoved = true;
                }
            }

            // Jika pada langkah iterasi ini tidak ada satupun entitas yang bisa bergerak
            // (Semua sudah menabrak dasar/teman), maka percepat penghentian fisik.
            if (!anyMoved) break;
        }
    }
}
