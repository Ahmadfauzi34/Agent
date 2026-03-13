/**
 * Multi-Agent System Berbasis Gelombang (WavePacket / WaveAgent)
 * 
 * Modul ini mendemonstrasikan bagaimana agen-agen AI tidak lagi berupa objek dengan 
 * state diskrit (x, y, warna) dan logika if-else, melainkan berupa "Paket Gelombang" 
 * (WavePackets) yang berinteraksi melalui interferensi, resonansi, dan superposisi.
 * 
 * Konsep Utama:
 * 1. Setiap agen adalah fungsi gelombang kontinu (Amplitudo & Fase).
 * 2. Interaksi antar agen (tabrakan, tarik-menarik) terjadi melalui penjumlahan gelombang.
 * 3. Keputusan agen (bergerak, berubah warna) adalah hasil dari evolusi waktu (Schrödinger-like equation).
 */

// ============================================================================
// 1. UTILITAS MATEMATIKA GELOMBANG (Tanpa if-else)
// ============================================================================

/** 
 * Bilangan Kompleks untuk merepresentasikan Amplitudo dan Fase Gelombang.
 * z = a + bi = r * e^(i * theta)
 */
export interface Complex {
    re: number; // Bagian Real (Amplitudo Kosinus)
    im: number; // Bagian Imajiner (Amplitudo Sinus)
}

const addComplex = (a: Complex, b: Complex): Complex => ({
    re: a.re + b.re,
    im: a.im + b.im
});

const mulComplex = (a: Complex, b: Complex): Complex => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
});

const scaleComplex = (a: Complex, scalar: number): Complex => ({
    re: a.re * scalar,
    im: a.im * scalar
});

/** Menghitung Magnitudo (Energi) dari bilangan kompleks */
const magnitudeSq = (a: Complex): number => a.re * a.re + a.im * a.im;

// ============================================================================
// 2. WAVE AGENT / WAVE PACKET
// ============================================================================

/**
 * WaveAgent merepresentasikan satu entitas (objek/konsep) dalam ruang kontinu.
 * Ia tidak memiliki posisi diskrit (x=5, y=2), melainkan distribusi probabilitas
 * di seluruh ruang (Holographic Manifold).
 */
export class WaveAgent {
    // State gelombang agen di seluruh ruang (misal: grid 2D yang diratakan menjadi 1D)
    // Setiap titik ruang memiliki amplitudo dan fase (Complex)
    public state: Complex[];
    
    // Frekuensi karakteristik agen (identitas/warna/jenis)
    public frequency: number;

    constructor(size: number, frequency: number, initialState?: Complex[]) {
        this.frequency = frequency;
        this.state = initialState || new Array(size).fill({ re: 0, im: 0 });
    }

    /**
     * Evolusi Waktu (Time Evolution)
     * Menggerakkan agen ke masa depan berdasarkan momentum (fase) saat ini.
     * Ini menggantikan logika: input.x += velocity.x
     */
    public evolve(deltaTime: number): void {
        // Rotasi fase (e^(-i * omega * t))
        const phaseShift: Complex = {
            re: Math.cos(-this.frequency * deltaTime),
            im: Math.sin(-this.frequency * deltaTime)
        };

        // Terapkan pergeseran fase ke seluruh state gelombang
        this.state = this.state.map(val => mulComplex(val, phaseShift));
    }
}

// ============================================================================
// 3. MULTI-AGENT WAVE ENVIRONMENT (Holographic Manifold)
// ============================================================================

export class WaveEnvironment {
    private size: number;
    private agents: WaveAgent[];

    constructor(size: number) {
        this.size = size;
        this.agents = [];
    }

    public addAgent(agent: WaveAgent): void {
        this.agents.push(agent);
    }

    /**
     * Menghitung Superposisi Global (Interferensi semua agen)
     * Ini menggantikan loop pengecekan tabrakan (if objA.x == objB.x)
     */
    public getGlobalSuperposition(): Complex[] {
        let globalState = new Array(this.size).fill({ re: 0, im: 0 });

        // Jumlahkan gelombang semua agen secara linear (Prinsip Superposisi)
        for (const agent of this.agents) {
            globalState = globalState.map((val, i) => addComplex(val, agent.state[i]));
        }

        return globalState;
    }

    /**
     * Interaksi Non-Linear (Tabrakan / Reaksi Kimia / Logika)
     * Terjadi ketika energi di suatu titik ruang melebihi ambang batas tertentu.
     */
    public applyNonLinearInteraction(threshold: number): void {
        const globalState = this.getGlobalSuperposition();

        // Evaluasi energi di setiap titik ruang
        const energyField = globalState.map(val => magnitudeSq(val));

        // Fungsi aktivasi kontinu (Sigmoid-like) untuk menentukan intensitas interaksi
        // Menggantikan: if (energy > threshold) { meledak() }
        const interactionIntensity = energyField.map(e => 
            1.0 / (1.0 + Math.exp(-(e - threshold) * 10)) // Suhu rendah = transisi tajam
        );

        // Terapkan efek interaksi (misal: hamburan/scattering) kembali ke setiap agen
        // Agen yang berada di area energi tinggi (interferensi konstruktif) akan terpengaruh
        for (const agent of this.agents) {
            agent.state = agent.state.map((val, i) => {
                // Atenuasi amplitudo berdasarkan intensitas interaksi (Scattering)
                const survivalRate = 1.0 - (interactionIntensity[i] * 0.5); // Kehilangan 50% energi saat tabrakan
                return scaleComplex(val, survivalRate);
            });
        }
    }

    /**
     * Observasi (Runtuhnya Fungsi Gelombang)
     * Mengubah state gelombang kontinu menjadi probabilitas terukur (Energi).
     */
    public observe(): number[] {
        const globalState = this.getGlobalSuperposition();
        return globalState.map(val => magnitudeSq(val));
    }
}

// ============================================================================
// CONTOH PENGGUNAAN (Simulasi Multi-Agent)
// ============================================================================
/*
// 1. Buat Ruang 1D dengan 10 titik
const env = new WaveEnvironment(10);

// 2. Buat Agen A (Paket Gelombang di sisi kiri)
const agentA = new WaveAgent(10, 1.0);
agentA.state[2] = { re: 1, im: 0 }; // Puncak amplitudo di posisi 2

// 3. Buat Agen B (Paket Gelombang di sisi kanan, frekuensi berbeda)
const agentB = new WaveAgent(10, 2.0);
agentB.state[7] = { re: 1, im: 0 }; // Puncak amplitudo di posisi 7

env.addAgent(agentA);
env.addAgent(agentB);

// 4. Evolusi Waktu & Interaksi
for (let t = 0; t < 5; t++) {
    // Agen bergerak/berubah fase
    agentA.evolve(0.1);
    agentB.evolve(0.1);

    // Interaksi terjadi secara alami jika gelombang mereka tumpang tindih
    // dan energinya melebihi threshold (misal: 1.5)
    env.applyNonLinearInteraction(1.5);
}

// 5. Observasi Hasil Akhir (Distribusi Energi)
const finalEnergy = env.observe();
console.log(finalEnergy);
*/
