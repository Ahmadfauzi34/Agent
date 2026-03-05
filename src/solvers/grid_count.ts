export function solveGridCount(input: number[][]): number[][] {
    const H = input.length;
    const W = input[0].length;
    
    // Find colors that form full rows and full columns
    const fullRows = new Map<number, number>();
    const fullCols = new Map<number, number>();
    
    for (let r = 0; r < H; r++) {
        const firstColor = input[r][0];
        let isFull = true;
        for (let c = 1; c < W; c++) {
            if (input[r][c] !== firstColor) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            fullRows.set(firstColor, (fullRows.get(firstColor) || 0) + 1);
        }
    }
    
    for (let c = 0; c < W; c++) {
        const firstColor = input[0][c];
        let isFull = true;
        for (let r = 1; r < H; r++) {
            if (input[r][c] !== firstColor) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            fullCols.set(firstColor, (fullCols.get(firstColor) || 0) + 1);
        }
    }
    
    // Find the line color. It should be a color that forms BOTH full rows and full cols.
    // If there are multiple, maybe pick the one that is not the most frequent color overall.
    const colorCounts = new Map<number, number>();
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            const color = input[r][c];
            colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        }
    }
    
    let bgColor = -1;
    let maxCount = -1;
    for (const [color, count] of colorCounts.entries()) {
        if (count > maxCount) {
            maxCount = count;
            bgColor = color;
        }
    }
    
    let lineColor = -1;
    for (const [color, count] of colorCounts.entries()) {
        if (color !== bgColor && (fullRows.has(color) || fullCols.has(color))) {
            lineColor = color;
            break;
        }
    }
    
    if (lineColor === -1) {
        return input; // Not this pattern
    }
    
    const numH = fullRows.get(lineColor) || 0;
    const numV = fullCols.get(lineColor) || 0;
    
    // Output size is (numH + 1) x (numV + 1)
    const outH = numH + 1;
    const outW = numV + 1;
    
    const output: number[][] = Array.from({ length: outH }, () => Array(outW).fill(bgColor));
    return output;
}
