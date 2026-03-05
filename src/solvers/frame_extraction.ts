export function solveFrameExtraction(grid: number[][]): number[][] {
    const H = grid.length;
    const W = grid[0].length;

    // Iterate through all possible colors
    for (let color = 1; color <= 9; color++) {
        // Find bounding box
        let minR = H, maxR = -1, minC = W, maxC = -1;
        let count = 0;

        for (let r = 0; r < H; r++) {
            for (let c = 0; c < W; c++) {
                if (grid[r][c] === color) {
                    if (r < minR) minR = r;
                    if (r > maxR) maxR = r;
                    if (c < minC) minC = c;
                    if (c > maxC) maxC = c;
                    count++;
                }
            }
        }

        if (count === 0) continue;

        // Check if it forms a frame
        // A frame must have width >= 3 and height >= 3 to contain something
        if (maxR - minR < 2 || maxC - minC < 2) continue;

        let isFrame = true;

        // Check top and bottom borders
        for (let c = minC; c <= maxC; c++) {
            if (grid[minR][c] !== color || grid[maxR][c] !== color) {
                isFrame = false;
                break;
            }
        }
        if (!isFrame) continue;

        // Check left and right borders
        for (let r = minR; r <= maxR; r++) {
            if (grid[r][minC] !== color || grid[r][maxC] !== color) {
                isFrame = false;
                break;
            }
        }
        if (!isFrame) continue;

        // Extract content
        const outputH = maxR - minR - 1;
        const outputW = maxC - minC - 1;
        const output = [];

        for (let r = 0; r < outputH; r++) {
            const row = [];
            for (let c = 0; c < outputW; c++) {
                row.push(grid[minR + 1 + r][minC + 1 + c]);
            }
            output.push(row);
        }

        return output;
    }

    return grid; // Fallback
}
