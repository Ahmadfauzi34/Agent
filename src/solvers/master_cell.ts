/**
 * Master Cell Solver
 * 
 * Pattern: The output grid is a repetition of a smaller "master cell" (subgrid).
 * The input grid has missing parts (0s), but enough information is present to
 * deduce the master cell.
 * 
 * We can find the master cell by checking all possible sizes (e.g., 1x1 to NxM).
 * For each size, we check if the input grid is consistent with a repeating pattern
 * of that size. If it is, we fill the missing parts using the pattern.
 */
export function solveMasterCell(grid: number[][]): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Try all possible master cell sizes
    for (let h = 1; h <= rows; h++) {
        for (let w = 1; w <= cols; w++) {
            // A valid master cell must be able to tile the grid
            // Wait, does it have to perfectly tile the grid?
            // In 0dfd9992.json, input is 21x21.
            // Let's check if there's a repeating pattern.
            // The pattern might not perfectly divide the grid size, it could be truncated.
            // Let's assume it can be truncated.
            
            // To check if a size (h, w) is a valid master cell:
            // For every cell (r, c) in the grid that is not 0,
            // it must match the cell at (r % h, c % w).
            // Actually, we need to build the master cell first.
            let valid = true;
            const masterCell: number[][] = Array(h).fill(0).map(() => Array(w).fill(-1));
            
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const color = grid[r][c];
                    if (color !== 0) {
                        const mr = r % h;
                        const mc = c % w;
                        if (masterCell[mr][mc] === -1) {
                            masterCell[mr][mc] = color;
                        } else if (masterCell[mr][mc] !== color) {
                            valid = false;
                            break;
                        }
                    }
                }
                if (!valid) break;
            }
            
            if (valid) {
                // Check if the master cell is fully determined (no -1s)
                let fullyDetermined = true;
                for (let r = 0; r < h; r++) {
                    for (let c = 0; c < w; c++) {
                        if (masterCell[r][c] === -1) {
                            fullyDetermined = false;
                            break;
                        }
                    }
                    if (!fullyDetermined) break;
                }
                
                if (fullyDetermined) {
                    // Generate the output grid
                    const output = grid.map(row => [...row]);
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            output[r][c] = masterCell[r % h][c % w];
                        }
                    }
                    return output;
                }
            }
        }
    }
    
    return grid;
}
