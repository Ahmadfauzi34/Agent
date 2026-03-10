export type TensorOp = 
    | "STANDING_WAVE" 
    | "PHASE_SHIFT" 
    | "CONSTRUCTIVE_INTERFERENCE"
    | "DESTRUCTIVE_INTERFERENCE"
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
        const uniqueTokens = Array.from(
            new Set(trainPairs[0].input.flatMap(row => row).filter(val => val !== 0))
        );

        const rules = uniqueTokens.map(token => {
            const inWave = this.createWaveMask(trainPairs[0].input, token);
            const outWave = this.createWaveMask(trainPairs[0].output, token);
            return this.calculateInterference(token, inWave, outWave);
        });

        const dominantOp = this.getDominantOperation(rules);

        const logicMap: Record<string, string> = {
            "STANDING_WAVE": "STATE_PRESERVATION",
            "PHASE_SHIFT": "TRANSLATIONAL_DYNAMICS",
            "CONSTRUCTIVE_INTERFERENCE": "MORPHOLOGICAL_EXPANSION",
            "DESTRUCTIVE_INTERFERENCE": "MORPHOLOGICAL_DECAY",
            "UNKNOWN": "NON_LINEAR_DYNAMICS"
        };

        const mechanicsMap: Record<string, string> = {
            "STANDING_WAVE": "RESONANT_ANCHORING",
            "PHASE_SHIFT": "WAVE_PROPAGATION",
            "CONSTRUCTIVE_INTERFERENCE": "WAVE_DISPERSION", // Updated to reflect spatial expansion
            "DESTRUCTIVE_INTERFERENCE": "WAVE_COLLAPSE",
            "UNKNOWN": "ENTROPY_INCREASE"
        };

        return {
            task_id: taskId,
            logic_type: logicMap[dominantOp] || "QUANTUM_FLUCTUATION",
            mechanics: mechanicsMap[dominantOp] || "UNKNOWN_MECHANICS",
            description: "Differentiable spatio-temporal wave interference",
            rules: rules,
            target_seed: Math.floor(Math.random() * 19999) + 80000
        };
    }

    private calculateInterference(token: number, inWave: number[][], outWave: number[][]): TensorRule {
        // 1. Calculate Mass (Amplitude Sum)
        const massIn = this.tensorSum(inWave);
        const massOut = this.tensorSum(outWave);
        const massDelta = massOut - massIn;
        
        // 2. Calculate Phase Center (Center of Mass)
        const [cxIn, cyIn] = this.calculatePhaseCenter(inWave, massIn);
        const [cxOut, cyOut] = this.calculatePhaseCenter(outWave, massOut);
        
        // 3. Calculate Shift Vector
        const shiftX = Math.round(cxOut - cxIn) || 0;
        const shiftY = Math.round(cyOut - cyIn) || 0;

        // 4. Calculate Spatial Dispersion (Bounding Box Area / Spread)
        // This calculates if the wave physically spread out (radius)
        const spreadIn = this.calculateSpatialSpread(inWave);
        const spreadOut = this.calculateSpatialSpread(outWave);
        
        // Dispersion radius is roughly the difference in bounding box dimensions divided by 2
        const dispersionRadius = Math.max(0, Math.round((spreadOut - spreadIn) / 2));

        // 5. Generate Interference Signature
        const signDelta = Math.sign(massDelta); 
        const isShifted = Math.min(1, Math.abs(shiftX) + Math.abs(shiftY)); 
        
        const signature = `${signDelta}_${isShifted}`;

        // 6. Dictionary Routing
        const operationMap: Record<string, TensorOp> = {
            "0_0": "STANDING_WAVE",
            "0_1": "PHASE_SHIFT",
            "1_0": "CONSTRUCTIVE_INTERFERENCE",
            "1_1": "CONSTRUCTIVE_INTERFERENCE",
            "-1_0": "DESTRUCTIVE_INTERFERENCE",
            "-1_1": "DESTRUCTIVE_INTERFERENCE"
        };

        const op = operationMap[signature] || "UNKNOWN";

        // 7. Parameter Generation Map (Now includes Spatial Dispersion)
        const paramsMap: Record<string, any> = {
            "STANDING_WAVE": { 
                energy_state: "conserved", 
                phase_shift: 0 
            },
            "PHASE_SHIFT": { 
                vector_x: shiftX, 
                vector_y: shiftY, 
                phase_angle_rad: Math.atan2(shiftY, shiftX) 
            },
            "CONSTRUCTIVE_INTERFERENCE": { 
                amplification_factor: massIn === 0 ? Infinity : Number((massOut / massIn).toFixed(2)),
                phase_dispersion_radius: dispersionRadius // NEW: Spatial expansion
            },
            "DESTRUCTIVE_INTERFERENCE": { 
                attenuation_factor: massIn === 0 ? 0 : Number((massOut / massIn).toFixed(2)),
                phase_contraction_radius: Math.max(0, Math.round((spreadIn - spreadOut) / 2)) // NEW: Spatial contraction
            },
            "UNKNOWN": { entropy: "high" }
        };

        return {
            target_token: token,
            op: op,
            params: paramsMap[op]
        };
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

    // Calculates the maximum spatial extent (width or height of bounding box)
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
        
        // Return the largest dimension as the "spread"
        return Math.max(width, height);
    }

    private getDominantOperation(rules: TensorRule[]): string {
        const opScores = rules.reduce((acc, r) => {
            acc[r.op] = (acc[r.op] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.keys(opScores).sort((a, b) => opScores[b] - opScores[a])[0] || "UNKNOWN";
    }
}
