import { UniversalManifold, EntitySegmenter, HologramDecoder } from './perception';
import { TopologicalAligner, WaveDynamics, HamiltonianPruner } from './reasoning';
import { HolographicManifold, LogicSeedBank } from './memory';
import { Task } from './shared';
import { PDRLogger, LogLevel } from './reasoning/level1-pdr/pdr-debug';
import { CognitiveEntity } from './core/CognitiveEntity';
import { TensorVector, GLOBAL_DIMENSION } from './core/config';

/**
 * 🤖 THE RECURSIVE REASONING MACHINE (Fase 5: Sang Orkestrator)
 * Siklus termodinamika murni yang menggantikan seluruh pendekatan heuristik kaku (If-Else Level).
 * Menggunakan Loop: PERCEIVE -> RESONATE -> EVOLVE -> COLLAPSE
 */
export class RRM_Agent {
    private perceiver = new UniversalManifold();
    private segmenter = new EntitySegmenter();
    private aligner = new TopologicalAligner();
    private waveDynamics = new WaveDynamics();
    private pruner = new HamiltonianPruner();
    private decoder: HologramDecoder;
    private seedBank: LogicSeedBank;

    constructor() {
        const memoryManifold = new HolographicManifold();
        this.seedBank = new LogicSeedBank(memoryManifold);
        this.decoder = new HologramDecoder(this.perceiver);
        PDRLogger.setLevel(LogLevel.INFO);
    }

    /**
     * Muat panen ingatan massal (JSON) ke dalam VSA Seed Bank sebelum mengerjakan task.
     */
    public loadHarvestedMemories(jsonArray: any[]): void {
        this.seedBank.loadHarvestedSeeds(jsonArray);
    }

    /**
     * Memproses satu teka-teki penuh (ARC / NLP) murni berdasarkan sinyal spektral.
     * @returns Output grid/sequence hasil collapse tensor, atau null jika gagal.
     */
    public async solveTask(task: Task, log: (msg: string) => void): Promise<number[][] | number[] | null> {
        log(`\n🌌 RRM QUANTUM CYCLE: ${task.name || 'Unknown_Anomaly'}`);

        // 1. =======================================================
        // 👁️ THE PERCEIVE PHASE
        // Meratakan dimensi fisik menjadi entitas agnostik
        // =======================================================
        log(`   [1] PERCEIVE: Memindai semesta ke dalam Cognitive Entities...`);
        const trainStates: { in: CognitiveEntity[], out: CognitiveEntity[] }[] = [];

        for (const pair of task.train) {
            const inStream = this.perceiver.encodeAgnosticInput(pair.input);
            const outStream = this.perceiver.encodeAgnosticInput(pair.output);

            // Segmentasi berdasarkan kemiripan vektor (bukan geometri spasial)
            const inEntities = this.segmenter.segmentStream(inStream, 0.85);
            const outEntities = this.segmenter.segmentStream(outStream, 0.85);

            trainStates.push({ in: inEntities, out: outEntities });
        }

        // Test state (Kita hanya bisa melihat inputnya)
        const testStream = this.perceiver.encodeAgnosticInput(task.test[0]!.input);
        const testEntities = this.segmenter.segmentStream(testStream, 0.85);

        // 2. =======================================================
        // 🎼 THE RESONATE PHASE
        // Mencari hubungan sebab-akibat (Hukum Fisika Kuantum) via Hungarian Matching
        // =======================================================
        log(`   [2] RESONATE: Mencocokkan jejak Topologis dan mengikat Kausalitas...`);

        // Membaca pergerakan dari seluruh pengalaman training
        for (let i = 0; i < trainStates.length; i++) {
            const state = trainStates[i]!;

            // 2A. DETEKSI ENTANGLEMENT MULTI-AGENT (Spatial & Semantic Overlap)
            // Tanpa if-else spasial, kita mengukur kesamaan murni antar entitas di ruang tensor
            for (let a = 0; a < state.in.length; a++) {
                for (let b = a + 1; b < state.in.length; b++) {
                    const entA = state.in[a]!;
                    const entB = state.in[b]!;

                    // Cosine Similarity Tensor
                    let dot = 0, magA = 0, magB = 0;
                    for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                        dot += entA.tensor[d]! * entB.tensor[d]!;
                        magA += entA.tensor[d]! * entA.tensor[d]!;
                        magB += entB.tensor[d]! * entB.tensor[d]!;
                    }
                    const sim = dot / Math.sqrt((magA * magB) || 1);

                    // Gating Kuantum: Jika similarity > 0.85, terikat.
                    // (Kita gunakan simple if di sini untuk control flow registrasi map)
                    if (sim > 0.85) {
                        this.waveDynamics.createEntanglement(entA.id, entB.id);
                        this.waveDynamics.createEntanglement(entB.id, entA.id); // Mutual entanglement
                    }
                }
            }

            // 2B. HUNGARIAN MATCHING & HUKUM FISIKA
            const alignments = this.aligner.align(state.in, state.out);

            for (const match of alignments) {
                if (match.deltaTensor && match.similarity > 0.7) {
                    // Coba kenali DeltaTensor ini dengan memori yang pernah dipanen sebelumnya (Resonance Search)
                    const knownMemory = this.seedBank.findBestMatch(match.deltaTensor);

                    if (knownMemory && knownMemory.coherence > 0.85) {
                        // Jika memori dikenali kuat (Crosstalk/Coherence > 85%), gunakan Hukum Asli yang ortogonal
                        log(`      [Resonance] Pergerakan dikenali sebagai: ${knownMemory.name} (Kemiripan: ${(knownMemory.coherence * 100).toFixed(2)}%)`);
                        this.pruner.injectHypothesis(knownMemory.name, knownMemory.phasor, 1.0, 0.05);
                    } else {
                        // Jika fenomena ini benar-benar baru, suntikkan sebagai hipotesis mentah yang lebih rapuh (decay rate lebih tinggi)
                        const ruleId = `LAW_NEW_TRAIN_${i}_${match.source.id}`;
                        this.pruner.injectHypothesis(ruleId, match.deltaTensor, 1.0, 0.3);
                    }
                }
            }
        }

