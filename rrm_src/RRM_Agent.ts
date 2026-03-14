import { UniversalManifold, EntitySegmenter, HologramDecoder } from './perception';
import { TopologicalAligner, WaveDynamics, HamiltonianPruner } from './reasoning/index.js';
import { GlobalBlackboard } from './reasoning/GlobalBlackboard.js';
import { HolographicManifold, LogicSeedBank } from './memory/index.js';
import { Task } from './shared/index.js';
import { PDRLogger, LogLevel } from './shared/logger.js';
import { EntityManifold } from './core/EntityManifold.js';
import { TensorVector, GLOBAL_DIMENSION } from './core/config.js';

/**
 * 🤖 THE RECURSIVE REASONING MACHINE (Fase 5: Sang Orkestrator)
 * Siklus termodinamika murni yang menggantikan seluruh pendekatan heuristik kaku.
 * Menggunakan Loop ECS: PERCEIVE -> RESONATE -> EVOLVE -> COLLAPSE
 */
export class RRM_Agent {
    private perceiver = new UniversalManifold();
    private segmenter = new EntitySegmenter();
    private aligner = new TopologicalAligner(this.perceiver);
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
        // Meratakan dimensi fisik menjadi entitas ECS (EntityManifold)
        // =======================================================
        log(`   [1] PERCEIVE: Memindai semesta ke dalam Entity Manifolds (SoA)...`);
        const trainStates: { in: EntityManifold, out: EntityManifold }[] = [];

        for (const pair of task.train) {
            const inStream = this.perceiver.encodeAgnosticInput(pair.input);
            const outStream = this.perceiver.encodeAgnosticInput(pair.output);

            const inManifold = new EntityManifold();
            const outManifold = new EntityManifold();

            // Segmentasi otomatis memasukkan data ke buffer ECS linier
            this.segmenter.segmentStream(inStream, inManifold, 0.85);
            this.segmenter.segmentStream(outStream, outManifold, 0.85);

            trainStates.push({ in: inManifold, out: outManifold });
        }

        // Test state
        const testStream = this.perceiver.encodeAgnosticInput(task.test[0]!.input);
        const testManifold = new EntityManifold();
        this.segmenter.segmentStream(testStream, testManifold, 0.85);

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
            const agentTensors: TensorVector[] = [];
            for (let e = 0; e < state.in.activeCount; e++) {
                if (state.in.masses[e]! > 0) agentTensors.push(state.in.getTensor(e));
            }
            this.blackboard.synchronize(agentTensors);

            // 2C. HUNGARIAN MATCHING & HUKUM FISIKA
            const alignments = this.aligner.align(state.in, state.out);

            for (const match of alignments) {
                // Menurunkan threshold sedikit lebih rendah lagi karena imajinasi cermin
                // bisa menghasilkan similarity yang sangat fuzzy pada awalnya.
                if (match.deltaTensor && match.similarity > 0.3) {
                    const knownMemory = this.seedBank.findBestMatch(match.deltaTensor);

                    if (knownMemory && knownMemory.coherence > 0.75) {
                        log(`      [Resonance] Pergerakan dikenali sebagai: ${knownMemory.name} (Axiom Geometri: ${match.axiomType}) (Kemiripan: ${(knownMemory.coherence * 100).toFixed(2)}%)`);
                        this.pruner.injectHypothesis(knownMemory.name, knownMemory.phasor, 1.0, 0.01);
                    } else {
                        // Memasukkan nama axiomType (seperti MIRROR_X) ke dalam id agar tidak dilupakan
                        const ruleId = `LAW_NEW_TRAIN_${i}_E${match.sourceIndex}_[${match.axiomType}]`;
                        // Memberikan daya tahan (decay rate rendah 0.05) untuk hipotesis baru
                        // karena probe kuantum sudah memastikan geometri mentahnya benar.
                        this.pruner.injectHypothesis(ruleId, match.deltaTensor, 1.0, 0.05);
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
            // Melonggarkan aliran waktu untuk membiarkan hipotesis refleksi berkembang (0.2)
            this.pruner.evolveTime(0.2);
        }

        const survivingRules = this.pruner.getSurvivingRules();
        const rulesCount = survivingRules.length;

        // Logika Index Boolean bebas IF-ELSE untuk logging
        const statusMessages = [
            `   💀 EVOLVE GAGAL: Semua hipotesis musnah dilanda Entropi Kuantum.`,
            `   🌟 EVOLVE BERHASIL: Tersisa ${rulesCount} Hukum Alam (Axiom) yang kebal dari Entropi.`
        ];
        log(statusMessages[Number(rulesCount > 0)]!);

        // V8 Optimized Control Flow
        if (rulesCount === 0) return null;

        // 4. =======================================================
        // 🌌 THE COLLAPSE PHASE
        // Meruntuhkan probabilitas gelombang menjadi realitas absolut (Output Prediksi)
        // =======================================================
        log(`   [4] COLLAPSE: Mengaplikasikan Axiom ke realitas Test...`);

        // Terapkan medan Wave Gravity ke EntityManifold (Test)
        this.waveDynamics.initializeEntities(testManifold);
        this.waveDynamics.evolveEntanglement(0.2); // Sinkronisasi state awal tes

        // Contextualize dengan memori kolektif yang sudah dibangun saat training
        const collectiveState = this.blackboard.readCollectiveState();

        for (let i = 0; i < testManifold.activeCount; i++) {
            if (testManifold.masses[i] === 0.0) continue;

            const tensor = testManifold.getTensor(i);

            // Sadarkan agen akan state kolektif
            const contextualizedTensor = this.blackboard.contextualizeAgent(tensor);

            // Tarik tensor test menggunakan sisa-sisa aturan yang selamat dan memori kolektif
            const attractors = survivingRules.map(r => r.tensor_rule);
            attractors.push(contextualizedTensor); // Atraktor tambahan dari consciousness

            this.waveDynamics.applyWaveGravity(i, attractors, []);

            // Picu efek domino: Jika agen ini berubah, agen yang terikat ikut terpengaruh proporsional
            this.waveDynamics.triggerCollapse(i);
        }

        // Mengambil ukuran asli test grid (Jika 2D) untuk re-render
        const testInput = task.test[0]!.input;
        const is2D = Array.isArray(testInput[0]);

        if (is2D) {
            const grid = testInput as number[][];
            const height = grid.length;
            const width = grid[0]?.length || 0;

            // Menerapkan Runtuhan Gelombang Kuantum (Quantum Collapse)
            // Memproyeksikan EntityManifold yang sudah berevolusi (Evolve) kembali ke grid piksel
            const collapsedGrid = this.decoder.collapseToGrid(testManifold, width, height, 0.35); // Threshold diturunkan sedikit untuk menoleransi entropi

            log(`   ✅ REALITAS TERBENTUK: Grid (${width}x${height}) dirender ulang dari superposisi kuantum secara branchless ECS.`);
            return collapsedGrid;
        } else {
            return testInput;
        }
    }
}