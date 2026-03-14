import { CognitiveEntity } from '../core/CognitiveEntity';
import { TensorVector, GLOBAL_DIMENSION } from '../core/config';
import { FHRR } from '../core/fhrr';

/**
 * 🧩 ENTITY SEGMENTER (Fase 2: The Perception Layer)
 * Mengubah Holographic Stream 1D dari UniversalManifold menjadi
 * objek-objek CognitiveEntity diskrit.
 * Ini adalah pengganti dari "ObjectSegmenter" ARC lama yang sangat spesifik 2D.
 */
export class EntitySegmenter {

    /**
     * Membangun Cognitive Entities dari aliran spektrum 1D menggunakan konsep
     * "Attractor Basin" (Cosine Similarity Clustering).
     *
     * @param stream Map kunci spasial -> Vektor partikel
     * @param similarityThreshold Batas kemiripan (0.0 - 1.0) untuk menggabungkan dua partikel menjadi satu entitas.
     * @returns Array dari CognitiveEntity agnostik
     */
    public segmentStream(stream: Map<string, TensorVector>, similarityThreshold: number = 0.85): CognitiveEntity[] {
        const entities: CognitiveEntity[] = [];
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

            // Track bounding box (Min/Max X/Y) menggunakan Zero If-Else (Math Branchless sejati)
            let minX = parsedA.x;
            let maxX = parsedA.x;
            let minY = parsedA.y;
            let maxY = parsedA.y;

            // Buat Entitas Baru
            const newEntity: CognitiveEntity = {
                id: `E_${entityCounter++}`,
                token: parsedA.token, // Kunci klasifikasi fisik
                mass: 1, // 1 partikel awal
                spread: 1, // Luas bounding box awal
                center_rel: { x: 0, y: 0 },
                momentum: { dx: 0, dy: 0 }, // Inisialisasi keadaan diam
                tensor: new Float32Array(GLOBAL_DIMENSION),
                entanglement_status: 0.0 // Skalar kontinu (Siap untuk Hebbian Matrix)
            };

            // Inisialisasi tensor dan massa
            this.addVectorInPlace(newEntity.tensor, tensorA);
            visited.add(keyA);

            let sumX = parsedA.x;
            let sumY = parsedA.y;
            let membersCount = 1;

            // Cari tetangga yang "Ber-resonansi" (punya kemiripan tinggi dengan inti entitas ini)
            for (let j = i + 1; j < entries.length; j++) {
                const [keyB, tensorB] = entries[j]!;

                // ✅ GUNAKAN CONTINUE (V8 Optimized Control Flow)
                if (visited.has(keyB)) continue;

                // Hitung interferensi/kemiripan tensor
                const sim = FHRR.similarity(newEntity.tensor, tensorB);

                // ✅ GUNAKAN IF BIASE: Ini adalah Control Flow, bukan Tensor Math
                if (sim >= similarityThreshold) {
                    // Partikel ditarik ke dalam Basin Entitas ini
                    this.addVectorInPlace(newEntity.tensor, tensorB);
                    visited.add(keyB);

                    const parsedB = parseKey(keyB);
                    sumX += parsedB.x;
                    sumY += parsedB.y;
                    membersCount++;
                    newEntity.mass++;

                    // Math Branchless untuk Spread (Sangat cepat di ALU)
                    minX = Math.min(minX, parsedB.x);
                    maxX = Math.max(maxX, parsedB.x);
                    minY = Math.min(minY, parsedB.y);
                    maxY = Math.max(maxY, parsedB.y);
                }
            }

            // Hitung penyebaran spasial (luas bounding box + 1)
            newEntity.spread = (maxX - minX + 1) * (maxY - minY + 1);

            // Hitung Center of Mass rata-rata
            newEntity.center_rel = {
                x: sumX / membersCount,
                y: sumY / membersCount
            };

            // L2 Normalization (Dengan Math Branchless Trick Epsilon)
            this.normalizeInPlace(newEntity.tensor);

            entities.push(newEntity);
        }

        return entities;
    }

    private addVectorInPlace(target: TensorVector, source: TensorVector): void {
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            target[i] += source[i]!;
        }
    }

    private normalizeInPlace(v: TensorVector): void {
        let magSq = 0;
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            magSq += v[i]! * v[i]!;
        }

        // Menggunakan EPSILON agar tidak perlu if (mag > 0)
        // Ini adalah contoh Math Branchless sejati!
        const invMag = 1.0 / (Math.sqrt(magSq) + 1e-15);
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            v[i] *= invMag;
        }
    }
}