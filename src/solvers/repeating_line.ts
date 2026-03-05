/**
 * Repeating Line Solver
 * 
 * Pattern: Identify two non-zero pixels. Depending on the grid's aspect ratio, 
 * create a repeating pattern of rows or columns starting from the first pixel.
 */
export function solveRepeatingLine(grid: number[][]): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;

    // 1. Find all non-zero pixels
    const pixels: { r: number, c: number, v: number }[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] !== 0) {
                pixels.push({ r, c, v: grid[r][c] });
            }
        }
    }

    if (pixels.length !== 2) return grid;

    const output = grid.map(row => [...row]);

    if (cols > rows) {
        // Column pattern
        pixels.sort((a, b) => a.c - b.c);
        const cMin = pixels[0].c;
        const vMin = pixels[0].v;
        const cMax = pixels[1].c;
        const vMax = pixels[1].v;
        const P = 2 * (cMax - cMin);

        for (let c = cMin; c < cols; c++) {
            let color = 0;
            if ((c - cMin) % P === 0) color = vMin;
            else if ((c - cMax) % P === 0) color = vMax;
            
            if (color !== 0) {
                for (let r = 0; r < rows; r++) {
                    output[r][c] = color;
                }
            }
        }
    } else {
        // Row pattern
        pixels.sort((a, b) => a.r - b.r);
        const rMin = pixels[0].r;
        const vMin = pixels[0].v;
        const rMax = pixels[1].r;
        const vMax = pixels[1].v;
        const P = 2 * (rMax - rMin);

        for (let r = rMin; r < rows; r++) {
            let color = 0;
            if ((r - rMin) % P === 0) color = vMin;
            else if ((r - rMax) % P === 0) color = vMax;
            
            if (color !== 0) {
                for (let c = 0; c < cols; c++) {
                    output[r][c] = color;
                }
            }
        }
    }

    return output;
}
