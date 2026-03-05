/**
 * Grid Spread Solver
 * 
 * Pattern: The grid is divided into subgrids by a separator color (e.g., 5).
 * One of the subgrids is "special" (e.g., missing a specific color, like 8).
 * The colors in this special subgrid dictate how the other subgrids are filled.
 * Specifically, the position of each color in the special subgrid corresponds
 * to the position of the subgrid in the larger grid that should be filled with that color.
 */
export function solveGridSpread(grid: number[][]): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Find the separator color (the one that forms a grid)
    // It usually spans entire rows and columns
    let separator = -1;
    for (let r = 0; r < rows; r++) {
        let isSeparator = true;
        const color = grid[r][0];
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] !== color) {
                isSeparator = false;
                break;
            }
        }
        if (isSeparator && color !== 0) {
            separator = color;
            break;
        }
    }
    
    if (separator === -1) return grid;
    
    // Determine subgrid size
    let subgridH = 0;
    for (let r = 0; r < rows; r++) {
        if (grid[r][0] === separator) break;
        subgridH++;
    }
    
    let subgridW = 0;
    for (let c = 0; c < cols; c++) {
        if (grid[0][c] === separator) break;
        subgridW++;
    }
    
    if (subgridH === 0 || subgridW === 0) return grid;
    
    const numSubgridsR = Math.floor((rows + 1) / (subgridH + 1));
    const numSubgridsC = Math.floor((cols + 1) / (subgridW + 1));
    
    // Extract subgrids
    const subgrids: number[][][][] = Array.from({ length: numSubgridsR }, () => Array(numSubgridsC).fill([]));
    
    for (let sr = 0; sr < numSubgridsR; sr++) {
        for (let sc = 0; sc < numSubgridsC; sc++) {
            const subgrid = [];
            for (let r = 0; r < subgridH; r++) {
                const row = [];
                for (let c = 0; c < subgridW; c++) {
                    row.push(grid[sr * (subgridH + 1) + r][sc * (subgridW + 1) + c]);
                }
                subgrid.push(row);
            }
            subgrids[sr][sc] = subgrid;
        }
    }
    
    // Find the special subgrid (the one with the fewest unique colors, or missing the "background" color like 8)
    // Let's count colors in each subgrid
    let specialSr = -1;
    let specialSc = -1;
    let minColors = Infinity;
    
    for (let sr = 0; sr < numSubgridsR; sr++) {
        for (let sc = 0; sc < numSubgridsC; sc++) {
            const colors = new Set<number>();
            for (let r = 0; r < subgridH; r++) {
                for (let c = 0; c < subgridW; c++) {
                    const color = subgrids[sr][sc][r][c];
                    if (color !== 0) colors.add(color);
                }
            }
            if (colors.size < minColors && colors.size > 0) {
                minColors = colors.size;
                specialSr = sr;
                specialSc = sc;
            }
        }
    }
    
    if (specialSr === -1) return grid;
    
    // The special subgrid tells us which color goes to which subgrid
    // The position (r, c) in the special subgrid corresponds to the subgrid (r, c) in the main grid
    const specialSubgrid = subgrids[specialSr][specialSc];
    
    const output = grid.map(row => [...row]);
    
    for (let r = 0; r < subgridH; r++) {
        for (let c = 0; c < subgridW; c++) {
            const color = specialSubgrid[r][c];
            
            // Fill the corresponding subgrid with this color
            // If color is 0, we fill with 0
            if (r < numSubgridsR && c < numSubgridsC) {
                for (let i = 0; i < subgridH; i++) {
                    for (let j = 0; j < subgridW; j++) {
                        output[r * (subgridH + 1) + i][c * (subgridW + 1) + j] = color;
                    }
                }
            }
        }
    }
    
    return output;
}
