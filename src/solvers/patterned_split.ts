export function solvePatternedSplit(grid: number[][]): number[][] {
    const H = grid.length;
    const W = grid[0].length;
    const output = grid.map(row => row.map(() => 0));

    // Find the two colors and their positions
    let topPixel = {r: -1, c: -1, color: 0};
    let botPixel = {r: -1, c: -1, color: 0};

    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (grid[r][c] !== 0) {
                if (r < H / 2) {
                    topPixel = {r, c, color: grid[r][c]};
                } else {
                    botPixel = {r, c, color: grid[r][c]};
                }
            }
        }
    }

    if (topPixel.color === 0 || botPixel.color === 0) return grid; // Should not happen

    // Fill Top Half (0 to H/2 - 1)
    for (let r = 0; r < H / 2; r++) {
        // Default: Fill borders
        output[r][0] = topPixel.color;
        output[r][W - 1] = topPixel.color;

        // Fill full row if it matches pattern
        // Pattern: The row of the pixel, and rows at distance 2, 4, ... upwards/downwards?
        // Based on examples: Row 2 is pixel. Row 0 is full.
        // So full rows at r_top, r_top - 2, r_top - 4...
        if (Math.abs(r - topPixel.r) % 2 === 0 && r <= topPixel.r) {
             for (let c = 0; c < W; c++) output[r][c] = topPixel.color;
        }
    }

    // Fill Bottom Half (H/2 to H - 1)
    for (let r = Math.floor(H / 2); r < H; r++) {
        // Default: Fill borders
        output[r][0] = botPixel.color;
        output[r][W - 1] = botPixel.color;

        // Fill full row if it matches pattern
        // Based on examples: Row 7 is pixel. Row 9 is full.
        // So full rows at r_bot, r_bot + 2, r_bot + 4...
        if (Math.abs(r - botPixel.r) % 2 === 0 && r >= botPixel.r) {
             for (let c = 0; c < W; c++) output[r][c] = botPixel.color;
        }
    }

    return output;
}
