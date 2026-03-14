import { EntityManifold } from '../core/EntityManifold.js';
import { TensorVector, GLOBAL_DIMENSION } from '../core/config';
import { FHRR } from '../core/fhrr';

/**
 * 🧩 ENTITY SEGMENTER (Fase 2: The Perception Layer)
 * Memindahkan Holographic Stream 1D dari UniversalManifold ke dalam
 * EntityManifold raksasa (Structure of Arrays) tanpa memuja OOP.
 */
export class EntitySegmenter {

    /**
     * Membangun Cognitive Entities dari aliran spektrum 1D menggunakan konsep
     * "Attractor Basin" (Cosine Similarity Clustering) dan memuatnya ke dalam ECS Manifold.
     *
     * @param stream Map kunci spasial -> Vektor partikel
     * @param manifold Buffer SoA raksasa (Pre-allocated Array)
     * @param similarityThreshold Batas kemiripan (0.0 - 1.0) untuk menggabungkan dua partikel.
     */
    public segmentStream(stream: Map<string, TensorVector>, manifold: EntityManifold, similarityThreshold: number = 0.85): void {
        const entries = Array.from(stream.entries());
        const visited = new Set<string>();

        // Parsing ID kunci (x,y_tToken)
        const parseKey = (key: string) => {
            const parts = key.split('_t');
            const coords = parts[0]!.split(',');
            return { x: parseInt(coords[0]!), y: parseInt(coords[1]!), token: parseInt(parts[1]!) };
        };

        let entityCounter = 1;

        for (let i = 0; i < entries.length; i++) {
            const [keyA, tensorA] = entries[i]!;

            // ✅ GUNAKAN CONTINUE (V8 Optimized Control Flow)
            if (visited.has(keyA)) continue;

            const parsedA = parseKey(keyA);

            // Track bounding box (Min/Max X/Y) menggunakan Math Branchless
            let minX = parsedA.x;
            let maxX = parsedA.x;
            let minY = parsedA.y;
            let maxY = parsedA.y;

            // ✅ ECS ALLOCATION: Dosa Ke-4 Dihapus (Tidak ada array.push/object statis)
            const eIndex = manifold.allocateEntity();

            // ✅ ZERO-IF Fallback jika Memory Pool penuh (Bypass the loop instead of crashing)
            if (eIndex < 0) break; // Overflow perlindungan untuk 500 agen maksimal

            // Pointer ke Float32Array
            const eTensor = manifold.getTensor(eIndex);

            // Inisialisasi entitas langsung ke Manifold Buffer
            manifold.ids[eIndex] = `E_${entityCounter++}`;
            manifold.tokens[eIndex] = parsedA.token;
            manifold.masses[eIndex] = 1.0;

            // Inisialisasi tensor awal
            this.addVectorInPlace(eTensor, tensorA);
            visited.add(keyA);

            let sumX = parsedA.x;
            let sumY = parsedA.y;
            let membersCount = 1;

            // Cari tetangga yang beresonansi (Clustering berdasar Phase Vector, BUKAN spasial)
            for (let j = i + 1; j < entries.length; j++) {
                const [keyB, tensorB] = entries[j]!;

                if (visited.has(keyB)) continue;

                // Hitung interferensi/kemiripan tensor
                const sim = FHRR.similarity(eTensor, tensorB);

                // ✅ Control Flow
                if (sim >= similarityThreshold) {
                    this.addVectorInPlace(eTensor, tensorB);
                    visited.add(keyB);

                    const parsedB = parseKey(keyB);
                    sumX += parsedB.x;
                    sumY += parsedB.y;
                    membersCount++;
                    manifold.masses[eIndex] += 1.0; // Branchless ALU Addition

                    // Math Branchless untuk Spread Spatial Bounding Box
                    minX = Math.min(minX, parsedB.x);
                    maxX = Math.max(maxX, parsedB.x);
                    minY = Math.min(minY, parsedB.y);
                    maxY = Math.max(maxY, parsedB.y);
                }
            }

            // Hitung penyebaran spasial (luas bounding box + 1)
            manifold.spreads[eIndex] = (maxX - minX + 1) * (maxY - minY + 1);

            // Hitung Center of Mass rata-rata
            manifold.centersX[eIndex] = sumX / membersCount;
            manifold.centersY[eIndex] = sumY / membersCount;

            // L2 Normalization (V8 SIMD Epsilon branchless math)
            manifold.normalizeL2(eIndex);
        }
    }

    private addVectorInPlace(target: TensorVector, source: TensorVector): void {
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            target[i] += source[i]!;
        }
    }
}