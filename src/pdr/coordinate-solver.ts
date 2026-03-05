import { PDRLogger } from './pdr-debug';
import { PatternLibrary } from '../arc/PatternLibrary';

type Point = { x: number, y: number };

export class CoordinateSolver {
    
    // Mencari rumus transformasi f(p) -> p'
    static async solve(inputs: Point[], outputs: Point[], gridW: number, gridH: number): Promise<((p: Point) => Point) | null> {
        if (inputs.length !== outputs.length || inputs.length === 0) return null;

        PDRLogger.trace(`[CoordinateSolver] Mencari pola transformasi untuk ${inputs.length} pasang titik...`);

        // 0. Cek PatternLibrary terlebih dahulu
        const lib = PatternLibrary.getInstance();
        const bestPattern = await lib.getBestPattern(inputs, outputs);
        if (bestPattern) {
            PDRLogger.debug(`[CoordinateSolver] 💡 Menggunakan pola dari PatternLibrary: ${bestPattern.formulaName}`);
            return (p: Point) => ({
                x: bestPattern.a * p.x + bestPattern.b * p.y + bestPattern.c,
                y: bestPattern.d * p.x + bestPattern.e * p.y + bestPattern.f
            });
        }

        let bestScore = -1;
        let bestTransform: ((p: Point) => Point) | null = null;
        let bestName = "";
        let bestParams: { a: number, b: number, c: number, d: number, e: number, f: number } | null = null;

        // Fungsi helper untuk menilai transformasi
        const evaluate = (name: string, transform: (p: Point) => Point, params?: { a: number, b: number, c: number, d: number, e: number, f: number }) => {
            let matches = 0;
            
            inputs.forEach((p, i) => {
                const out = transform(p);
                // Toleransi float 0.1
                if (Math.abs(out.x - outputs[i].x) < 0.1 && Math.abs(out.y - outputs[i].y) < 0.1) {
                    matches++;
                }
            });

            // Skor = (Jumlah Match / Total Data) * Bobot Kompleksitas
            let complexityWeight = 1.0;
            if (name.includes("Linear")) complexityWeight = 0.8;

            const score = (matches / inputs.length) * complexityWeight;

            if (score > bestScore) {
                bestScore = score;
                bestTransform = transform;
                bestName = name;
                bestParams = params || null;
                PDRLogger.trace(`   🌟 Kandidat Terbaik Baru: ${name} (Score: ${score.toFixed(2)}, Matches: ${matches}/${inputs.length})`);
            }
        };

        // ... (rest of the evaluation logic)
        // 1. Cek Swap XY
        evaluate("Swap XY", (p) => ({ x: p.y, y: p.x }));

        // 2. Cek Mirror X
        evaluate("Mirror X", (p) => ({ x: gridW - 1 - p.x, y: p.y }));

        // 3. Cek Mirror Y
        evaluate("Mirror Y", (p) => ({ x: p.x, y: gridH - 1 - p.y }));

        // 4. Cek Rotate 90 CW
        evaluate("Rotate 90 CW", (p) => ({ x: gridH - 1 - p.y, y: p.x }));

        // 5. Cek Rotate 90 CCW
        evaluate("Rotate 90 CCW", (p) => ({ x: p.y, y: gridW - 1 - p.x }));

        // 6. Cek Rotate 180
        evaluate("Rotate 180", (p) => ({ x: gridW - 1 - p.x, y: gridH - 1 - p.y }));

        // 7. Cek Linear Transformation (Affine) sederhana: x' = ax + by + c
        const params = [-1, 0, 1];
        const offsets = [-2, -1, 0, 1, 2];

        for (const a of params) {
            for (const b of params) {
                for (const c of offsets) { 
                    const xFormula = (p: Point) => a * p.x + b * p.y + c;
                    let xMatches = 0;
                    inputs.forEach((p, i) => {
                         if (Math.abs(xFormula(p) - outputs[i].x) < 0.1) xMatches++;
                    });
                    
                    if (xMatches === 0) continue;

                    for (const d of params) {
                        for (const e of params) {
                            for (const f of offsets) {
                                const formulaName = `Linear [x'=${a}x+${b}y+${c}, y'=${d}x+${e}y+${f}]`;
                                PDRLogger.trace(`   🧪 Menguji: ${formulaName}`);
                                evaluate(formulaName, (p) => ({ 
                                    x: a * p.x + b * p.y + c, 
                                    y: d * p.x + e * p.y + f 
                                }), { a, b, c, d, e, f });
                            }
                        }
                    }
                }
            }
        }

        // Ambang batas penerimaan: Minimal 50% data cocok
        if (bestScore >= 0.4) {
            PDRLogger.debug(`[CoordinateSolver] Memilih Transformasi: ${bestName} (Confidence: ${(bestScore*100).toFixed(0)}%)`);
            
            // Simpan ke library jika ini adalah transformasi linear
            if (bestName.startsWith("Linear") && bestParams) {
                await lib.addPattern({
                    version: "1.0.0",
                    formulaName: bestName,
                    ...bestParams,
                    accuracy: bestScore,
                    usageCount: 0,
                    lastUsed: 0
                });
            }
            
            return bestTransform;
        }

        return null;
    }
    // ...

    private static check(inputs: Point[], outputs: Point[], transform: (p: Point) => Point): boolean {
        return inputs.every((p, i) => {
            const res = transform(p);
            return res.x === outputs[i].x && res.y === outputs[i].y;
        });
    }
}
