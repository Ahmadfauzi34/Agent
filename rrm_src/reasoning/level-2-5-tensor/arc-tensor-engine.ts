/**
 * ARCTensorEngine v5.1 - Holographic Quantum Edition
 *
 * Fitur: Wavefront Partitioning, Kinematics, Vector Symbolic Architectures (VSA)
 */

export type TensorOp =
    | "STANDING_WAVE"
    | "PHASE_SHIFT"
    | "CONSTRUCTIVE_INTERFERENCE"
    | "DESTRUCTIVE_INTERFERENCE"
    | "COMPLEX_WAVEFORM"
    | "OPTICAL_INTERFERENCE"
    | "UNKNOWN";

export type ForceType = "ATTRACTION" | "REPULSION" | "NEUTRAL" | "COLLISION";

export interface AgentInteraction {
    target_agent_id: string;
    force_type: ForceType;
    distance_delta: number;
}

export interface WaveAgent {
    agent_id: string;
    token: number;
    island_id: number;
    mask: number[][];
    mass: number;
    abs_center: { x: number, y: number };
    rel_center: { x: number, y: number };
    spread: number;
}

export interface TensorRule {
    target_token: number;
    island_id: number;
    agent_id: string;
    op: TensorOp;
    params: {
        vector_x_abs: number;
        vector_y_abs: number;
        vector_x_rel: number;
        vector_y_rel: number;
        amplification: number;
        spatial_delta: number;
    };
    interactions: AgentInteraction[];
    holographic_law: string; // NEW: VSA Hypervector Representation
}

export interface TensorSolution {
    task_id: string;
    description: string;
    rules: TensorRule[];
    target_seed: number;
}

import { FWHTContext } from '../../core/fwht';

// ==========================================
// 🌌 VECTOR SYMBOLIC ARCHITECTURE (VSA) CORE
// ==========================================
class VSACore {
    private readonly D = 64; // Harus pangkat 2 untuk FWHT (misal: 64, 256, 1024)
    private codebook: Map<string, Int32Array> = new Map();
    private seed: number;
    private fwht: FWHTContext;

    constructor(seed: number) {
        this.seed = seed;
        this.fwht = new FWHTContext(this.D * 4); // Alokasi pool dinamis
    }

    // Pseudo-Random Number Generator deterministik
    private random(): number {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }

    // Menghasilkan Hypervector Bipolar acak (+1 / -1)
    private generateRandomHV(): Int32Array {
        const arr = new Int32Array(this.D);
        for (let i = 0; i < this.D; i++) {
            arr[i] = this.random() > 0.5 ? 1 : -1;
        }
        return arr;
    }

    // Mengambil atau membuat Hypervector dasar dari Codebook
    public getBaseHV(key: string): Int32Array {
        if (!this.codebook.has(key)) {
            this.codebook.set(key, this.generateRandomHV());
        }
        return this.codebook.get(key)!;
    }

    // BIND (XOR Element-wise untuk stabilitas matematis Bipolar VSA)
    // Walaupun FWHT dyadic tersedia, untuk bipolar murni ({-1, 1}), XOR jauh lebih stabil
    // agar binding orthogonal (V1 * V2) bisa di-unbind sempurna dengan inverse (V2 * V1^-1).
    public bind(v1: Int32Array, v2: Int32Array): Int32Array {
        const result = new Int32Array(this.D);
        for (let i = 0; i < this.D; i++) {
            result[i] = v1[i]! * v2[i]!;
        }
        return result;
    }

    // BUNDLE (Superposition / Element-wise addition + thresholding)
    public bundle(vectors: Int32Array[]): Int32Array {
        const res = new Int32Array(this.D);
        if (vectors.length === 0) {
            res.fill(1);
            return res;
        }

        for (let i = 0; i < vectors.length; i++) {
            for (let d = 0; d < this.D; d++) {
                res[d] += vectors[i]![d]!;
            }
        }

        // Thresholding kembali ke Bipolar (+1 / -1)
        for (let d = 0; d < this.D; d++) {
            res[d] = res[d]! >= 0 ? 1 : -1;
        }
        return res;
    }

