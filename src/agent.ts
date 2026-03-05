import { MetaReasoner } from './rrm/meta_reasoner.ts';
import { solveKronecker } from './solvers/kronecker.ts';
import { solveEnclosure } from './solvers/enclosure.ts';
import { solvePeriodicity } from './solvers/periodicity.ts';
import { solveShear } from './solvers/shear.ts';
import { solveIntersection } from './solvers/intersection.ts';
import { solveDiagonalTiling } from './solvers/diagonal_tiling.ts';
import { solveDiagonalOutlineTiling } from './solvers/diagonal_outline_tiling.ts';
import { solveSymmetricPattern } from './solvers/symmetric_pattern.ts';
import { solveGridCount } from './solvers/grid_count.ts';
import { solveOverlayNeighborhoods } from './solvers/overlay_neighborhoods.ts';
import { solveMoveToTouch } from './solvers/move_to_touch.ts';
import { solveExhaustive2x2 } from './solvers/exhaustive_2x2.ts';
import { solveMoveToAdjacency } from './solvers/move_to_adjacency.ts';
import { solveGridSpread } from './solvers/grid_spread.ts';
import { solveBarRanking } from './solvers/bar_ranking.ts';
import { solvePlusExpansion } from './solvers/plus_expansion.ts';
import { solveRepeatingLine } from './solvers/repeating_line.ts';
import { solveMasterCell } from './solvers/master_cell.ts';
import { solveMinorityBbox } from './solvers/minority_bbox.ts';
import { solveDirectionalCopy } from './solvers/directional_copy.ts';
import { solveLocalNeighborhood } from './solvers/local_neighborhood.ts';
import { solveColorSubstitution } from './solvers/color_substitution.ts';
import { solveSubgridConnections } from './solvers/subgrid_connections.ts';
import { solveCrossFill } from './solvers/cross_fill.ts';
import { solveMagneticAttraction } from './solvers/magnetic_attraction.ts';
import { solveSideComparison } from './solvers/side_comparison.ts';
import { solvePatternedSplit } from './solvers/patterned_split.ts';
import { solveGravity } from './solvers/gravity.ts';
import { solveFrameExtraction } from './solvers/frame_extraction.ts';

export class GridAgent {
    private metaReasoner: MetaReasoner;
    private solvers: Array<(input: number[][], trainPairs?: {input: number[][], output: number[][]}[]) => number[][]> = [
        Object.assign(solveGravity, { id: 'solveGravity' }),
        Object.assign(solveFrameExtraction, { id: 'solveFrameExtraction' }),
        Object.assign(solvePatternedSplit, { id: 'solvePatternedSplit' }),
        Object.assign(solveSideComparison, { id: 'solveSideComparison' }),
        Object.assign(solveMagneticAttraction, { id: 'solveMagneticAttraction' }),
        Object.assign(solveColorSubstitution, { id: 'solveColorSubstitution' }),
        Object.assign(solveCrossFill, { id: 'solveCrossFill' }),
        Object.assign(solveKronecker, { id: 'solveKronecker' }),
        Object.assign(solveEnclosure, { id: 'solveEnclosure' }),
        Object.assign((input: number[][]) => solvePeriodicity(input, 9, { 1: 2 }), { id: 'solvePeriodicity' }),
        Object.assign(solveShear, { id: 'solveShear' }),
        Object.assign(solveIntersection, { id: 'solveIntersection' }),
        Object.assign(solveDiagonalTiling, { id: 'solveDiagonalTiling' }),
        Object.assign(solveDiagonalOutlineTiling, { id: 'solveDiagonalOutlineTiling' }),
        Object.assign(solveSymmetricPattern, { id: 'solveSymmetricPattern' }),
        Object.assign(solveGridCount, { id: 'solveGridCount' }),
        Object.assign(solveOverlayNeighborhoods, { id: 'solveOverlayNeighborhoods' }),
        Object.assign(solveMoveToTouch, { id: 'solveMoveToTouch' }),
        Object.assign(solveExhaustive2x2, { id: 'solveExhaustive2x2' }),
        Object.assign(solveMoveToAdjacency, { id: 'solveMoveToAdjacency' }),
        Object.assign(solveGridSpread, { id: 'solveGridSpread' }),
        Object.assign(solveBarRanking, { id: 'solveBarRanking' }),
        Object.assign(solvePlusExpansion, { id: 'solvePlusExpansion' }),
        Object.assign(solveRepeatingLine, { id: 'solveRepeatingLine' }),
        Object.assign(solveMasterCell, { id: 'solveMasterCell' }),
        Object.assign(solveMinorityBbox, { id: 'solveMinorityBbox' }),
        Object.assign(solveDirectionalCopy, { id: 'solveDirectionalCopy' }),
        Object.assign((input: number[][], trainPairs: any) => solveLocalNeighborhood(input, trainPairs), { id: 'solveLocalNeighborhood' }),
        Object.assign(solveSubgridConnections, { id: 'solveSubgridConnections' })
    ];

