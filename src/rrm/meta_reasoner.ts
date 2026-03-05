/**
 * RRM (Recursive Reasoning Machine) - Meta Reasoner
 * 
 * This module takes the "Physics" and "Signal" features from the Analyzer
 * and decides WHICH strategy to use.
 * 
 * It performs "Hypothesis Testing":
 * 1. Look at Input -> Output changes in training data.
 * 2. Formulate a hypothesis (e.g., "Mass doubled -> Scaling").
 * 3. Select the best solver.
 */

import { analyzeGrid } from './features.ts';
import { solveGravity } from '../solvers/gravity.ts';
import { solveFrameExtraction } from '../solvers/frame_extraction.ts';
import { solvePatternedSplit } from '../solvers/patterned_split.ts';
import { solveSideComparison } from '../solvers/side_comparison.ts';
import { solveMagneticAttraction } from '../solvers/magnetic_attraction.ts';
import { solveCrossFill } from '../solvers/cross_fill.ts';
import { solveColorSubstitution } from '../solvers/color_substitution.ts';

type SolverFunction = (input: number[][], trainPairs?: {input: number[][], output: number[][]}[]) => number[][];

export class MetaReasoner {
    
    public selectRankedSolvers(trainPairs: {input: number[][], output: number[][]}[], testInput: number[][]): Array<{id: string, solver: SolverFunction}> {
        console.log("RRM: Analyzing Physics & Signals...");

        // 1. Analyze Training Data
        const scores = this.formulateHypotheses(trainPairs);
        
        // 2. Map IDs to Solver Functions
        return scores.map(s => ({
            id: s.id,
            solver: this.getSolverById(s.id)
        })).filter(s => s.id !== 'UNKNOWN');
    }

    private getSolverById(id: string): SolverFunction {
        switch (id) {
            case 'GRAVITY': return solveGravity;
            case 'FRAME_EXTRACTION': return solveFrameExtraction;
            case 'PATTERN_SPLIT': return solvePatternedSplit;
            case 'SIDE_COMPARISON': return solveSideComparison;
            case 'MAGNETIC_ATTRACTION': return solveMagneticAttraction;
            case 'CROSS_FILL': return solveCrossFill;
            case 'COLOR_SUBSTITUTION': return solveColorSubstitution;
            default: return (input) => input;
        }
    }

    private formulateHypotheses(trainPairs: {input: number[][], output: number[][]}[]) : Array<{id: string, val: number}> {
        let scoreGravity = 0;
        let scoreFrame = 0;
        let scoreSplit = 0;
        let scoreSide = 0;
        let scoreMagnetic = 0;
        let scoreColor = 0;

        for (const pair of trainPairs) {
            const inFeat = analyzeGrid(pair.input);
            const outFeat = analyzeGrid(pair.output);

            const inH = pair.input.length;
            const inW = pair.input[0].length;
            const outH = pair.output.length;
            const outW = pair.output[0].length;

            // --- Hypothesis 1: Frame Extraction ---
            // Physics: Input Mass is huge, Output Mass is small (reduction).
            // Signal: Input has a "container" (high density at edges?).
            // Simple check: Output size is significantly smaller than Input size?
            if (outFeat.boundingBox.h < inFeat.boundingBox.h || outFeat.boundingBox.w < inFeat.boundingBox.w) {
                scoreFrame += 1;
            }
            // Strong indicator: Grid size reduction
            if (outH < inH || outW < inW) {
                scoreFrame += 2;
            }

            // --- Hypothesis 2: Pattern Split ---
            // Signal: Input has strong Periodicity (repeating rows/cols).
            // Physics: Output is a "slice" of the input.
            if (inFeat.periodicity.rowPeriod > 0 || inFeat.periodicity.colPeriod > 0) {
                scoreSplit += 2; // Strong signal indicator
            }
            // Check if input height is exactly 2x or 3x output height (Split)
            if (inH === 2 * outH || inH === 3 * outH) {
                scoreSplit += 3;
            }

            // --- Hypothesis 3: Side Comparison ---
            // Signal: Input has high Symmetry (Left vs Right).
            // Physics: Center of Mass is roughly in the middle.
            // Check if input width is 2x output width (Left/Right split)
            if (inW === 2 * outW) {
                scoreSide += 3;
            }
            // Check for separator line (vertical line in middle)
            const midCol = Math.floor(inW / 2);
            let isSeparator = true;
            for(let r=0; r<inH; r++) {
                if(pair.input[r][midCol] === 0) isSeparator = false; // Assuming separator is colored
            }
            if (isSeparator) scoreSide += 2;


            // --- Hypothesis 4: Magnetic Attraction ---
            // Physics: Mass is conserved (Input Mass == Output Mass).
            // Physics: Center of Mass SHIFTS (Movement).
            // Constraint: Grid size usually stays the same for movement.
            if (inH === outH && inW === outW) {
                if (inFeat.mass === outFeat.mass && inFeat.mass > 0) {
                    // Check if CoM moved
                    const dr = Math.abs(outFeat.centerOfMass.r - inFeat.centerOfMass.r);
                    const dc = Math.abs(outFeat.centerOfMass.c - inFeat.centerOfMass.c);
                    if (dr > 0.1 || dc > 0.1) {
                        scoreMagnetic += 2; // Movement detected!
                    }
                }
            }

            // --- Hypothesis 5: Gravity ---
            // Physics: Mass is conserved.
            // Physics: Center of Mass moves DOWN (r increases).
            if (inH === outH && inW === outW) {
                if (inFeat.mass === outFeat.mass && inFeat.mass > 0) {
                    const dr = outFeat.centerOfMass.r - inFeat.centerOfMass.r;
                    const dc = Math.abs(outFeat.centerOfMass.c - inFeat.centerOfMass.c);
                    if (dr > 0.5 && dc < 0.1) {
                        scoreGravity += 5; // Stronger than magnetic if pure vertical
                    }
                }
            }

            // --- Hypothesis 6: Color Substitution ---
            // Physics: Mass is conserved.
            // Physics: Center of Mass is UNCHANGED.
            // Signal: Colors are different.
            if (inH === outH && inW === outW) {
                if (inFeat.mass === outFeat.mass) {
                    if (Math.abs(outFeat.centerOfMass.r - inFeat.centerOfMass.r) < 0.1 && 
                        Math.abs(outFeat.centerOfMass.c - inFeat.centerOfMass.c) < 0.1) {
                        
                        // Check if colors actually changed
                        let colorsChanged = false;
                        for(let r=0; r<inH; r++) {
                            for(let c=0; c<inW; c++) {
                                if(pair.input[r][c] !== pair.output[r][c]) {
                                    colorsChanged = true;
                                    break;
                                }
                            }
                            if(colorsChanged) break;
                        }
                        if(colorsChanged) scoreColor += 3;
                    }
                }
            }
        }

        // Select Winner
        const scores = [
            { id: 'GRAVITY', val: scoreGravity },
            { id: 'FRAME_EXTRACTION', val: scoreFrame },
            { id: 'PATTERN_SPLIT', val: scoreSplit },
            { id: 'SIDE_COMPARISON', val: scoreSide },
            { id: 'MAGNETIC_ATTRACTION', val: scoreMagnetic },
            { id: 'COLOR_SUBSTITUTION', val: scoreColor }
        ];

        scores.sort((a, b) => b.val - a.val);

        return scores.filter(s => s.val > 0);
    }
}
