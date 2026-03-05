export function solveCrossFill(grid: number[][]): number[][] {
    const H = grid.length;
    const W = grid[0].length;
    const output = grid.map(row => row.map(() => 0)); // Start with empty grid or copy? Examples show 0 background.

    // Find all color 2 positions (vertical)
    const verticalCols = new Set<number>();
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (grid[r][c] === 2) {
                verticalCols.add(c);
            }
        }
    }

    // Find all color 1 and 3 positions (horizontal)
    const horizontalRows = new Map<number, number>();
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (grid[r][c] === 1 || grid[r][c] === 3) {
                horizontalRows.set(r, grid[r][c]);
            }
        }
    }

    // Apply vertical lines (color 2)
    for (const c of verticalCols) {
        for (let r = 0; r < H; r++) {
            output[r][c] = 2;
        }
    }

    // Apply horizontal lines (color 1 and 3) - overwriting vertical lines
    for (const [r, color] of horizontalRows) {
        for (let c = 0; c < W; c++) {
            output[r][c] = color;
        }
    }

    return output;
}
