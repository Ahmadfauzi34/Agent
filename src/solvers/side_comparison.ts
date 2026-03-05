export function solveSideComparison(grid: number[][]): number[][] {
    const H = grid.length;
    const W = grid[0].length;
    
    // Check if width is odd and has a center column
    if (W % 2 === 0) return grid; // Should be odd
    
    const W_out = Math.floor(W / 2);
    const output = [];

    for (let r = 0; r < H; r++) {
        const row = [];
        for (let c = 0; c < W_out; c++) {
            const L = grid[r][c];
            const R = grid[r][c + W_out + 1];
            
            if (L === 0 && R === 0) {
                row.push(8);
            } else {
                row.push(0);
            }
        }
        output.push(row);
    }

    return output;
}
