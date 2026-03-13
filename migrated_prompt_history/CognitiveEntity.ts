import { Tensor, createEmptyTensor } from './config';

/**
 * ============================================================================
 * COGNITIVE ENTITY (The Agnostic Particle)
 * ============================================================================
 * Representasi universal dari objek apapun (Piksel, Kata, Karakter, dll).
 */
export interface CognitiveEntity {
    // --- 1. IDENTITAS (Ontology) ---
    id: string;                  // KTP Unik (misal: "Token7_Island1" atau "VarX_Line5")
    token: number | string;      // Nilai atomik (Warna 0-9 untuk ARC, ASCII untuk Teks)
    
    // --- 2. PROPERTI FISIK (Morfologi) ---
    mass: number;                // Amplitudo: Jumlah piksel atau panjang string
    spread: number;              // Jangkauan spasial (Bounding box max dimension)
    
    // --- 3. KINEMATIKA & RUANG (Posisi Agnostik) ---
    // Semuanya dinormalisasi (0.0 - 1.0) agar kebal terhadap perubahan ukuran layar/halaman
    rel_center: { 
        x: number, 
        y: number 
    };
    momentum: { 
        dx: number, 
        dy: number 
    };
    
    // --- 4. RELASI KUANTUM (Entanglement) ---
    // Menyimpan ID entitas lain yang nasibnya terikat dengan entitas ini
    entangled_with: Set<string>; 

    // --- 5. REPRESENTASI HOLOGRAFIK (The Wave State) ---
    // Ini adalah Vektor 8192-D yang merangkum semua informasi di atas
    state_vector: Tensor;

    // --- 6. DATA MENTAH (Untuk Decoding/Rendering) ---
    // (Opsional) Menyimpan posisi absolut aslinya hanya untuk keperluan 
    // menggambar ulang ke layar di akhir proses. Tidak dipakai untuk bernalar.
    raw_footprint?: any; 
}

/**
 * Pabrik penciptaan entitas baru (Genesis)
 */
export function createEntity(id: string, token: number | string): CognitiveEntity {
    return {
        id,
        token,
        mass: 0,
        spread: 0,
        rel_center: { x: 0, y: 0 },
        momentum: { dx: 0, dy: 0 },
        entangled_with: new Set<string>(),
        state_vector: createEmptyTensor(),
    };
}
