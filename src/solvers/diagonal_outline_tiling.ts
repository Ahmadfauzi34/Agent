export function solveDiagonalOutlineTiling(input: number[][]): number[][] {
    const H = input.length;
    const W = input[0].length;
    
    // Check if we should apply this solver
    // Usually the input is small and mostly 0s with a few colored cells.
    // Let's just try it and if it matches training, we use it.
    // Wait, the agent will try it and check against training pairs.
    
    const outH = H * 2;
    const outW = W * 2;
    const output: number[][] = Array.from({ length: outH }, () => Array(outW).fill(0));
    
    // Tile 2x2
    for (let r = 0; r < outH; r++) {
        for (let c = 0; c < outW; c++) {
            output[r][c] = input[r % H][c % W];
        }
    }
    
    // Add 8s to diagonal neighbors of non-zero cells
    const dr = [-1, -1, 1, 1];
    const dc = [-1, 1, -1, 1];
    
    for (let r = 0; r < outH; r++) {
        for (let c = 0; c < outW; c++) {
            if (input[r % H][c % W] !== 0) {
                for (let i = 0; i < 4; i++) {
                    const nr = r + dr[i];
                    const nc = c + dc[i];
                    if (nr >= 0 && nr < outH && nc >= 0 && nc < outW) {
                        if (output[nr][nc] === 0) {
                            output[nr][nc] = 8;
                        }
                    }
                }
            }
        }
    }
    
    return output;
}