        // 3. =======================================================
        // 🔥 THE EVOLVE PHASE
        // Menjalankan waktu. Aturan yang tidak konsisten akan meluruh (MDL Decay).
        // =======================================================
        log(`   [3] EVOLVE: Menjalankan termodinamika. Menyaring hipotesis paralel...`);

        const MAX_STEPS = 10;
        for (let step = 1; step <= MAX_STEPS; step++) {
            // Simulasi aliran waktu membusukkan tebakan yang tidak didukung
            this.pruner.evolveTime(1.0);

            // (Logika Pemicu Reinforcement: Jika delta test cocok dengan sisa rule, perkuat)
            // Saat ini kita biarkan hukum peluruhan menyingkirkan noise
        }

        const survivingRules = this.pruner.getSurvivingRules();
        const rulesCount = survivingRules.length;

        // Logika Index Boolean bebas IF-ELSE untuk logging
        const statusMessages = [
            `   💀 EVOLVE GAGAL: Semua hipotesis musnah dilanda Entropi Kuantum.`,
            `   🌟 EVOLVE BERHASIL: Tersisa ${rulesCount} Hukum Alam (Axiom) yang kebal dari Entropi.`
        ];
        log(statusMessages[Number(rulesCount > 0)]!);

        // Jika tidak ada rule yang selamat, agen menyerah.
        if (rulesCount === 0) return null;

        // 4. =======================================================
        // 🌌 THE COLLAPSE PHASE
        // Meruntuhkan probabilitas gelombang menjadi realitas absolut (Output Prediksi)
        // =======================================================
        log(`   [4] COLLAPSE: Mengaplikasikan Axiom ke realitas Test...`);

        // Mapping id -> entity untuk rujukan instan Entanglement
        const testEntitiesMap = new Map<string, CognitiveEntity>();
        testEntities.forEach(e => testEntitiesMap.set(e.id, e));

        // Terapkan medan Wave Gravity ke Test Entities
        for (const testEntity of testEntities) {
            // Tarik tensor test menggunakan sisa-sisa aturan yang selamat
            const attractors = survivingRules.map(r => r.tensor_rule);
            this.waveDynamics.applyWaveGravity(testEntity, attractors, []);

            // Picu efek domino: Jika agen ini berubah, yang terikat dengannya dipaksa ikut berubah
            this.waveDynamics.triggerCollapse(testEntity, testEntitiesMap);
        }

        // Mengambil ukuran asli test grid (Jika 2D) untuk re-render
        // Kita gunakan logika agnostik untuk resolusi (mencari max X dan Y dari input asli)
        const testInput = task.test[0]!.input;
        const is2D = Array.isArray(testInput[0]);

        if (is2D) {
            const grid = testInput as number[][];
            const height = grid.length;
            const width = grid[0]?.length || 0;

            // Membundle (Superposisi) seluruh entitas tes menjadi satu Tensor Semesta
            const universeTensor = new Float32Array(GLOBAL_DIMENSION);
            for (const entity of testEntities) {
                for (let d = 0; d < GLOBAL_DIMENSION; d++) {
                    universeTensor[d] += entity.tensor[d]!;
                }
            }

            // Menerapkan Runtuhan Gelombang Kuantum (Quantum Collapse)
            const collapsedGrid = this.decoder.collapseToGrid(universeTensor, width, height, 0.4);

            log(`   ✅ REALITAS TERBENTUK: Grid (${width}x${height}) dirender ulang dari superposisi kuantum secara branchless.`);
            return collapsedGrid;
        } else {
            // Placeholder untuk token 1D jika diperlukan
            return testInput;
        }
    }
}