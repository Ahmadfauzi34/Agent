/**
 * Grid Intersection Solver
 * 
 * Pattern: Split the input grid by a vertical separator (usually color 5). 
 * The output is a smaller grid where a cell is color 2 if both the left 
 * and right subgrids have a non-zero value at that position.
 */
export function solveIntersection(grid: number[][]): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // 1. Find the vertical separator (column with all same color, e.g., 5)
    let sepCol = -1;
    for (let c = 0; c < cols; c++) {
        const color = grid[0][c];
        if (color === 0) continue;
        let isSep = true;
        for (let r = 1; r < rows; r++) {
            if (grid[r][c] !== color) {
                isSep = false;
                break;
            }
        }
        if (isSep) {
            sepCol = c;
            break;
        }
    }

    if (sepCol === -1) return grid; // No separator found

    // 2. Split into left and right subgrids
    const leftWidth = sepCol;
    const rightWidth = cols - sepCol - 1;
    const width = Math.min(leftWidth, rightWidth);
    
    const output = Array.from({ length: rows }, () => Array(width).fill(0));

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < width; c++) {
            const leftVal = grid[r][c];
            const rightVal = grid[r][sepCol + 1 + c];
            if (leftVal !== 0 && rightVal !== 0) {
                output[r][c] = 2; // Intersection color
            }
        }
    }

    return output;
}
