export function solveMagneticAttraction(grid: number[][]): number[][] {
    const H = grid.length;
    const W = grid[0].length;
    const output = grid.map(row => row.map(() => 0));

    // Identify Magnets
    const rowMagnets: {r: number, color: number}[] = [];
    const colMagnets: {c: number, color: number}[] = [];

    // Check rows
    for (let r = 0; r < H; r++) {
        const color = grid[r][0];
        if (color !== 0) {
            let isMagnet = true;
            for (let c = 1; c < W; c++) {
                if (grid[r][c] !== color) {
                    isMagnet = false;
                    break;
                }
            }
            if (isMagnet) {
                rowMagnets.push({r, color});
            }
        }
    }

    // Check cols
    for (let c = 0; c < W; c++) {
        const color = grid[0][c];
        if (color !== 0) {
            let isMagnet = true;
            for (let r = 1; r < H; r++) {
                if (grid[r][c] !== color) {
                    isMagnet = false;
                    break;
                }
            }
            if (isMagnet) {
                colMagnets.push({c, color});
            }
        }
    }

    // Draw Magnets on output
    for (const m of rowMagnets) {
        for (let c = 0; c < W; c++) output[m.r][c] = m.color;
    }
    for (const m of colMagnets) {
        for (let r = 0; r < H; r++) output[r][m.c] = m.color;
    }

    // Process other pixels
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            const color = grid[r][c];
            if (color === 0) continue;

            // Check if this pixel is part of a magnet
            let isPartOfMagnet = false;
            for (const m of rowMagnets) if (m.r === r && m.color === color) isPartOfMagnet = true;
            for (const m of colMagnets) if (m.c === c && m.color === color) isPartOfMagnet = true;
            
            if (isPartOfMagnet) continue;

            // Find nearest magnet of same color
            let bestDist = Infinity;
            let targetR = -1;
            let targetC = -1;

            // Check row magnets
            for (const m of rowMagnets) {
                if (m.color === color) {
                    const dist = Math.abs(r - m.r);
                    if (dist < bestDist) {
                        bestDist = dist;
                        targetC = c;
                        targetR = r < m.r ? m.r - 1 : m.r + 1;
                    }
                }
            }

            // Check col magnets
            for (const m of colMagnets) {
                if (m.color === color) {
                    const dist = Math.abs(c - m.c);
                    if (dist < bestDist) {
                        bestDist = dist;
                        targetR = r;
                        targetC = c < m.c ? m.c - 1 : m.c + 1;
                    }
                }
            }

            if (targetR !== -1 && targetC !== -1) {
                // Ensure target is within bounds (it should be if logic is correct)
                if (targetR >= 0 && targetR < H && targetC >= 0 && targetC < W) {
                    output[targetR][targetC] = color;
                }
            }
        }
    }

    return output;
}
