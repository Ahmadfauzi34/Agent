/**
 * Local Neighborhood Solver (Signal Emission)
 * 
 * Pattern: Each non-zero color in the input emits a specific 3x3 pattern 
 * around it in the output. For example, color 2 might emit color 4 diagonally, 
 * and color 1 might emit color 7 orthogonally.
 * 
 * This solver learns the 3x3 output neighborhood for each input color from 
 * the training examples, and applies it to the test input.
 */
export function solveLocalNeighborhood(input: number[][], trainPairs?: {input: number[][], output: number[][]}[]): number[][] {
    if (!trainPairs || trainPairs.length === 0) return input;
    
    const rows = input.length;
    const cols = input[0].length;
    
    // 1. Learn patterns for each color
    const patterns = new Map<number, number[][]>();
    const inconsistentColors = new Set<number>();
    
    for (const pair of trainPairs) {
        const inGrid = pair.input;
        const outGrid = pair.output;
        
        for (let r = 0; r < inGrid.length; r++) {
            for (let c = 0; c < inGrid[0].length; c++) {
                const color = inGrid[r][c];
                if (color === 0) continue; // Skip background
                
                // Extract 3x3 neighborhood from output
                const neighborhood: number[][] = [];
                for (let i = -1; i <= 1; i++) {
                    const row: number[] = [];
                    for (let j = -1; j <= 1; j++) {
                        const outR = r + i;
                        const outC = c + j;
                        if (outR >= 0 && outR < outGrid.length && outC >= 0 && outC < outGrid[0].length) {
                            row.push(outGrid[outR][outC]);
                        } else {
                            row.push(0); // Pad with 0
                        }
                    }
                    neighborhood.push(row);
                }
                
                if (inconsistentColors.has(color)) continue;
                
                if (!patterns.has(color)) {
                    patterns.set(color, neighborhood);
                } else {
                    // Check consistency
                    const existing = patterns.get(color)!;
                    let isConsistent = true;
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            // If the output has a 0 but the pattern has a non-zero, it might be due to grid boundaries.
                            // Actually, if it's out of bounds, we padded with 0. The existing pattern might have non-zero there.
                            // To be safe, we only check consistency where both are within bounds of their respective grids.
                            // But for simplicity, let's just do an exact match, or allow 0s to be overwritten.
                            
                            // A better consistency check:
                            // The non-zero elements of the pattern should match.
                            // If both are non-zero, they must match.
                            if (existing[i][j] !== 0 && neighborhood[i][j] !== 0 && existing[i][j] !== neighborhood[i][j]) {
                                isConsistent = false;
                            }
                            // Merge patterns (take the non-zero value)
                            if (existing[i][j] === 0 && neighborhood[i][j] !== 0) {
                                existing[i][j] = neighborhood[i][j];
                            }
                        }
                    }
                    if (!isConsistent) {
                        inconsistentColors.add(color);
                        patterns.delete(color);
                    }
                }
            }
        }
    }
    
    // Check if we learned patterns for the colors in the test input
    let hasUsefulPattern = false;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = input[r][c];
            if (color !== 0 && patterns.has(color)) {
                // Check if the pattern is more than just the center pixel
                const pat = patterns.get(color)!;
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        if ((i !== 1 || j !== 1) && pat[i][j] !== 0) {
                            hasUsefulPattern = true;
                        }
                    }
                }
            }
        }
    }
    
    if (!hasUsefulPattern) return input; // Fallback
    
    // 2. Apply patterns to the input
    const output = Array.from({ length: rows }, () => Array(cols).fill(0));
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = input[r][c];
            if (color !== 0) {
                if (patterns.has(color)) {
                    const pat = patterns.get(color)!;
                    for (let i = -1; i <= 1; i++) {
                        for (let j = -1; j <= 1; j++) {
                            const outR = r + i;
                            const outC = c + j;
                            if (outR >= 0 && outR < rows && outC >= 0 && outC < cols) {
                                if (pat[i + 1][j + 1] !== 0) {
                                    output[outR][outC] = pat[i + 1][j + 1];
                                }
                            }
                        }
                    }
                } else {
                    // Just copy the pixel if no pattern
                    output[r][c] = color;
                }
            }
        }
    }
    
    return output;
}