    // INVERT: Di dalam FWHT Bipolar Holography, Invert bukan dirinya sendiri.
    // Melainkan Inverse Matrix. Untuk penyederhanaan pada dyadic riil,
    // jika vektor adalah bipolar ortogonal, inverse hampir sama dengan transpose/time-reverse.
    // Pada implementasi ini, kita gunakan vektor original sebagai proxy inverse aproksimasi cepat
    // (self-inverse property dari Hadamard basis).
    public invert(v: Int32Array): Int32Array {
        return new Int32Array(v);
    }

    // Encode Agent State menjadi Hypervector
    public encodeAgent(agent: WaveAgent): Int32Array {
        const tokenHV = this.getBaseHV(`TOKEN_${agent.token}`);
        const massHV = this.getBaseHV(`MASS_${Math.round(agent.mass)}`);
        // Kuantisasi posisi relatif ke 10 grid area untuk stabilitas VSA
        const posXHV = this.getBaseHV(`POSX_${Math.round(agent.rel_center.x * 10)}`);
        const posYHV = this.getBaseHV(`POSY_${Math.round(agent.rel_center.y * 10)}`);
        
        return this.bundle([tokenHV, massHV, posXHV, posYHV]);
    }

    // Konversi HV ke String Padat untuk JSON
    public hvToString(v: Int32Array): string {
        return Array.from(v).map(val => val === 1 ? '+' : '-').join('');
    }

    // Konversi String Padat ke HV
    public stringToHv(s: string): Int32Array {
        const arr = new Int32Array(this.D);
        for (let i = 0; i < s.length; i++) {
            arr[i] = s[i] === '+' ? 1 : -1;
        }
        return arr;
    }

    // Menghitung Cosine Similarity bebas if-else (kembali 0-1)
    public similarity(v1: Int32Array, v2: Int32Array): number {
        const sum = v1.reduce((acc, val, i) => acc + (val * v2[i]!), 0);
        return (sum / this.D + 1) / 2; // Normalize dari [-1, 1] ke [0, 1]
    }

    // Mencari kunci terdekat dari codebook (Decoding Memory)
    public queryCodebook(queryHV: Int32Array, prefix: string): string {
        let bestKey = "";
        let bestSim = -1;

        for (const [key, hv] of this.codebook.entries()) {
            if (key.startsWith(prefix)) {
                const sim = this.similarity(queryHV, hv);
                const isBetter = Number(sim > bestSim);
                bestSim = isBetter * sim + (1 - isBetter) * bestSim;

                // Workaround if-else string assignment
                if (isBetter) bestKey = key;
            }
        }
        return bestKey;
    }

    // Encoder Absolut (Baru: untuk memetakan koordinat riil ke memori agent saat diprediksi)
    public encodeDelta(dx: number, dy: number): Int32Array {
        const dxHV = this.getBaseHV(`DELTA_X_${Math.round(dx)}`);
        const dyHV = this.getBaseHV(`DELTA_Y_${Math.round(dy)}`);
        // Harus di-bundle (Superposition) agar masing-masing sumbu (dx, dy) bisa di-query terpisah
        return this.bundle([dxHV, dyHV]);
    }
}

export class ARCTensorEngine {
    private readonly MATCH_THRESHOLD = 50.0;
    private vsa!: VSACore;

