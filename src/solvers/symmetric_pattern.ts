export function solveSymmetricPattern(input: number[][]): number[][] {
    const H = input.length;
    const W = input[0].length;
    
    // Find all non-zero pixels
    const nonZeros: {r: number, c: number, color: number}[] = [];
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (input[r][c] !== 0) {
                nonZeros.push({r, c, color: input[r][c]});
            }
        }
    }
    
    if (nonZeros.length === 0) return input;
    
    // Try all possible centers
    let bestCenter: {r: number, c: number} | null = null;
    let bestMatchCount = 0;
    
    for (let cr = 0; cr < H; cr++) {
        for (let cc = 0; cc < W; cc++) {
            let matchCount = 0;
            let valid = true;
            for (const p of nonZeros) {
                const dr = Math.abs(p.r - cr);
                const dc = Math.abs(p.c - cc);
                
                if (dr === 0 && dc === 0) {
                    // Center
                    matchCount++;
                } else if (dr === 1 && dc === 1) {
                    // Square
                    matchCount++;
                } else if ((dr === 2 && dc === 0) || (dr === 0 && dc === 2)) {
                    // + shape
                    matchCount++;
                } else if (dr === 2 && dc === 2) {
                    // X shape
                    matchCount++;
                } else {
                    valid = false;
                    break;
                }
            }
            if (valid && matchCount > bestMatchCount) {
                bestMatchCount = matchCount;
                bestCenter = {r: cr, c: cc};
            }
        }
    }
    
    if (!bestCenter || bestMatchCount < nonZeros.length) {
        return input; // Not this pattern
    }
    
    const cr = bestCenter.r;
    const cc = bestCenter.c;
    
    // Determine colors
    let centerColor = 0;
    let squareColor = 0;
    let plusColor = 0;
    let xColor = 0;
    
    for (const p of nonZeros) {
        const dr = Math.abs(p.r - cr);
        const dc = Math.abs(p.c - cc);
        if (dr === 0 && dc === 0) centerColor = p.color;
        else if (dr === 1 && dc === 1) squareColor = p.color;
        else if ((dr === 2 && dc === 0) || (dr === 0 && dc === 2)) plusColor = p.color;
        else if (dr === 2 && dc === 2) xColor = p.color;
    }
    
    // Create output
    const output = input.map(row => [...row]);
    
    const fill = (r: number, c: number, color: number) => {
        if (r >= 0 && r < H && c >= 0 && c < W && color !== 0) {
            output[r][c] = color;
        }
    };
    
    fill(cr, cc, centerColor);
    
    fill(cr - 1, cc - 1, squareColor);
    fill(cr - 1, cc + 1, squareColor);
    fill(cr + 1, cc - 1, squareColor);
    fill(cr + 1, cc + 1, squareColor);
    
    fill(cr - 2, cc, plusColor);
    fill(cr + 2, cc, plusColor);
    fill(cr, cc - 2, plusColor);
    fill(cr, cc + 2, plusColor);
    
    fill(cr - 2, cc - 2, xColor);
    fill(cr - 2, cc + 2, xColor);
    fill(cr + 2, cc - 2, xColor);
    fill(cr + 2, cc + 2, xColor);
    
    return output;
}
