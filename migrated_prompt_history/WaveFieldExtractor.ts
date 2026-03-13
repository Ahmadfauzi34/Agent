import { CognitiveEntity, createEntity } from '../core/CognitiveEntity';
import { UniversalManifold } from './UniversalManifold';
import { PHYSICS } from '../core/config';

export class WaveFieldExtractor {
    private manifold: UniversalManifold;

    constructor() {
        this.manifold = new UniversalManifold();
    }

    /**
     * Menganalisa seluruh Medan Data (Grid atau Teks) dan merangkumnya menjadi Entitas.
     * Sepenuhnya Branchless (Tanpa If-Else untuk logika spasial).
     */
    public extractEntity(
        id: string, 
        targetToken: number, 
        flatData: Float32Array, 
        width: number, 
        height: number
    ): CognitiveEntity {
        
        let totalMass = 0.0;
        let sumX = 0.0;
        let sumY = 0.0;

        let minX = width;
        let maxX = 0;
        let minY = height;
        let maxY = 0;

        // --- THE BRANCHLESS LOOP ---
        // V8 Engine akan mengeksekusi ini dalam kecepatan SIMD karena tidak ada percabangan
        for (let i = 0; i < flatData.length; i++) {
            const val = flatData[i]!;
            
            // 1. MATHEMATICAL GATING
            // Jika val == targetToken, mask = 1. Jika tidak, mask = 0.
            const mask = Number(val === targetToken);

            const x = i % width;
            const y = Math.trunc(i / width);

            // 2. AKUMULASI MASSA & POSISI (Yang bukan target otomatis dikali 0)
            totalMass += mask;
            sumX += x * mask;
            sumY += y * mask;

            // 3. BOUNDING BOX BERBASIS MATH MIN/MAX (Tanpa If-Else)
            // Memanipulasi angka agar yang masuk hitungan hanya yang memiliki mask = 1
            // Jika mask = 0, kita beri nilai ekstrem yang pasti diabaikan oleh Math.min/max
            const activeX_Min = x * mask + width * (1 - mask);
            const activeY_Min = y * mask + height * (1 - mask);
            const activeX_Max = x * mask;
            const activeY_Max = y * mask;

            minX = Math.min(minX, activeX_Min);
            maxX = Math.max(maxX, activeX_Max);
            minY = Math.min(minY, activeY_Min);
            maxY = Math.max(maxY, activeY_Max);
        }

        // --- NORMALISASI ABSOLUT KE RELATIF ---
        // Menggunakan PHYSICS.EPSILON untuk mencegah Division by Zero tanpa if(mass == 0)
        const safeMass = totalMass + PHYSICS.EPSILON;
        const absCx = sumX / safeMass;
        const absCy = sumY / safeMass;

        const relCx = absCx / (width - 1 + PHYSICS.EPSILON);
        const relCy = absCy / (height - 1 + PHYSICS.EPSILON);

        // Lebar & Tinggi Spasial
        const spreadX = (maxX - minX + 1) * Number(totalMass > 0);
        const spreadY = (maxY - minY + 1) * Number(totalMass > 0);

        // --- PEMBENTUKAN ENTITAS ---
        const entity = createEntity(id, targetToken);
        entity.mass = totalMass;
        entity.spread = Math.max(spreadX, spreadY);
        entity.rel_center = { x: relCx, y: relCy };
        
        // Panggil Manifold untuk membangkitkan State Vector (Hologram)
        entity.state_vector = this.manifold.encodeState(targetToken, relCx, relCy, totalMass);

        return entity;
    }
}
