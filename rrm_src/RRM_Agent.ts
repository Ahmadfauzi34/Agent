import { UniversalManifold, EntitySegmenter, HologramDecoder } from './perception/index.js';
import { TopologicalAligner, WaveDynamics, HamiltonianPruner, MultiverseSandbox, MAX_BRANCHES, MAX_DEPTH, GroverDiffusionSystem } from './reasoning/index.js';
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

        // =======================================================
        // THE META-REACTIVE ORCHESTRATOR (Snapshot Pattern)
        // =======================================================
        let survivingRules = this.runResonateAndEvolve(trainStates, false, log);

        if (!survivingRules || survivingRules.length === 0) {
            log(`   ⚠️ SNAPSHOT TRIGGERED: Fast Pass (Tier 0) gagal. Membangunkan Advanced Physics (DOMINO & SWARM)...`);
            this.pruner.clearAllHypotheses();
            survivingRules = this.runResonateAndEvolve(trainStates, true, log);
        }

        if (!survivingRules || survivingRules.length === 0) {
            log(`   💀 EVOLVE GAGAL SECARA ABSOLUT: Semua hipotesis musnah dilanda Entropi Kuantum.`);
            return null;
        }

        const rulesCount = survivingRules.length;
        log(`   🌟 EVOLVE BERHASIL: Mengekstrak ${rulesCount} Hukum Alam (Axiom) Bersih dari Trajectory.`);

        // 4. =======================================================
        // 🌌 THE COLLAPSE PHASE (Rute B: Wavefunction Collapse / Memcpy)
        // Mengeksekusi urutan Axiom bersih di Sandbox, lalu langsung Meruntuhkan
        // Sandbox yang sempurna itu ke dunia nyata (testManifold) secara O(1).
        // =======================================================
        log(`   [4] COLLAPSE: Mengeksekusi Runtuhan Fungsi Gelombang Kuantum ke realitas Test...`);

        // 1. Kloning Test Grid awal ke Sandbox (Universe 0)
        this.multiverse.cloneToUniverse(testManifold, 0);

        // 2. Mainkan seluruh sekuens Axiom bersih ke Sandbox secara berurutan
        for (const rule of survivingRules) {
            this.multiverse.applyAxiom(0, rule.tensor_rule, rule.deltaX, rule.deltaY, rule.physicsTier);
        }

        // 3. O(1) MEMCPY COLLAPSE
        // Ambil universe yang sudah matang dari Sandbox
        const winningUniverse = this.multiverse.getUniverse(0);

        // Timpa kenyataan (testManifold) dengan masa depan dari Sandbox
        testManifold.tensors.set(winningUniverse.tensors);
        testManifold.spansX.set(winningUniverse.spansX);
        testManifold.spansY.set(winningUniverse.spansY);
        testManifold.tokens.set(winningUniverse.tokens);
        testManifold.centersX.set(winningUniverse.centersX);
        testManifold.centersY.set(winningUniverse.centersY);
        testManifold.masses.set(winningUniverse.masses);

        // Mengambil ukuran asli test grid (Jika 2D) untuk re-render
        const testInput = task.test[0]!.input;
        const is2D = Array.isArray(testInput[0]);

        if (is2D) {
            const grid = testInput as number[][];
            const height = grid.length;
            const width = grid[0]?.length || 0;

            // Memproyeksikan EntityManifold yang sudah runtuh kembali ke grid piksel
            const collapsedGrid = this.decoder.collapseToGrid(testManifold, width, height, 0.35);

            log(`   ✅ REALITAS TERBENTUK: Grid (${width}x${height}) dirender ulang dari Memcpy Collapse secara branchless ECS.`);
            return collapsedGrid;
        } else {
            return testInput;
        }
    }

    /**
     * Menjalankan Fase 2 (RESONATE) dan Fase 3 (EVOLVE) dalam satu siklus yang dapat diulang.
     * Mengembalikan array Hypothesis yang berhasil selamat (atau null jika memicu Snapshot).
     */
    private runResonateAndEvolve(trainStates: { in: EntityManifold, out: EntityManifold }[], enableAdvancedPhysics: boolean, log: (msg: string) => void): any[] | null {
        log(`\n   [2] RESONATE: Mencocokkan jejak Topologis dan mengikat Kausalitas...`);

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
            const alignments = this.aligner.align(state.in, state.out, enableAdvancedPhysics);

            for (const match of alignments) {
                // Ekstraksi Delta sangat kompleks sekarang (Translasi + Cermin).
                // Similarity bisa anjlok karena noise superposisi. Tangkap semua > 0.1.
                if (match.deltaTensor && match.similarity > 0.1) {
                    const knownMemory = this.seedBank.findBestMatch(match.deltaTensor);
                    const physicsTier = match.physicsTier;

                    // Jika coherence sangat kuat, reuse memori lama
                    if (knownMemory && knownMemory.coherence > 0.75) {
                        if (enableAdvancedPhysics) {
                            log(`      [Resonance] Pergerakan dikenali sebagai: ${knownMemory.name} (Axiom: ${match.axiomType}) (Kemiripan: ${(knownMemory.coherence * 100).toFixed(2)}%)`);
                        }
                        this.pruner.injectHypothesis(knownMemory.name, knownMemory.phasor, match.deltaX, match.deltaY, 1.0, 0.001, physicsTier);
                    } else {
                        // Jika tidak ada yang mirip > 75%, kita ciptakan hukum baru
                        // (Mencegah false positive dari harvested seeds yang merusak Cross Validation)
                        const ruleId = `LAW_NEW_TRAIN_${i}_E${match.sourceIndex}_[${match.axiomType}]`;
                        // Decay rate super rendah karena Axiom sudah dipra-validasi oleh Centroid & Mirror Probes
                        this.pruner.injectHypothesis(ruleId, match.deltaTensor, match.deltaX, match.deltaY, 1.0, 0.005, physicsTier);
                    }
                }
            }
        }

        log(`   [3] EVOLVE: Menjalankan Termodinamika & Multiverse Tree Search...`);

        // Array untuk menyimpan lintasan aksi yang lolos Free Energy = 0.0 (Sempurna)
        const winningTrajectories: { tensor: TensorVector, depth: number }[] = [];
        const activeRules = this.pruner.getSurvivingRules();

        // Ambil top-K rule terkuat untuk menjadi cabang pohon MCTS agar tidak meledak
        // Kita pakai MAX_BRANCHES (misal 4 aksi terbaik)
        activeRules.sort((a, b) => b.energy - a.energy);
        const topRules = activeRules.slice(0, MAX_BRANCHES);

        for (let i = 0; i < trainStates.length; i++) {
            const state = trainStates[i]!;

            // Memulai Pencarian Imajinasi Mendalam (Recursive Multiverse)
            const trajectoryResult = this.deepImagine(state.in, state.out, 1, topRules);

            if (trajectoryResult) {
                winningTrajectories.push(trajectoryResult);
            }
        }

        let lowestEnergySumFallback = 9999.0;

        // 3B. =======================================================
        // RUTE A: RETROCAUSAL UNBINDING (Menarik Rumus Bersih dari Trajectory)
        // Mengekstrak aksi murni dari kebisingan Vektor Masa Depan.
        // =======================================================
        const cleanAxiomSequence: any[] = [];
        if (winningTrajectories.length > 0) {
            if (enableAdvancedPhysics) log(`      [Retrocausal Unbinding] Mengekstrak urutan Hukum dari Alam Semesta Pemenang...`);

            let winner = winningTrajectories[0]!;

            if (winningTrajectories.length > 1) {
                if (enableAdvancedPhysics) log(`      [Grover Diffusion] Menyelesaikan ambiguitas ${winningTrajectories.length} lintasan masa depan menggunakan Interferensi Kuantum...`);
                const candidates = winningTrajectories.map(t => ({
                    tensor: t.tensor,
                    depth: t.depth,
                    energy: 1.0
                }));

                const grover = new GroverDiffusionSystem(this.multiverse, {
                    dimensions: GLOBAL_DIMENSION,
                    searchSpaceSize: candidates.length,
                    temperature: 0.1,
                    freeEnergyThreshold: 0.05,
                    maxIterations: 3
                });

                const ultimateWinner = grover.search(candidates, trainStates);
                if (ultimateWinner) winner = ultimateWinner;
            }

            const trajectoryTensor = winner.tensor;
            const maxDepthReached = winner.depth;

            for (let d = 1; d <= maxDepthReached; d++) {
                // PENGAMANAN DOSA 3 (Mencegah Color Phase Annihilation)
                // Alih-alih meng-inverse timePhase, kita men-generate phase waktu mundur (-d).
                const timeInverse = FHRR.fractionalBind(this.TIME_SEED, -d);
                const noisyAxiom = FHRR.bind(trajectoryTensor, timeInverse);

                let bestMatch: any | null = null;
                let highestSim = -999.0;

                for (const rule of activeRules) {
                    const sim = FHRR.similarity(noisyAxiom, rule.tensor_rule);
                    if (sim > highestSim) {
                        highestSim = sim;
                        bestMatch = rule;
                    }
                }

                if (bestMatch && highestSim > 0.1) {
                    cleanAxiomSequence.push(bestMatch);
                }
            }

            this.pruner.clearAllHypotheses();

            for (let i = 0; i < cleanAxiomSequence.length; i++) {
                const rule = cleanAxiomSequence[i]!;
                this.pruner.injectHypothesis(`CLEAN_AXIOM_STEP_${i+1}`, rule.tensor_rule, rule.deltaX, rule.deltaY, 1.0, 0.0, rule.physicsTier);
            }
        } else {
            // Evaluasi 1-langkah konvensional (Fallback Mechanism).
            let bestFallbackRule: any | null = null;
            const fallbackCandidates: any[] = [];

            for (const rule of activeRules) {
                let ruleEnergySum = 0.0;

                for (let i = 0; i < trainStates.length; i++) {
                    const state = trainStates[i]!;
                    this.multiverse.cloneToUniverse(state.in, 0);
                    this.multiverse.applyAxiom(0, rule.tensor_rule, rule.deltaX, rule.deltaY, rule.physicsTier);
                    const freeEnergy = this.multiverse.calculateFreeEnergy(0, state.out);

                    ruleEnergySum += freeEnergy;
                }

                if (ruleEnergySum < lowestEnergySumFallback) {
                    lowestEnergySumFallback = ruleEnergySum;
                    bestFallbackRule = rule;
                }

                if (ruleEnergySum < 1.5) {
                    rule.energy = Math.max(0.01, 1.0 - (ruleEnergySum / trainStates.length));
                    fallbackCandidates.push(rule);
                }
            }

            if (fallbackCandidates.length > 1) {
                if (enableAdvancedPhysics) log(`      [Grover Diffusion] Resolusi Ambiguitas Fallback terhadap ${fallbackCandidates.length} aksioma parsial...`);
                const grover = new GroverDiffusionSystem(this.multiverse, {
                    dimensions: GLOBAL_DIMENSION,
                    searchSpaceSize: fallbackCandidates.length,
                    temperature: 0.1,
                    freeEnergyThreshold: 0.1,
                    maxIterations: 3
                });

                const ultimateWinner = grover.search(fallbackCandidates, trainStates);
                if (ultimateWinner) bestFallbackRule = ultimateWinner;
            }

            this.pruner.clearAllHypotheses();

            if (bestFallbackRule && lowestEnergySumFallback < 9999.0) {
                this.pruner.injectHypothesis(`CLEAN_AXIOM_FALLBACK`, bestFallbackRule.tensor_rule, bestFallbackRule.deltaX, bestFallbackRule.deltaY, 1.0, 0.0, bestFallbackRule.physicsTier);
            }
        }

        const survivingRules = this.pruner.getSurvivingRules();

        // SELF-EVALUATION: Jika kita dalam mode Fast Pass (enableAdvancedPhysics = false),
        // dan hasil evolusi murni GAGAL TOTAL (Tidak ada lintasan, tidak ada fallback candidate yang selamat).
        // Kita mencabut syarat lowestEnergySumFallback > 0.01 agar tidak "false panic" pada soal AGI 1 & 2
        // yang solusinya terkadang menyisakan sedikit noise (e.g., Free Energy 0.02) karena kompresi resolusi.
        if (!enableAdvancedPhysics) {
            if (survivingRules.length === 0) {
                return null;
            }
        }

        return survivingRules;
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
    ): { tensor: TensorVector, depth: number } | null {
        if (depth > MAX_DEPTH) return null; // Mentok

        for (let branch = 0; branch < availableActions.length; branch++) {
            const action = availableActions[branch]!;
            const universeId = (depth - 1) * MAX_BRANCHES + branch; // Pemetaan linier ID ke Multiverse

            // 1. Kloning ke cabang masa depan
            this.multiverse.cloneToUniverse(currentUniverse, universeId);

            // 2. Berimajinasi (Aplikasikan Hukum Fisika Kuantum & Skalar Kinetik)
            this.multiverse.applyAxiom(universeId, action.tensor_rule, action.deltaX, action.deltaY, action.physicsTier);

            // 3. Evaluasi Surprise (Free Energy)
            const newFreeEnergy = this.multiverse.calculateFreeEnergy(universeId, targetUniverse);

            // 4. Update Sejarah Vektor dengan Time-Traveling Binding
            const timePhase = FHRR.fractionalBind(this.TIME_SEED, depth); // Time step T_d
            const stepAction = FHRR.bind(action.tensor_rule, timePhase);
            const newTrajectory = currentTrajectory ? FHRR.bind(currentTrajectory, stepAction) : stepAction;

            // 5. Kondisi Penilaian Cabang (Thermodynamic Pruning)
            if (newFreeEnergy < 0.05) {
                // RESONANSI SEMPURNA DITEMUKAN! Jawaban teka-teki terpecahkan
                return { tensor: newTrajectory, depth };
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