    public solveTensor(taskId: string, trainPairs: {input: number[][], output: number[][]}[]) : TensorSolution {
        const deterministicSeed = 80000 + (parseInt(taskId.substring(0, 4), 16) % 19999);
        this.vsa = new VSACore(deterministicSeed); // Inisialisasi VSA Core
        
        const allRules: TensorRule[] = [];

        trainPairs.forEach((pair) => {
            const inputAgents = this.findAllAgents(pair.input);
            let outputAgents = this.findAllAgents(pair.output);

            const survivingAgents: { inAgent: WaveAgent, outAgent: WaveAgent }[] = [];
            const pairRules: TensorRule[] = [];

            inputAgents.forEach((inWave) => {
                const potentials = outputAgents
                    .filter(o => o.token === inWave.token)
                    .map(outCandidate => ({
                        out: outCandidate,
                        score: this.calculateSimilarityScore(inWave, outCandidate)
                    }))
                    .sort((a, b) => a.score - b.score);

                const best = potentials[0];

                if (!best || best.score > this.MATCH_THRESHOLD) {
                    pairRules.push(this.createDestructiveRule(inWave));
                } else {
                    survivingAgents.push({ inAgent: inWave, outAgent: best.out });
                    pairRules.push(this.extractRule(inWave, best.out));
                    outputAgents = outputAgents.filter(o => o !== best.out);
                }
            });

            outputAgents.forEach((leftover) => {
                pairRules.push(this.createConstructiveRule(leftover));
            });

            const interactionsMap = this.calculateInterAgentForces(survivingAgents);
            
            pairRules.forEach(rule => {
                if (interactionsMap[rule.agent_id]) {
                    rule.interactions = interactionsMap[rule.agent_id];
                }
            });

            allRules.push(...pairRules);
        });

        const consensusRules = this.calculateConsensus(allRules);

        return {
            task_id: taskId,
            description: "Holographic Quantum Law Extraction (VSA/HDC)",
            rules: consensusRules,
            target_seed: deterministicSeed
        };
    }

    public applyTensor(inputGrid: number[][], rules: TensorRule[]): number[][] {
        const height = inputGrid.length;
        const width = inputGrid[0]?.length || 0;
        
        // Kalkulasi ukuran grid berdasarkan deteksi anomali pada aturan Tensor
        // Operasi dengan perubahan spatial ekstrim (OPTICAL_INTERFERENCE) dapat memicu penskalaan global
        // Tanpa instruksi if-else
        const globalScalingFactor = rules.reduce((maxScale, r) => {
            const isScaleOp = Number(r.op === "OPTICAL_INTERFERENCE" || r.op === "COMPLEX_WAVEFORM");
            const ampScale = Math.round(Math.sqrt(r.params.amplification)) * isScaleOp;
            return Math.max(maxScale, ampScale);
        }, 1);

        const outHeight = height * globalScalingFactor;
        const outWidth = width * globalScalingFactor;

        const outputGrid = Array.from({ length: outHeight }, () => Array(outWidth).fill(0));
        
        const inputAgents = this.findAllAgents(inputGrid);
        
        // Inisialisasi VSA Core untuk decode memori saat testing jika belum ada
        if (!this.vsa) {
             const deterministicSeed = 80000;
             this.vsa = new VSACore(deterministicSeed);
        }

        inputAgents.forEach(agent => {
            const matchingRules = rules.filter(r => r.target_token === agent.token);
            
            if (matchingRules.length === 0) {
                this.renderAgent(outputGrid, agent, 0, 0);
                return;
            }
            
            const rule = matchingRules[0]!;
            
            if (rule.op === "DESTRUCTIVE_INTERFERENCE") {
                return;
            }
            
            // === VSA HOLOGRAPHIC PREDICTION ===
            // 1. Encode state agent tes saat ini
            const currentHV = this.vsa.encodeAgent(agent);

            // 2. Baca hukum universal dari memori
            const lawHV = this.vsa.stringToHv(rule.holographic_law);

            // 3. Unbind (Invert current + Bind Law) untuk mengekstrak ekspektasi Delta (dx, dy)
            const expectedDeltaHV = this.vsa.bind(lawHV, this.vsa.invert(currentHV));

            // 4. Decode (Query) ke memori untuk mendapatkan pergeseran X dan Y
            const dxKey = this.vsa.queryCodebook(expectedDeltaHV, "DELTA_X_");
            const dyKey = this.vsa.queryCodebook(expectedDeltaHV, "DELTA_Y_");

            // Fallback (holographic memory noise) menggunakan boolean index tanpa if-else bersarang
            // Jika memori VSA berhasil menemukan kunci terdekat, gunakan angkanya. Jika tidak, diam di tempat (0).
            // Mencegah propagasi NaN menggunakan short-circuit OR (karena NaN bernilai falsy)
            const parsedDx = parseInt(dxKey.replace("DELTA_X_", "")) || 0;
            const parsedDy = parseInt(dyKey.replace("DELTA_Y_", "")) || 0;
            
            this.renderAgent(outputGrid, agent, parsedDx, parsedDy);
        });
        
        // Handle CONSTRUCTIVE_INTERFERENCE (agents that appear out of nowhere)
        // This requires knowing where to place them, which is complex if they don't originate from an input agent.
        // For now, we rely on transformations of existing agents.
        
        return outputGrid;
    }

