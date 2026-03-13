import { Tensor, COMPLEX_DIMENSION, PHYSICS, createEmptyTensor } from '../core/config';

/**
 * ============================================================================
 * VSA CORE (Vector Symbolic Architecture) - 100% Branchless Edition
 * ============================================================================
 * Mesin kalkulus tensor untuk mengikat (Bind) dan menumpuk (Bundle) konsep.
 */
export class VSACore {
    
    /**
     * 🔗 BINDING (Kausalitas / Keterikatan)
     * Mengalikan dua gelombang kompleks (A ⊗ B).
     * Secara matematis: Menjumlahkan sudut fase mereka.
     */
    public static bind(a: Tensor, b: Tensor): Tensor {
        const res = createEmptyTensor();
        
        // Loop Rata: V8 Engine akan melakukan Auto-Vectorization (SIMD)
        for (let i = 0; i < COMPLEX_DIMENSION; i += 2) {
            const ar = a[i]!, ai = a[i+1]!;
            const br = b[i]!, bi = b[i+1]!;
            
            // Rumus Euler untuk Perkalian Kompleks (Tanpa sin/cos)
            res[i]   = (ar * br) - (ai * bi); // Komponen Real
            res[i+1] = (ar * bi) + (ai * br); // Komponen Imajiner
        }
        return res;
    }

    /**
     * ✂️ UNBINDING (Ekstraksi / Pemisahan)
     * Mengalikan dengan Konjugat Kompleks dari B (A ⊗ B^-1).
     * Secara fisik: Memundurkan gelombang B untuk melihat apa yang tersisa.
     */
    public static unbind(a: Tensor, b: Tensor): Tensor {
        const res = createEmptyTensor();
        
        for (let i = 0; i < COMPLEX_DIMENSION; i += 2) {
            const ar = a[i]!, ai = a[i+1]!;
            // KONJUGAT: Membalikkan tanda bilangan imajiner (bi menjadi -bi)
            const br = b[i]!, bi = -b[i+1]!; 
            
            res[i]   = (ar * br) - (ai * bi); 
            res[i+1] = (ar * bi) + (ai * br); 
        }
        return res;
    }

    /**
     * 🌊 BUNDLING (Superposisi Medan / Memori Jangka Panjang)
     * Menjumlahkan semua gelombang menjadi satu alam semesta memori.
     */
    public static bundle(vectors: Tensor[]): Tensor {
        const res = createEmptyTensor();
        const numVecs = vectors.length;

        for (let v = 0; v < numVecs; v++) {
            const vec = vectors[v]!;
            for (let i = 0; i < COMPLEX_DIMENSION; i++) {
                res[i] += vec[i]!;
            }
        }
        return res;
    }

    /**
     * 🛡️ STABILIZATION (Renormalisasi Kuantum - Branchless)
     * Mengembalikan amplitudo setiap dimensi ke 1.0 (Unit Circle).
     */
    public static stabilize(vec: Tensor): Tensor {
        const res = createEmptyTensor();
        
        for (let i = 0; i < COMPLEX_DIMENSION; i += 2) {
            const r = vec[i]!;
            const im = vec[i+1]!;
            
            const magSq = (r * r) + (im * im);
            
            // THE BRANCHLESS HACK: 
            // Menggunakan konstanta EPSILON (1e-15) untuk mencegah error "Dibagi Nol".
            // Tidak ada "if (magSq == 0)"! Arus instruksi CPU tidak pernah terputus.
            const invMag = 1.0 / (Math.sqrt(magSq) + PHYSICS.EPSILON);
            
            res[i]   = r * invMag;
            res[i+1] = im * invMag;
        }
        return res;
    }

    /**
     * 🎯 MEASURE COHERENCE (Interferensi / Pencocokan)
     * Seberapa mirip dua gelombang? (1.0 = Identik, 0.0 = Beda Total/Ortogonal).
     */
    public static measureCoherence(a: Tensor, b: Tensor): number {
        let dot = 0.0;
        for (let i = 0; i < COMPLEX_DIMENSION; i += 2) {
            dot += (a[i]! * b[i]!) + (a[i+1]! * b[i+1]!);
        }
        // Rata-rata dari total pasangan dimensi (COMPLEX_DIMENSION / 2)
        return dot / (COMPLEX_DIMENSION * 0.5);
    }
}
