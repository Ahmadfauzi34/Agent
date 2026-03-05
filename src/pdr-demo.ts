import { PDRCoreWeightless } from './pdr/pdr-core';

// Inisialisasi PDR (Dimensi 16)
const DIMENSION = 16;
const pdr = new PDRCoreWeightless(DIMENSION);

// Mock Input: Grid 2D (Array of Arrays)
// Skenario:
// Baris 0: Pola Periodik (Resonansi Kuat) -> [1, 0, 1, 0, 1, 0...]
// Baris 6: Objek Tunggal (Singularitas)
const inputGrid: number[][] = [
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // Index 0: Pola Periodik (Freq PMR Tinggi)
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Index 1: Kosong
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // Index 2: Pola Periodik (Repetisi)
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Index 3: Kosong
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // Index 4: Pola Periodik (Repetisi)
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Index 5: Kosong
    [0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0], // Index 6: Singularitas (Objek Kuat)
];

console.log("🚀 MENGAKTIFKAN PDR CORE (PRIMAL-DUAL RESONANCE)...\n");

const results = pdr.solve(inputGrid);

results.forEach(res => console.log(`✅ ${res}`));

if (results.length === 0) {
    console.log("⚠️ Tidak ada resonansi atau singularitas yang terdeteksi.");
} else {
    console.log("\n🏆 PDR Core Berhasil Mendeteksi Struktur Data!");
}
