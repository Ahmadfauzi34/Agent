export function solveMoveToTouch(input: number[][]): number[][] {
    const H = input.length;
    const W = input[0].length;
    
    // Find Red (2) and Azure (8) pixels
    const redPixels: {r: number, c: number}[] = [];
    const azurePixels: {r: number, c: number}[] = [];
    
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (input[r][c] === 2) {
                redPixels.push({r, c});
            } else if (input[r][c] === 8) {
                azurePixels.push({r, c});
            }
        }
    }
    
    if (redPixels.length === 0 || azurePixels.length === 0) return input;
    
    // Check row overlap (horizontal separation)
    const redRows = new Set(redPixels.map(p => p.r));
    const azureRows = new Set(azurePixels.map(p => p.r));
    let rowOverlap = false;
    for (const r of redRows) {
        if (azureRows.has(r)) {
            rowOverlap = true;
            break;
        }
    }
    
    // Check col overlap (vertical separation)
    const redCols = new Set(redPixels.map(p => p.c));
    const azureCols = new Set(azurePixels.map(p => p.c));
    let colOverlap = false;
    for (const c of redCols) {
        if (azureCols.has(c)) {
            colOverlap = true;
            break;
        }
    }
    
    let dr = 0;
    let dc = 0;
    
    if (colOverlap && !rowOverlap) {
        // Move vertically
        const redMinR = Math.min(...redPixels.map(p => p.r));
        const redMaxR = Math.max(...redPixels.map(p => p.r));
        const azureMinR = Math.min(...azurePixels.map(p => p.r));
        const azureMaxR = Math.max(...azurePixels.map(p => p.r));
        
        if (redMaxR < azureMinR) {
            // Red is above Azure. Move down.
            // Distance to move = azureMinR - redMaxR - 1
            dr = azureMinR - redMaxR - 1;
        } else if (redMinR > azureMaxR) {
            // Red is below Azure. Move up.
            // Distance to move = -(redMinR - azureMaxR - 1)
            dr = -(redMinR - azureMaxR - 1);
        }
    } else if (rowOverlap && !colOverlap) {
        // Move horizontally
        const redMinC = Math.min(...redPixels.map(p => p.c));
        const redMaxC = Math.max(...redPixels.map(p => p.c));
        const azureMinC = Math.min(...azurePixels.map(p => p.c));
        const azureMaxC = Math.max(...azurePixels.map(p => p.c));
        
        if (redMaxC < azureMinC) {
            // Red is left of Azure. Move right.
            dc = azureMinC - redMaxC - 1;
        } else if (redMinC > azureMaxC) {
            // Red is right of Azure. Move left.
            dc = -(redMinC - azureMaxC - 1);
        }
    }
    
    if (dr === 0 && dc === 0) return input;
    
    // Create output
    const output = input.map(row => [...row]);
    
    // Clear Red pixels
    for (const p of redPixels) {
        output[p.r][p.c] = 0;
    }
    
    // Draw Red pixels at new position
    for (const p of redPixels) {
        const nr = p.r + dr;
        const nc = p.c + dc;
        if (nr >= 0 && nr < H && nc >= 0 && nc < W) {
            output[nr][nc] = 2;
        }
    }
    
    return output;
}