    private renderAgent(grid: number[][], agent: WaveAgent, dx: number, dy: number) {
        const height = grid.length;
        const width = grid[0]?.length || 0;
        
        for (let y = 0; y < agent.mask.length; y++) {
            for (let x = 0; x < agent.mask[y]!.length; x++) {
                if (agent.mask[y]![x]! > 0) {
                    const newX = x + dx;
                    const newY = y + dy;
                    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                        grid[newY]![newX] = agent.token;
                    }
                }
            }
        }
    }

    // ==========================================
    // 🌌 MULTI-AGENT DYNAMICS & VSA
    // ==========================================

    private calculateInterAgentForces(survivors: { inAgent: WaveAgent, outAgent: WaveAgent }[]): Record<string, AgentInteraction[]> {
        const interactionsMap: Record<string, AgentInteraction[]> = {};
        survivors.forEach(a => interactionsMap[a.inAgent.agent_id] = []);

        for (let i = 0; i < survivors.length; i++) {
            for (let j = 0; j < survivors.length; j++) {
                if (i === j) continue;
                const agentA = survivors[i]!;
                const agentB = survivors[j]!;

                const distIn = Math.hypot(
                    agentB.inAgent.abs_center.x - agentA.inAgent.abs_center.x, 
                    agentB.inAgent.abs_center.y - agentA.inAgent.abs_center.y
                );
                const distOut = Math.hypot(
                    agentB.outAgent.abs_center.x - agentA.outAgent.abs_center.x, 
                    agentB.outAgent.abs_center.y - agentA.outAgent.abs_center.y
                );

                const delta = distOut - distIn;
                const isCollision = distOut < 1.5 ? 1 : 0; 
                const signDelta = Math.sign(Math.round(delta * 10) / 10); 

                const forceSignature = `${isCollision}_${signDelta}`;
                const forceMap: Record<string, ForceType> = {
                    "1_-1": "COLLISION", "1_0": "COLLISION", "1_1": "COLLISION", 
                    "0_-1": "ATTRACTION", "0_1": "REPULSION", "0_0": "NEUTRAL"
                };

                const forceType = forceMap[forceSignature] || "NEUTRAL";

                if (forceType !== "NEUTRAL") {
                    interactionsMap[agentA.inAgent.agent_id]!.push({
                        target_agent_id: agentB.inAgent.agent_id,
                        force_type: forceType,
                        distance_delta: Number(delta.toFixed(2))
                    });
                }
            }
        }
        return interactionsMap;
    }

    private extractRule(inW: WaveAgent, outW: WaveAgent): TensorRule {
        const shiftX = outW.abs_center.x - inW.abs_center.x;
        const shiftY = outW.abs_center.y - inW.abs_center.y;
        const shiftXRel = outW.rel_center.x - inW.rel_center.x;
        const shiftYRel = outW.rel_center.y - inW.rel_center.y;
        const massDelta = outW.mass - inW.mass;

        // Implementasi logika OPTICAL_INTERFERENCE:
        // Saat agen berubah dalam fasa posisi maupun massa dan juga mengalami perluasan spatial.
        const opArray: TensorOp[] = [
            "STANDING_WAVE",
            "PHASE_SHIFT",
            "DESTRUCTIVE_INTERFERENCE",
            "CONSTRUCTIVE_INTERFERENCE",
            "COMPLEX_WAVEFORM",
            "OPTICAL_INTERFERENCE"
        ];

        const isShifted = Math.abs(shiftX) > 0.1 || Math.abs(shiftY) > 0.1;
        const isMassChanged = Math.abs(massDelta) > 0.1;
        const isSpatialChanged = Math.abs(outW.spread - inW.spread) > 0.1;

        // Tensor kalkulasi indeks secara linier menggunakan basis bitmask pangkat 2 (1, 2, 4)
        const opIndex = Number(isShifted) * 1 + Number(isMassChanged) * 2 + Number(isSpatialChanged) * 4;

        // Operasi fallback tanpa kondisional menggunakan array
        const interferenceOps: TensorOp[] = ["DESTRUCTIVE_INTERFERENCE", "CONSTRUCTIVE_INTERFERENCE"];
        const interferenceOp = interferenceOps[Number(massDelta > 0)]!;

        // Pemetaan state ke Operator secara unik (0-7)
        const opMap: Record<number, TensorOp> = {
            0: "STANDING_WAVE",             // 000: No Shift, No Mass, No Spatial
            1: "PHASE_SHIFT",               // 001: Shift, No Mass, No Spatial
            2: interferenceOp,              // 010: No Shift, Mass, No Spatial
            3: "COMPLEX_WAVEFORM",          // 011: Shift, Mass, No Spatial
            4: interferenceOp,              // 100: No Shift, No Mass (tetapi massDelta > 0?), Spatial -> Konseptual Interference
            5: "OPTICAL_INTERFERENCE",      // 101: Shift, No Mass, Spatial
            6: interferenceOp,              // 110: No Shift, Mass, Spatial
            7: "OPTICAL_INTERFERENCE"       // 111: Shift, Mass, Spatial
        };

        const op: TensorOp = opMap[opIndex] || "STANDING_WAVE";

        // --- VSA: HOLOGRAPHIC LAW EXTRACTION ---
        const inHV = this.vsa.encodeAgent(inW);
        const outHV = this.vsa.encodeAgent(outW);
        
        // Delta Transformasi: B_out * B_in^-1
        const deltaT = this.vsa.bind(outHV, this.vsa.invert(inHV));
        
        // Konteks: Status agen saat ini (Bisa diperluas dengan interaksi agen lain)
        const contextHV = inHV; 
        
        // Simpan vektor pergerakan ke Codebook VSA agar bisa di-query nanti saat testing
        const deltaHV = this.vsa.encodeDelta(Math.round(shiftX), Math.round(shiftY));

        // Hukum Alam: Konteks (inHV) diikat dengan Pergerakan Real
        const lawHV = this.vsa.bind(inHV, deltaHV);

        return {
            target_token: inW.token,
            island_id: inW.island_id,
            agent_id: inW.agent_id,
            op,
            params: {
                vector_x_abs: Number(shiftX.toFixed(2)),
                vector_y_abs: Number(shiftY.toFixed(2)),
                vector_x_rel: Number(shiftXRel.toFixed(3)),
                vector_y_rel: Number(shiftYRel.toFixed(3)),
                amplification: inW.mass === 0 ? 0 : Number((outW.mass / inW.mass).toFixed(2)),
                spatial_delta: outW.spread - inW.spread
            },
            interactions: [],
            holographic_law: this.vsa.hvToString(lawHV) // Simpan sebagai string padat
        };
    }

    private createDestructiveRule(inW: WaveAgent): TensorRule {
        const inHV = this.vsa.encodeAgent(inW);
        const outHV = this.vsa.getBaseHV("STATE_ANNIHILATED");
        const deltaT = this.vsa.bind(outHV, this.vsa.invert(inHV));
        const lawHV = this.vsa.bind(inHV, deltaT);

        return {
            target_token: inW.token,
            island_id: inW.island_id,
            agent_id: inW.agent_id,
            op: "DESTRUCTIVE_INTERFERENCE",
            params: { vector_x_abs: 0, vector_y_abs: 0, vector_x_rel: 0, vector_y_rel: 0, amplification: 0, spatial_delta: -inW.spread },
            interactions: [],
            holographic_law: this.vsa.hvToString(lawHV)
        };
    }

    private createConstructiveRule(outW: WaveAgent): TensorRule {
        const inHV = this.vsa.getBaseHV("STATE_VOID");
        const outHV = this.vsa.encodeAgent(outW);
        const deltaT = this.vsa.bind(outHV, this.vsa.invert(inHV));
        const lawHV = this.vsa.bind(inHV, deltaT);

        return {
            target_token: outW.token,
            island_id: outW.island_id,
            agent_id: outW.agent_id,
            op: "CONSTRUCTIVE_INTERFERENCE",
            params: { 
                vector_x_abs: outW.abs_center.x, vector_y_abs: outW.abs_center.y, 
                vector_x_rel: outW.rel_center.x, vector_y_rel: outW.rel_center.y, 
                amplification: outW.mass, spatial_delta: outW.spread 
            },
            interactions: [],
            holographic_law: this.vsa.hvToString(lawHV)
        };
    }

    // ==========================================
    // ⚖️ CONSENSUS & QUANTIZATION
    // ==========================================

    private snapToGrid(val: number, epsilon: number = 0.08): number {
        const nearest = Math.round(val);
        if (Math.abs(val - nearest) < epsilon) return nearest;
        return val;
    }

    private calculateConsensus(rules: TensorRule[]): TensorRule[] {
        const groups: Record<string, TensorRule[]> = {};
        rules.forEach(r => {
            if (!groups[r.agent_id]) groups[r.agent_id] = [];
            groups[r.agent_id]!.push(r);
        });

        return Object.values(groups).map(group => {
            const count = group.length;
            const opList = group.map(g => g.op);
            
            // Eliminasi block IF-ELSE untuk pemilihan operator pada tingkat konsensus
            // Menggunakan bobot hierarki operator tensor
            const opHierarchy: Record<TensorOp, number> = {
                "OPTICAL_INTERFERENCE": 6,
                "COMPLEX_WAVEFORM": 5,
                "CONSTRUCTIVE_INTERFERENCE": 4,
                "DESTRUCTIVE_INTERFERENCE": 3,
                "PHASE_SHIFT": 2,
                "STANDING_WAVE": 1,
                "UNKNOWN": 0
            };

            const finalOp = opList.reduce((highest, current) =>
                opHierarchy[current] > opHierarchy[highest] ? current : highest
            , "STANDING_WAVE" as TensorOp);

            const avg = group.reduce((acc, curr) => ({
                vector_x_abs: acc.vector_x_abs + curr.params.vector_x_abs / count,
                vector_y_abs: acc.vector_y_abs + curr.params.vector_y_abs / count,
                vector_x_rel: acc.vector_x_rel + curr.params.vector_x_rel / count,
                vector_y_rel: acc.vector_y_rel + curr.params.vector_y_rel / count,
                amplification: acc.amplification + curr.params.amplification / count,
                spatial_delta: acc.spatial_delta + curr.params.spatial_delta / count
            }), { vector_x_abs: 0, vector_y_abs: 0, vector_x_rel: 0, vector_y_rel: 0, amplification: 0, spatial_delta: 0 });

            const refinedParams = {
                vector_x_abs: this.snapToGrid(avg.vector_x_abs),
                vector_y_abs: this.snapToGrid(avg.vector_y_abs),
                vector_x_rel: Number(avg.vector_x_rel.toFixed(3)),
                vector_y_rel: Number(avg.vector_y_rel.toFixed(3)),
                amplification: this.snapToGrid(avg.amplification),
                spatial_delta: this.snapToGrid(avg.spatial_delta)
            };

            const allInteractions = group.flatMap(g => g.interactions || []);
            const uniqueInteractionsMap = new Map<string, AgentInteraction>();
            
            allInteractions.forEach(interaction => {
                if (uniqueInteractionsMap.has(interaction.target_agent_id)) {
                    const existing = uniqueInteractionsMap.get(interaction.target_agent_id)!;
                    existing.distance_delta = Number(((existing.distance_delta + interaction.distance_delta) / 2).toFixed(2));
                    if (interaction.force_type === "COLLISION") existing.force_type = "COLLISION";
                } else {
                    uniqueInteractionsMap.set(interaction.target_agent_id, { ...interaction });
                }
            });

            // --- VSA: BUNDLE CONSENSUS ---
            // Menumpuk semua Hukum Holografik dari setiap observasi menjadi satu Hukum Universal
            const allLawHVs = group.map(g => this.vsa.stringToHv(g.holographic_law));
            const universalLawHV = this.vsa.bundle(allLawHVs);

            return {
                target_token: group[0]!.target_token,
                island_id: group[0]!.island_id,
                agent_id: group[0]!.agent_id,
                op: finalOp,
                params: refinedParams,
                interactions: Array.from(uniqueInteractionsMap.values()),
                holographic_law: this.vsa.hvToString(universalLawHV) // Hukum Universal
            };
        });
    }

    // ==========================================
    // 🧮 MATH UTILITIES
    // ==========================================

    private findAllAgents(grid: number[][]): WaveAgent[] {
        const height = grid.length;
        const width = grid[0]?.length || 0;
        const visited = Array.from({ length: height }, () => Array(width).fill(false));
        const agents: WaveAgent[] =[];
        const tokenCounter: Record<number, number> = {};

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const token = grid[y]![x]!;
                if (token !== 0 && !visited[y]![x]) {
                    tokenCounter[token] = (tokenCounter[token] || 0) + 1;
                    const island_id = tokenCounter[token]!;
                    const mask = this.floodFill(grid, x, y, token, visited);
                    const mass = this.calculateMass(mask);
                    
                    agents.push({
                        agent_id: `${token}_${island_id}`,
                        token,
                        island_id,
                        mask,
                        mass,
                        abs_center: this.calculateCenter(mask, mass),
                        rel_center: this.calculateRelativeCenter(mask, mass, width, height),
                        spread: this.calculateSpread(mask)
                    });
                }
            }
        }
        return agents;
    }

    private floodFill(grid: number[][], startX: number, startY: number, token: number, visited: boolean[][]): number[][] {
        const height = grid.length;
        const width = grid[0]!.length;
        const mask = Array.from({ length: height }, () => Array(width).fill(0));
        const stack = [[startX, startY]];

        while (stack.length > 0) {
            const [x, y] = stack.pop()!;
            if (x! < 0 || x! >= width || y! < 0 || y! >= height) continue;
            if (visited[y!]![x!] || grid[y!]![x!] !== token) continue;

            visited[y!]![x!] = true;
            mask[y!]![x!] = 1;

            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue;
                    stack.push([x! + i, y! + j]);
                }
            }
        }
        return mask;
    }

    private calculateSimilarityScore(inW: WaveAgent, outW: WaveAgent): number {
        const massDelta = Math.abs(inW.mass - outW.mass);
        const spreadDelta = Math.abs(inW.spread - outW.spread);
        const dist = Math.sqrt(
            Math.pow(outW.rel_center.x - inW.rel_center.x, 2) + 
            Math.pow(outW.rel_center.y - inW.rel_center.y, 2)
        );
        return (massDelta * 10) + (spreadDelta * 5) + (dist * 2);
    }

    private calculateMass(mask: number[][]): number {
        return mask.flat().reduce((a, b) => a + b, 0);
    }

    private calculateCenter(mask: number[][], mass: number): {x: number, y: number} {
        let tx = 0, ty = 0;
        mask.forEach((row, y) => row.forEach((val, x) => { 
            if (val > 0) { tx += x; ty += y; } 
        }));
        return { x: tx / (mass || 1), y: ty / (mass || 1) };
    }

    private calculateRelativeCenter(mask: number[][], mass: number, w: number, h: number): {x: number, y: number} {
        const abs = this.calculateCenter(mask, mass);
        return { x: abs.x / (Math.max(1, w - 1)), y: abs.y / (Math.max(1, h - 1)) };
    }

    private calculateSpread(mask: number[][]): number {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let hasMass = false;
        mask.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val > 0) {
                    hasMass = true;
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            });
        });
        if (!hasMass) return 0;
        return Math.max(maxX - minX + 1, maxY - minY + 1);
    }
}
