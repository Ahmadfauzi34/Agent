/**
 * Enclosure Filling Solver
 * 
 * Pattern: Fill enclosed areas. Any '0' (black) cell that cannot reach the 
 * grid edge (because it's blocked by '3' or another color) is filled with '4' (yellow).
 */
export function solveEnclosure(grid: number[][], fillValue: number = 4): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    const output = grid.map(row => [...row]);
    
    // 1. Find all '0' cells that can reach the edge (Flood Fill from edges)
    const isOutside = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue: [number, number][] = [];

    for (let r = 0; r < rows; r++) {
        if (grid[r][0] === 0) queue.push([r, 0]);
        if (grid[r][cols - 1] === 0) queue.push([r, cols - 1]);
    }
    for (let c = 0; c < cols; c++) {
        if (grid[0][c] === 0) queue.push([0, c]);
        if (grid[rows - 1][c] === 0) queue.push([rows - 1, c]);
    }

    while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        if (r < 0 || r >= rows || c < 0 || c >= cols || isOutside[r][c] || grid[r][c] !== 0) continue;
        isOutside[r][c] = true;
        queue.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
    }

    // 2. All '0' cells that CANNOT reach the edge (isOutside === false) are changed to fillValue
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 0 && !isOutside[r][c]) {
                output[r][c] = fillValue;
            }
        }
    }

    return output;
}
