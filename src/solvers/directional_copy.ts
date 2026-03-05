/**
 * Directional Copy Solver
 * 
 * Pattern: A "source" shape (the color with the most pixels) is copied and 
 * repeated in specific directions. The directions and colors of the copies are 
 * indicated by partial drawings (single pixels or small segments) of the shape 
 * in the immediate adjacent bounding boxes.
 */
export function solveDirectionalCopy(grid: number[][]): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // 1. Count pixels for each color
    const counts: { [color: number]: number } = {};
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = grid[r][c];
            if (color !== 0) {
                counts[color] = (counts[color] || 0) + 1;
            }
        }
    }
    
    // 2. Find source color (max pixels)
    let sourceColor = -1;
    let maxCount = 0;
    for (const colorStr in counts) {
        const color = parseInt(colorStr);
        if (counts[color] > maxCount) {
            maxCount = counts[color];
            sourceColor = color;
        }
    }
    
    if (sourceColor === -1) return grid;
    
    // 3. Find bounding box of source color
    let minR = rows, maxR = -1, minC = cols, maxC = -1;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === sourceColor) {
                minR = Math.min(minR, r);
                maxR = Math.max(maxR, r);
                minC = Math.min(minC, c);
                maxC = Math.max(maxC, c);
            }
        }
    }
    
    const H = maxR - minR + 1;
    const W = maxC - minC + 1;
    
    // Extract source mask
    const sourceMask: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
            if (grid[r][c] === sourceColor) {
                sourceMask[r - minR][c - minC] = true;
            }
        }
    }
    
    // 4. Find repetitions
    const repetitions = new Set<string>(); // Store as "color,k,m"
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = grid[r][c];
            if (color !== 0 && color !== sourceColor) {
                // Check which bounding box it falls into
                for (let k = -1; k <= 1; k++) {
                    for (let m = -1; m <= 1; m++) {
                        if (k === 0 && m === 0) continue;
                        
                        const boxMinR = minR + k * (H + 1);
                        const boxMaxR = maxR + k * (H + 1);
                        const boxMinC = minC + m * (W + 1);
                        const boxMaxC = maxC + m * (W + 1);
                        
                        if (r >= boxMinR && r <= boxMaxR && c >= boxMinC && c <= boxMaxC) {
                            const localR = r - boxMinR;
                            const localC = c - boxMinC;
                            if (sourceMask[localR][localC]) {
                                repetitions.add(`${color},${k},${m}`);
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 5. Draw output
    const output = Array.from({ length: rows }, () => Array(cols).fill(0));
    
    // Draw source shape
    for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
            if (sourceMask[r - minR][c - minC]) {
                output[r][c] = sourceColor;
            }
        }
    }
    
    // Draw repetitions
    for (const rep of repetitions) {
        const [colorStr, kStr, mStr] = rep.split(',');
        const color = parseInt(colorStr);
        const k = parseInt(kStr);
        const m = parseInt(mStr);
        
        const stepR = k * (H + 1);
        const stepC = m * (W + 1);
        
        let currR = minR + stepR;
        let currC = minC + stepC;
        
        while (
            currR <= rows - 1 && currR + H - 1 >= 0 &&
            currC <= cols - 1 && currC + W - 1 >= 0
        ) {
            for (let i = 0; i < H; i++) {
                for (let j = 0; j < W; j++) {
                    if (sourceMask[i][j]) {
                        const drawR = currR + i;
                        const drawC = currC + j;
                        if (drawR >= 0 && drawR < rows && drawC >= 0 && drawC < cols) {
                            output[drawR][drawC] = color;
                        }
                    }
                }
            }
            currR += stepR;
            currC += stepC;
        }
    }
    
    return output;
}
