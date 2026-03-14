import { UniversalManifold, EntitySegmenter, HologramDecoder } from './perception';
import { TopologicalAligner, WaveDynamics, HamiltonianPruner } from './reasoning/index.js';
import { GlobalBlackboard } from './reasoning/GlobalBlackboard.js';
import { HolographicManifold, LogicSeedBank } from './memory/index.js';
import { Task } from './shared/index.js';
import { PDRLogger, LogLevel } from './reasoning/level1-pdr/pdr-debug.js';
import { CognitiveEntity } from './core/CognitiveEntity.js';
import { TensorVector, GLOBAL_DIMENSION } from './core/config.js';

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
    private blackboard = new GlobalBlackboard();
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

            // 2A. DETEKSI ENTANGLEMENT MULTI-AGENT (Hebbian Learning Branchless)
            this.waveDynamics.initializeEntities(state.in);

            // Evolve entanglement berdasarkan interaksi antar agen (Otomatis tanpa if-else)
            this.waveDynamics.evolveEntanglement(0.2);

            // 2B. KESADARAN KOLEKTIF (Superposisi state seluruh entitas)
            // Semua agen menyatukan pikirannya ke GlobalBlackboard
            const agentTensors = state.in.map(e => e.tensor);
            this.blackboard.synchronize(agentTensors);

            // 2C. HUNGARIAN MATCHING & HUKUM FISIKA
            const alignments = this.aligner.align(state.in, state.out);

            for (const match of alignments) {
                // Melonggarkan Threshold agar pergerakan ekstrem bisa terekam
                // Menurunkan batas keyakinan dari 0.7 ke 0.4
                const isValidDelta = !!match.deltaTensor && match.similarity > 0.4;

                isValidDelta && (() => {
                    // Coba kenali DeltaTensor ini dengan memori yang pernah dipanen sebelumnya (Resonance Search)
                    const knownMemory = this.seedBank.findBestMatch(match.deltaTensor!);

                    // Melonggarkan Memory Matching dari 0.85 ke 0.75
                    const isRecognized = !!knownMemory && knownMemory.coherence > 0.75;

                    isRecognized && (() => {
                        // Jika memori dikenali kuat, gunakan Hukum Asli yang ortogonal
                        log(`      [Resonance] Pergerakan dikenali sebagai: ${knownMemory!.name} (Kemiripan: ${(knownMemory!.coherence * 100).toFixed(2)}%)`);
                        this.pruner.injectHypothesis(knownMemory!.name, knownMemory!.phasor, 1.0, 0.01); // Menurunkan decay dari 0.05 ke 0.01 agar tidak cepat mati
                    })();

                    (!isRecognized) && (() => {
                        // Jika fenomena ini benar-benar baru, suntikkan sebagai hipotesis mentah yang lebih rapuh
                        const ruleId = `LAW_NEW_TRAIN_${i}_${match.source.id}`;
                        this.pruner.injectHypothesis(ruleId, match.deltaTensor!, 1.0, 0.1); // Menurunkan decay dari 0.3 ke 0.1
                    })();
                })();
            }
        }

        // 3. =======================================================
        // 🔥 THE EVOLVE PHASE
        // Menjalankan waktu. Aturan yang tidak konsisten akan meluruh (MDL Decay).
        // =======================================================
        log(`   [3] EVOLVE: Menjalankan termodinamika. Menyaring hipotesis paralel...`);

        const MAX_STEPS = 10;
        for (let step = 1; step <= MAX_STEPS; step++) {
            // Memperlambat laju entropi dari 1.0 ke 0.5 agar hipotesis punya kesempatan bertahan
            this.pruner.evolveTime(0.5);
        }

        const survivingRules = this.pruner.getSurvivingRules();
        const rulesCount = survivingRules.length;

        // Logika Index Boolean bebas IF-ELSE untuk logging
        const statusMessages = [
            `   💀 EVOLVE GAGAL: Semua hipotesis musnah dilanda Entropi Kuantum.`,
            `   🌟 EVOLVE BERHASIL: Tersisa ${rulesCount} Hukum Alam (Axiom) yang kebal dari Entropi.`
        ];
        log(statusMessages[Number(rulesCount > 0)]!);

        // Array simulasi return untuk zero-if logic
        let finalResult: number[][] | number[] | null = null;
        const hasSurvivingRules = rulesCount > 0;

        // 4. =======================================================
        // 🌌 THE COLLAPSE PHASE
        // Meruntuhkan probabilitas gelombang menjadi realitas absolut (Output Prediksi)
        // Hanya dijalankan jika ada rules (hasSurvivingRules == true)
        // =======================================================
        hasSurvivingRules && (() => {
            log(`   [4] COLLAPSE: Mengaplikasikan Axiom ke realitas Test...`);

            // Terapkan medan Wave Gravity ke Test Entities
            this.waveDynamics.initializeEntities(testEntities);
            this.waveDynamics.evolveEntanglement(0.2); // Sinkronisasi state awal tes

            // Contextualize dengan memori kolektif yang sudah dibangun saat training
            const collectiveState = this.blackboard.readCollectiveState();

            for (let i = 0; i < testEntities.length; i++) {
                const testEntity = testEntities[i]!;

                // Sadarkan agen akan state kolektif
                const contextualizedTensor = this.blackboard.contextualizeAgent(testEntity.tensor);

                // Tarik tensor test menggunakan sisa-sisa aturan yang selamat dan memori kolektif
                const attractors = survivingRules.map(r => r.tensor_rule);
                attractors.push(contextualizedTensor); // Atraktor tambahan dari consciousness

                this.waveDynamics.applyWaveGravity(testEntity, attractors, []);

                // Picu efek domino: Jika agen ini berubah, agen yang terikat ikut terpengaruh proporsional (branchless)
                this.waveDynamics.triggerCollapse(i);
            }

            // Mengambil ukuran asli test grid (Jika 2D) untuk re-render
            // Kita gunakan logika agnostik untuk resolusi (mencari max X dan Y dari input asli)
            const testInput = task.test[0]!.input;
            const is2D = Array.isArray(testInput[0]);

            is2D && (() => {
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
                finalResult = this.decoder.collapseToGrid(universeTensor, width, height, 0.4);

                log(`   ✅ REALITAS TERBENTUK: Grid (${width}x${height}) dirender ulang dari superposisi kuantum secara branchless.`);
            })();

            (!is2D) && (() => {
                // Placeholder untuk token 1D jika diperlukan
                finalResult = testInput;
            })();
        })();

        // Resolve return menggunakan zero-if logic fallback
        return finalResult;
    }
}