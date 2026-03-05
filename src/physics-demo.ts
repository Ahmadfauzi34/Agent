import { ZRouter } from './arc/ZRouter';
import { IdentityBridge } from './arc/IdentityBridge';

// Inisialisasi dengan dimensi kecil untuk demo (16 piksel)
const DIMENSION = 16;
const router = new ZRouter(DIMENSION);
const bridge = new IdentityBridge();

// Mock Input: Grid 1D (Array of Arrays)
// Skenario: Objek Titik (Impuls) muncul di index 0, 2, 4 (Irama = 2)
// Ini mensimulasikan partikel/objek kecil yang bergerak
const inputGrid: number[][] = [
    [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Index 0: Impuls (Spat PMR Tinggi)
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Index 1: Kosong
    [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Index 2: Impuls (Repetisi)
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Index 3: Kosong
    [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Index 4: Impuls (Repetisi)
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Index 5: Kosong
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], // Index 6: Noise Frekuensi Tinggi
];

console.log("🚀 MENGAKTIFKAN AGEN FISIKA (PHYSICS INSTINCT)...\n");

inputGrid.forEach((row, idx) => {
    // 1. Filter Noise (Spectral Z-Router)
    const report = router.analyze(row);
    
    // Log detail PMR untuk debug
    const status = report.isValid ? "✅ VALID" : "❌ NOISE";
    console.log(`Row ${idx}: ${status} | Freq PMR: ${report.freqPMR.toFixed(2)} | Spat PMR: ${report.spatPMR.toFixed(2)}`);
    
    if (!report.isValid) return;

    // 2. Jika Valid, cari relasi (Identity Bridge)
    const connections = bridge.findConnections(inputGrid, idx);
    
    // Kita hanya tertarik jika ada lebih dari 1 kemunculan (pola berulang)
    // Dan kita hanya memproses kejadian terakhir untuk prediksi masa depan
    if (connections.length > 1) {
       const rhythm = bridge.detectRhythm(connections);
       
       // Hanya log jika ini adalah bagian dari sequence yang sedang berjalan (bukan masa lalu)
       // Untuk demo ini, kita log semua yang punya ritme
       if (rhythm > 0) {
           console.log(`   🔗 Terdeteksi Pola Berulang! Irama: ${rhythm} baris.`);
           console.log(`   📍 Posisi Ditemukan: [${connections.map(c => c.index).join(', ')}]`);
           
           // 3. PREDIKSI (Symbolic Projection)
           const lastPos = connections[connections.length-1].index;
           
           // Hanya prediksi jika kita berada di ujung sequence
           if (idx === lastPos) {
               const nextPos = lastPos + rhythm;
               console.log(`   🔮 PREDIKSI MASA DEPAN: Objek berikutnya HARUS muncul di baris ${nextPos}`);
           }
       }
    }
});
