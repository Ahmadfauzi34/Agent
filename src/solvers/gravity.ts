
/**
 * Solver: Gravity
 * 
 * Objects move in a specified direction until they hit an obstacle or the edge.
 * Default direction is down (row increases).
 */
export function solveGravity(grid: number[][], direction: {dr: number, dc: number} = {dr: 1, dc: 0}): number[][] {
    const H = grid.length;
    const W = grid[0].length;
    const result = grid.map(row => [...row]);
    
    let changed = true;
    while (changed) {
        changed = false;
        // Iterate in reverse order of direction to avoid collisions in the same step
        // For 'down', we go from bottom to top
        const rowStart = direction.dr > 0 ? H - 1 : 0;
        const rowEnd = direction.dr > 0 ? -1 : H;
        const rowStep = direction.dr > 0 ? -1 : 1;

        for (let r = rowStart; r !== rowEnd; r += rowStep) {
            for (let c = 0; c < W; c++) {
                if (result[r][c] !== 0) {
                    const nr = r + direction.dr;
                    const nc = c + direction.dc;
                    
                    if (nr >= 0 && nr < H && nc >= 0 && nc < W && result[nr][nc] === 0) {
                        result[nr][nc] = result[r][c];
                        result[r][c] = 0;
                        changed = true;
                    }
                }
            }
        }
    }
    
    return result;
}