    constructor() {
        this.metaReasoner = new MetaReasoner();
    }

    /**
     * Tries to solve a grid using the available solvers with recursive composition.
     */
    public solve(input: number[][], expectedOutput?: number[][], trainPairs?: {input: number[][], output: number[][]}[], testPairs?: {input: number[][], output: number[][]}[]) {
        console.log("\n--- RRM (Recursive Reasoning Machine) Activated ---");
        
        if (!trainPairs) {
            console.log("RRM: No training pairs provided. Using fallback search.");
            return this.fallbackSolve(input);
        }

        const result = this.recursiveSearch(input, trainPairs, 0, 2);
        if (result) {
            if (expectedOutput) {
                if (JSON.stringify(result) === JSON.stringify(expectedOutput)) {
                    console.log("RRM: Solution found and verified!");
                    return result;
                }
            } else {
                return result;
            }
        }

        console.log("RRM: No solution found via recursive search. Using fallback.");
        return this.fallbackSolve(input, trainPairs);
    }

    private recursiveSearch(
        currentInput: number[][], 
        currentTrainPairs: {input: number[][], output: number[][]}[], 
        depth: number, 
        maxDepth: number
    ): number[][] | null {
        if (depth > maxDepth) return null;

        // 1. Check if we already solved it (for all training pairs)
        let allSolved = true;
        for (const pair of currentTrainPairs) {
            if (JSON.stringify(pair.input) !== JSON.stringify(pair.output)) {
                allSolved = false;
                break;
            }
        }
        if (allSolved) return currentInput;

        // 2. Meta-Reasoning Phase
        const rankedSolvers = this.metaReasoner.selectRankedSolvers(currentTrainPairs, currentInput);
        
        // 3. Try the ranked solvers first
        const solversToTry = rankedSolvers.map(rs => rs.solver);
        
        // Always include all solvers as fallback, but ranked ones first
        const otherSolvers = this.solvers.filter(s => !solversToTry.includes(s));
        solversToTry.push(...otherSolvers);

        for (const solver of solversToTry) {
            try {
                const solverName = (solver as any).id || solver.name || 'anonymous';
                // Apply solver to current input
                const nextInput = solver(currentInput, currentTrainPairs);
                
                // Apply same solver to all training inputs to keep them in sync
                const nextTrainPairs = currentTrainPairs.map(pair => ({
                    input: solver(pair.input, currentTrainPairs),
                    output: pair.output
                }));

                // Check if this step made progress (at least for one pair)
                let madeProgress = false;
                for (let i = 0; i < currentTrainPairs.length; i++) {
                    if (JSON.stringify(nextTrainPairs[i].input) !== JSON.stringify(currentTrainPairs[i].input)) {
                        madeProgress = true;
                        break;
                    }
                }

                if (!madeProgress) continue;

                console.log(`RRM [Depth ${depth}]: Applied ${solverName}. Progress made.`);

                // Recurse
                const finalResult = this.recursiveSearch(nextInput, nextTrainPairs, depth + 1, maxDepth);
                if (finalResult) return finalResult;

            } catch (e) {
                continue;
            }
        }

        return null;
    }

    private fallbackSolve(input: number[][], trainPairs?: {input: number[][], output: number[][]}[]) {
        for (const solver of this.solvers) {
            try {
                const result = solver(input, trainPairs);
                if (result && result.length > 0) return result;
            } catch (e) {
                continue;
            }
        }
        return input;
    }
}
