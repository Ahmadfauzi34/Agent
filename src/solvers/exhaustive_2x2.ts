export function solveExhaustive2x2(input: number[][]): number[][] {
    const H = input.length;
    const W = input[0].length;
    
    // Find input color
    const colorCounts = new Map<number, number>();
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            const color = input[r][c];
            if (color !== 0) {
                colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
            }
        }
    }
    let inputColor = 5;
    if (!colorCounts.has(5)) {
        let maxCount = -1;
        for (const [color, count] of colorCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                inputColor = color;
            }
        }
    }
    
    // Find all valid 2x2 blocks
    const validBlocks: {r: number, c: number}[] = [];
    for (let r = 0; r < H - 1; r++) {
        for (let c = 0; c < W - 1; c++) {
            if (input[r][c] === inputColor &&
                input[r][c+1] === inputColor &&
                input[r+1][c] === inputColor &&
                input[r+1][c+1] === inputColor) {
                validBlocks.push({r, c});
            }
        }
    }
    
    let bestSolution: {r: number, c: number}[] = [];
    let bestScore = {count: -1, components: 999};
    
    function solve(index: number, currentBlocks: {r: number, c: number}[]) {
        // Pruning: if remaining blocks can't beat best count, stop?
        // No, because we also optimize components.
        
        if (index === validBlocks.length) {
            // Evaluate
            const count = currentBlocks.length;
            if (count < bestScore.count) return;
            
            // Build grid
            const grid = input.map(row => [...row]);
            const used = Array(H).fill(0).map(() => Array(W).fill(false));
            
            for (const b of currentBlocks) {
                grid[b.r][b.c] = 8;
                grid[b.r][b.c+1] = 8;
                grid[b.r+1][b.c] = 8;
                grid[b.r+1][b.c+1] = 8;
                used[b.r][b.c] = true;
                used[b.r][b.c+1] = true;
                used[b.r+1][b.c] = true;
                used[b.r+1][b.c+1] = true;
            }
            
            for (let r = 0; r < H; r++) {
                for (let c = 0; c < W; c++) {
                    if (input[r][c] === inputColor && !used[r][c]) {
                        grid[r][c] = 2;
                    }
                }
            }
            
            // Count 2-components
            let components = 0;
            const visited = Array(H).fill(0).map(() => Array(W).fill(false));
            for (let r = 0; r < H; r++) {
                for (let c = 0; c < W; c++) {
                    if (grid[r][c] === 2 && !visited[r][c]) {
                        components++;
                        const q = [{r, c}];
                        visited[r][c] = true;
                        while (q.length > 0) {
                            const curr = q.shift()!;
                            // 8-way connectivity
                            for (let dr = -1; dr <= 1; dr++) {
                                for (let dc = -1; dc <= 1; dc++) {
                                    if (dr === 0 && dc === 0) continue;
                                    const nr = curr.r + dr;
                                    const nc = curr.c + dc;
                                    if (nr >= 0 && nr < H && nc >= 0 && nc < W && grid[nr][nc] === 2 && !visited[nr][nc]) {
                                        visited[nr][nc] = true;
                                        q.push({r: nr, c: nc});
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            if (count > bestScore.count || (count === bestScore.count && components < bestScore.components)) {
                bestScore = {count, components};
                bestSolution = [...currentBlocks];
            }
            return;
        }
        
        const candidate = validBlocks[index];
        
        // Check compatibility
        let compatible = true;
        for (const b of currentBlocks) {
            // Overlap
            if (Math.abs(b.r - candidate.r) < 2 && Math.abs(b.c - candidate.c) < 2) {
                compatible = false; break;
            }
            // Vertical Touch: (r,c) touches (r-2, c)
            // candidate.r == b.r + 2 && (candidate.c overlap b.c)
            if (candidate.r === b.r + 2 && Math.abs(candidate.c - b.c) < 2) {
                compatible = false; break;
            }
            if (b.r === candidate.r + 2 && Math.abs(candidate.c - b.c) < 2) {
                compatible = false; break;
            }
            // Horizontal Touch (Top-Aligned): (r,c) touches (r, c-2)
            if (candidate.r === b.r && Math.abs(candidate.c - b.c) === 2) {
                compatible = false; break;
            }
        }
        
        if (compatible) {
            solve(index + 1, [...currentBlocks, candidate]);
        }
        
        solve(index + 1, currentBlocks);
    }
    
    solve(0, []);
    
    // Reconstruct best solution
    const output = input.map(row => [...row]);
    const used = Array(H).fill(0).map(() => Array(W).fill(false));
    
    for (const b of bestSolution) {
        output[b.r][b.c] = 8;
        output[b.r][b.c+1] = 8;
        output[b.r+1][b.c] = 8;
        output[b.r+1][b.c+1] = 8;
        used[b.r][b.c] = true;
        used[b.r][b.c+1] = true;
        used[b.r+1][b.c] = true;
        used[b.r+1][b.c+1] = true;
    }
    
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (input[r][c] === inputColor && !used[r][c]) {
                output[r][c] = 2;
            }
        }
    }
    
    return output;
}
