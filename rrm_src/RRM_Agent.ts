import { UniversalManifold, EntitySegmenter, HologramDecoder } from './perception/index.js';
import { TopologicalAligner, WaveDynamics, HamiltonianPruner, MultiverseSandbox, MAX_BRANCHES, MAX_DEPTH } from './reasoning/index.js';
import { GlobalBlackboard } from './reasoning/GlobalBlackboard.js';
import { LogicSeedBank } from './memory/index.js';
import { Task } from './shared/index.js';
import { PDRLogger, LogLevel } from './shared/logger.js';
import { EntityManifold } from './core/EntityManifold.js';
import { TensorVector, GLOBAL_DIMENSION } from './core/config.js';
import { FHRR } from './core/fhrr.js';

/**
 * 🤖 THE RECURSIVE REASONING MACHINE (Fase 6: Multiverse Deep Planning)
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
    private multiverse = new MultiverseSandbox(); // 🌟 The New Imagination Space (Multi-Branch)
    private decoder: HologramDecoder;
    private seedBank: LogicSeedBank;

    // Seed untuk merekam Jejak Waktu dalam VSA (Time-Traveling Binding)
    private readonly TIME_SEED = FHRR.create();

    constructor() {
        this.seedBank = new LogicSeedBank(this.perceiver);
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
                // Ekstraksi Delta sangat kompleks sekarang (Translasi + Cermin).
                // Similarity bisa anjlok karena noise superposisi. Tangkap semua > 0.1.
                if (match.deltaTensor && match.similarity > 0.1) {
                    const knownMemory = this.seedBank.findBestMatch(match.deltaTensor);

                    // Jika coherence sangat kuat, reuse memori lama
                    if (knownMemory && knownMemory.coherence > 0.75) {
                        log(`      [Resonance] Pergerakan dikenali sebagai: ${knownMemory.name} (Axiom Geometri: ${match.axiomType}) (Kemiripan: ${(knownMemory.coherence * 100).toFixed(2)}%)`);
                        this.pruner.injectHypothesis(knownMemory.name, knownMemory.phasor, 1.0, 0.001);
                    } else {
                        // Jika tidak ada yang mirip > 75%, kita ciptakan hukum baru
                        // (Mencegah false positive dari harvested seeds yang merusak Cross Validation)
                        const ruleId = `LAW_NEW_TRAIN_${i}_E${match.sourceIndex}_[${match.axiomType}]`;
                        // Decay rate super rendah karena Axiom sudah dipra-validasi oleh Centroid & Mirror Probes
                        this.pruner.injectHypothesis(ruleId, match.deltaTensor, 1.0, 0.005);
                    }
                }
            }
        }

        // 3. =======================================================
        // 🔥 THE EVOLVE PHASE (Deep Active Inference / Multiverse Tree Search)
        // Mengeksekusi pencarian multi-cabang (MCTS) untuk mencari Trajectory terbaik.
        // =======================================================
        log(`   [3] EVOLVE: Menjalankan Termodinamika & Multiverse Tree Search...`);

        // Array untuk menyimpan lintasan aksi yang lolos Free Energy = 0.0 (Sempurna)
        const winningTrajectories: TensorVector[] = [];
        const activeRules = this.pruner.getSurvivingRules();

        // Ambil top-K rule terkuat untuk menjadi cabang pohon MCTS agar tidak meledak
        // Kita pakai MAX_BRANCHES (misal 4 aksi terbaik)
        activeRules.sort((a, b) => b.energy - a.energy);
        const topRules = activeRules.slice(0, MAX_BRANCHES);

        for (let i = 0; i < trainStates.length; i++) {
            const state = trainStates[i]!;

            // Memulai Pencarian Imajinasi Mendalam (Recursive Multiverse)
            // Ini akan meruntuhkan cabang yang memiliki energi tinggi dan mengembalikan
            // Trajectory Tensor (sejarah ikatan waktu) jika menemukan kecocokan sempurna.
            const trajectory = this.deepImagine(state.in, state.out, 1, topRules);

            if (trajectory) {
                winningTrajectories.push(trajectory);
            }
        }

        // Catatan: Karena implementasi MCTS kita mengembalikan Tensor Trajectory,
        // proses pruner konvensional (mengurangi energi rules individu) sebagian besar digantikan
        // oleh survival of the fittest Trajectories. Untuk sementara, kita menganggap
        // Trajectories ini sebagai "Axiom" di tahap Collapse.

        // Bersihkan pruner dan suntikkan Trajectory pemenang sebagai aturan baru.
        // Ini adalah cara yang VSA untuk mengekstrak langkah tanpa String Array.
        if (winningTrajectories.length > 0) {
            this.pruner.evolveTime(1.0); // Bunuh semua rule lawas yang terfragmentasi
            for (let i = 0; i < winningTrajectories.length; i++) {
                this.pruner.injectHypothesis(`TRAJECTORY_WINNER_${i}`, winningTrajectories[i]!, 1.0, 0.0);
            }
        } else {
            // Jika Deep Planning gagal menemukan jalur sempurna 0.0, kita kembali
            // ke Evaluasi 1-langkah konvensional untuk mengamankan soal yang simpel
            // yang tidak butuh Traverse Kedalaman (Fallback Mechanism).
            for (const rule of activeRules) {
                let isUniversallyValid = true;
                for (let i = 0; i < trainStates.length; i++) {
                    const state = trainStates[i]!;
                    this.multiverse.cloneToUniverse(state.in, 0);
                    this.multiverse.applyAxiom(0, rule.tensor_rule);
                    const freeEnergy = this.multiverse.calculateFreeEnergy(0, state.out);

                    if (freeEnergy >= 0.9 && state.in.activeCount > 0) {
                        isUniversallyValid = false;
                        break;
                    }
                }
                if (isUniversallyValid) {
                    this.pruner.reinforceHypothesis(rule.index, 0.5);
                } else {
                    this.pruner.punishHypothesis(rule.index, 1.0);
                }
            }
        }

        // Tembakan peluruhan pasif terakhir untuk membersihkan sisa debu noise
        this.pruner.evolveTime(0.1);

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

    /**
     * 🌀 THE DEEP ACTIVE INFERENCE LOOP (MCTS)
     * Menjalankan penelusuran pohon multiverse secara rekursif (Depth-First Search).
     */
    private deepImagine(
        currentUniverse: EntityManifold,
        targetUniverse: EntityManifold,
        depth: number,
        availableActions: any[],
        currentTrajectory: TensorVector | null = null,
        currentFreeEnergy: number = 1.0
    ): TensorVector | null {
        if (depth > MAX_DEPTH) return null; // Mentok

        for (let branch = 0; branch < availableActions.length; branch++) {
            const action = availableActions[branch]!;
            const universeId = (depth - 1) * MAX_BRANCHES + branch; // Pemetaan linier ID ke Multiverse

            // 1. Kloning ke cabang masa depan
            this.multiverse.cloneToUniverse(currentUniverse, universeId);

            // 2. Berimajinasi (Aplikasikan Hukum)
            this.multiverse.applyAxiom(universeId, action.tensor_rule);

            // 3. Evaluasi Surprise (Free Energy)
            const newFreeEnergy = this.multiverse.calculateFreeEnergy(universeId, targetUniverse);

            // 4. Update Sejarah Vektor dengan Time-Traveling Binding
            const timePhase = FHRR.fractionalBind(this.TIME_SEED, depth); // Time step T_d
            const stepAction = FHRR.bind(action.tensor_rule, timePhase);
            const newTrajectory = currentTrajectory ? FHRR.bind(currentTrajectory, stepAction) : stepAction;

            // 5. Kondisi Penilaian Cabang (Thermodynamic Pruning)
            if (newFreeEnergy < 0.05) {
                // RESONANSI SEMPURNA DITEMUKAN! Jawaban teka-teki terpecahkan
                return newTrajectory;
            } else if (newFreeEnergy < currentFreeEnergy) {
                // Entropi berkurang (Makin mirip Target). Eksplorasi ke tingkat lebih dalam!
                // Perhatikan: Rekursi ke masa depan akan menggunakan Semesta saat ini sebagai sumber
                const winningFuture = this.deepImagine(
                    this.multiverse.getUniverse(universeId),
                    targetUniverse,
                    depth + 1,
                    availableActions,
                    newTrajectory,
                    newFreeEnergy
                );

                if (winningFuture) return winningFuture;
            }
            // Jika FreeEnergy >= currentFreeEnergy, cabang ini akan otomatis "Dibunuh"
            // (Tidak dilanjutkan iterasi ke dalam), dan universeId-nya akan ditimpa di iterasi lain.
        }

        return null;
    }
}