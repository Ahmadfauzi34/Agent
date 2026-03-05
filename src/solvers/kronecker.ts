/**
 * Kronecker Product Solver
 * 
 * Pattern: Fractal expansion. Each non-zero cell in the input grid is replaced 
 * by a copy of the entire input grid in the output grid.
 */
export function solveKronecker(input: number[][]): number[][] {
    const size = input.length;
    const outputSize = size * size;
    const output = Array.from({ length: outputSize }, () => Array(outputSize).fill(0));

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (input[r][c] !== 0) {
                // If the input cell is non-zero, copy the entire input grid into this output block
                for (let i = 0; i < size; i++) {
                    for (let j = 0; j < size; j++) {
                        output[r * size + i][c * size + j] = input[i][j];
                    }
                }
            }
        }
    }
    return output;
}
