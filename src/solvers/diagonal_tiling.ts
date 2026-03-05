/**
 * Diagonal Tiling Solver
 * 
 * Pattern: Identify a sequence of colors that repeat along diagonals 
 * (where r + c is constant). The output is a grid filled with this 
 * repeating sequence.
 */
export function solveDiagonalTiling(grid: number[][]): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // 1. Collect all (r+c, color) pairs for non-zero colors
    const pairs: { index: number, color: number }[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] !== 0) {
                pairs.push({ index: r + c, color: grid[r][c] });
            }
        }
    }

    if (pairs.length === 0) return grid;

    // 2. Find the smallest N such that (index % N) consistently maps to a color
    let bestN = -1;
    let bestSequence: number[] = [];

    for (let n = 1; n <= rows + cols; n++) {
        const sequence = new Array(n).fill(-1);
        let possible = true;
        for (const { index, color } of pairs) {
            const mod = index % n;
            if (sequence[mod] !== -1 && sequence[mod] !== color) {
                possible = false;
                break;
            }
            sequence[mod] = color;
        }

        if (possible) {
            // Check if there are any gaps in the sequence.
            // If there are gaps, we might need a larger N or it's not the right N.
            // But for these tasks, usually the smallest N works.
            bestN = n;
            bestSequence = sequence;
            break;
        }
    }

    if (bestN === -1) return grid;

    // 3. Fill the output grid
    const output = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const mod = (r + c) % bestN;
            output[r][c] = bestSequence[mod] === -1 ? 0 : bestSequence[mod];
        }
    }

    return output;
}
