export type TensorOp = 
    | "STANDING_WAVE" 
    | "PHASE_SHIFT" 
    | "CONSTRUCTIVE_INTERFERENCE"
    | "DESTRUCTIVE_INTERFERENCE"
    | "COMPLEX_WAVEFORM" // NEW: Bergerak + Berubah ukuran
    | "UNKNOWN";

export interface TensorRule {
    target_token: number | string;
    op: TensorOp;
    params?: Record<string, any>;
}

export interface TensorSolution {
    task_id: string;
    logic_type: string;
    mechanics: string;
    description: string;
    rules: TensorRule[];
    target_seed: number;
}

export class ARCTensorEngine {
    
    public solveTensor(taskId: string, trainPairs: {input: number[][], output: number[][]}[]) : TensorSolution {
        // FIX 3: Ambil SEMUA warna unik dari Input DAN Output di SEMUA pasang
        const uniqueTokens = new Set<number>();
        trainPairs.forEach(pair => {
            pair.input.flat().forEach(v => { if (v !== 0) uniqueTokens.add(v) });
            pair.output.flat().forEach(v => { if (v !== 0) uniqueTokens.add(v) });
        });

        const rules = Array.from(uniqueTokens).map(token => {
            // FIX 1: Analisa melintasi SEMUA training pair untuk mencari rata-rata/konsistensi
            return this.calculateInterferenceConsensus(token, trainPairs);
        });

        const dominantOp = this.getDominantOperation(rules);

        // FIX 4: Deterministic Seed Generation dari Task ID
        const deterministicSeed = 80000 + (parseInt(taskId.substring(0, 4), 16) % 19999);

        return {
            task_id: taskId,
            logic_type: this.mapLogic(dominantOp),
            mechanics: this.mapMechanics(dominantOp),
            description: "Deterministic Spatio-Temporal Wave Interference",
            rules: rules,
            target_seed: deterministicSeed
        };
    }

    private calculateInterferenceConsensus(token: number, trainPairs: any[]): TensorRule {
        let totalMassIn = 0, totalMassOut = 0;
        let totalShiftX = 0, totalShiftY = 0;
        let totalSpreadIn = 0, totalSpreadOut = 0;

        trainPairs.forEach(pair => {
            const inWave = this.createWaveMask(pair.input, token);
            const outWave = this.createWaveMask(pair.output, token);

            const mIn = this.tensorSum(inWave);
            const mOut = this.tensorSum(outWave);
            totalMassIn += mIn;
            totalMassOut += mOut;

            if (mIn > 0 && mOut > 0) {
                const [cxIn, cyIn] = this.calculatePhaseCenter(inWave, mIn);
                const [cxOut, cyOut] = this.calculatePhaseCenter(outWave, mOut);
                totalShiftX += (cxOut - cxIn);
                totalShiftY += (cyOut - cyIn);
            }

            totalSpreadIn += this.calculateSpatialSpread(inWave);
            totalSpreadOut += this.calculateSpatialSpread(outWave);
        });

        // Rata-rata dari seluruh training data
        const pairsCount = trainPairs.length;
        const avgShiftX = Math.round(totalShiftX / pairsCount);
        const avgShiftY = Math.round(totalShiftY / pairsCount);
        const massDelta = totalMassOut - totalMassIn;
        
        const dispersionRadius = Math.max(0, Math.round((totalSpreadOut - totalSpreadIn) / (2 * pairsCount)));
        const contractionRadius = Math.max(0, Math.round((totalSpreadIn - totalSpreadOut) / (2 * pairsCount)));

        const signDelta = Math.sign(massDelta); 
        const isShifted = Math.min(1, Math.abs(avgShiftX) + Math.abs(avgShiftY)); 
        
        const signature = `${signDelta}_${isShifted}`;

        const operationMap: Record<string, TensorOp> = {
            "0_0": "STANDING_WAVE",
            "0_1": "PHASE_SHIFT",
            "1_0": "CONSTRUCTIVE_INTERFERENCE",
            "1_1": "COMPLEX_WAVEFORM", // FIX 2: Tumbuh + Bergeser
            "-1_0": "DESTRUCTIVE_INTERFERENCE",
            "-1_1": "COMPLEX_WAVEFORM"
        };

        const op = operationMap[signature] || "UNKNOWN";

        const paramsMap: Record<string, any> = {
            "STANDING_WAVE": { energy_state: "conserved" },
            "PHASE_SHIFT": { vector_x: avgShiftX, vector_y: avgShiftY },
            "CONSTRUCTIVE_INTERFERENCE": { 
                amplification_factor: totalMassIn === 0 ? Infinity : Number((totalMassOut / totalMassIn).toFixed(2)),
                phase_dispersion_radius: dispersionRadius 
            },
            "DESTRUCTIVE_INTERFERENCE": { 
                attenuation_factor: totalMassIn === 0 ? 0 : Number((totalMassOut / totalMassIn).toFixed(2)),
                phase_contraction_radius: contractionRadius 
            },
            "COMPLEX_WAVEFORM": {
                vector_x: avgShiftX, vector_y: avgShiftY,
                amplification_factor: totalMassIn === 0 ? 0 : Number((totalMassOut / totalMassIn).toFixed(2)),
                spatial_delta: dispersionRadius > 0 ? dispersionRadius : -contractionRadius
            },
            "UNKNOWN": { entropy: "high" }
        };

        return { target_token: token, op: op, params: paramsMap[op] };
    }

