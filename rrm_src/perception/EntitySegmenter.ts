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
            if (visited.has(keyA)) continue;

            // Buat Entitas Baru
            const newEntity: CognitiveEntity = {
                id: `E_${entityCounter++}`,
                mass: 1, // 1 partikel awal
                center_rel: { x: 0, y: 0 },
                tensor: new Float32Array(GLOBAL_DIMENSION),
                entanglement_status: 0
            };

            // Inisialisasi tensor dan massa
            this.addVectorInPlace(newEntity.tensor, tensorA);
            visited.add(keyA);

            const parsedA = parseKey(keyA);
            let sumX = parsedA.x;
            let sumY = parsedA.y;
            let membersCount = 1;

            // Cari tetangga yang "Ber-resonansi" (punya kemiripan tinggi dengan inti entitas ini)
            // Di sini kita tidak bergantung pada Flood-Fill (BFS) X/Y murni,
            // melainkan pada "Kemiripan Tensor" (Semantic Clustering).
            for (let j = i + 1; j < entries.length; j++) {
                const [keyB, tensorB] = entries[j]!;
                if (visited.has(keyB)) continue;

                // Hitung interferensi/kemiripan tensor
                const sim = FHRR.similarity(newEntity.tensor, tensorB);

                // Tanpa IF-ELSE percabangan untuk fungsionalitas, kita bisa pakai multiplier logic
                // Namun karena loop clustering adalah heuristik pembentukan awal, kita gunakan if dasar
                if (sim >= similarityThreshold) {
                    // Partikel ditarik ke dalam Basin Entitas ini
                    this.addVectorInPlace(newEntity.tensor, tensorB);
                    visited.add(keyB);

                    const parsedB = parseKey(keyB);
                    sumX += parsedB.x;
                    sumY += parsedB.y;
                    membersCount++;
                    newEntity.mass++;
                }
            }

            // Hitung Center of Mass rata-rata
            newEntity.center_rel = {
                x: sumX / membersCount,
                y: sumY / membersCount
            };

            // Normalisasi Superposisi agar tidak meledak (L2 Norm)
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
        const mag = Math.sqrt(magSq);
        if (mag > 1e-12) {
            for (let i = 0; i < GLOBAL_DIMENSION; i++) v[i] /= mag;
        }
    }
}