    // --- PURE FUNCTIONAL UTILITIES ---

    private createWaveMask(manifold: number[][], token: number): number[][] {
        return manifold.map(row => row.map(val => val === token ? 1 : 0));
    }

    private tensorSum(tensor: number[][]): number {
        return tensor.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
    }

    private calculatePhaseCenter(tensor: number[][], mass: number): [number, number] {
        const points = tensor.flatMap((row, y) => row.map((val, x) => ({x, y, val})));
        const safeMass = mass || 1; 
        
        const cx = points.reduce((sum, p) => sum + p.x * p.val, 0) / safeMass;
        const cy = points.reduce((sum, p) => sum + p.y * p.val, 0) / safeMass;
        
        const massMultiplier = Math.min(1, mass);
        return [cx * massMultiplier, cy * massMultiplier];
    }

    private calculateSpatialSpread(tensor: number[][]): number {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let hasMass = false;

        tensor.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val > 0) {
                    hasMass = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            });
        });

        if (!hasMass) return 0;
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        return Math.max(width, height);
    }

    private getDominantOperation(rules: TensorRule[]): string {
        const opScores = rules.reduce((acc, r) => {
            acc[r.op] = (acc[r.op] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.keys(opScores).sort((a, b) => opScores[b] - opScores[a])[0] || "UNKNOWN";
    }

    private mapLogic(op: string): string {
        const logicMap: Record<string, string> = {
            "STANDING_WAVE": "STATE_PRESERVATION",
            "PHASE_SHIFT": "TRANSLATIONAL_DYNAMICS",
            "CONSTRUCTIVE_INTERFERENCE": "MORPHOLOGICAL_EXPANSION",
            "DESTRUCTIVE_INTERFERENCE": "MORPHOLOGICAL_DECAY",
            "COMPLEX_WAVEFORM": "NON_LINEAR_DYNAMICS",
            "UNKNOWN": "QUANTUM_FLUCTUATION"
        };
        return logicMap[op] || "UNKNOWN";
    }

    private mapMechanics(op: string): string {
        const mechanicsMap: Record<string, string> = {
            "STANDING_WAVE": "RESONANT_ANCHORING",
            "PHASE_SHIFT": "WAVE_PROPAGATION",
            "CONSTRUCTIVE_INTERFERENCE": "WAVE_DISPERSION",
            "DESTRUCTIVE_INTERFERENCE": "WAVE_COLLAPSE",
            "COMPLEX_WAVEFORM": "SPATIO_TEMPORAL_SUPERPOSITION",
            "UNKNOWN": "ENTROPY_INCREASE"
        };
        return mechanicsMap[op] || "UNKNOWN";
    }
}
