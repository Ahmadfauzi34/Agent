/**
 * Plus Expansion Solver
 * 
 * Pattern: Identify "plus" shapes (a center pixel C with 4 arms of color A). 
 * Expand each shape into a 5x5 pattern where:
 * - Diagonals from the center get color C.
 * - Horizontal and vertical lines from the center get color A.
 */
export function solvePlusExpansion(grid: number[][]): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    const output = grid.map(row => [...row]);

    const findPlusShapes = () => {
        const shapes: { r: number, c: number, centerColor: number, armColor: number }[] = [];
        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                const centerColor = grid[r][c];
                if (centerColor === 0) continue;
                
                const armColor = grid[r-1][c];
                if (armColor === 0 || armColor === centerColor) continue;
                
                if (grid[r+1][c] === armColor && 
                    grid[r][c-1] === armColor && 
                    grid[r][c+1] === armColor) {
                    
                    // Check that other neighbors are 0 to avoid matching larger structures
                    if (grid[r-1][c-1] === 0 && grid[r-1][c+1] === 0 &&
                        grid[r+1][c-1] === 0 && grid[r+1][c+1] === 0) {
                        shapes.push({ r, c, centerColor, armColor });
                    }
                }
            }
        }
        return shapes;
    };

    const shapes = findPlusShapes();

    for (const { r, c, centerColor, armColor } of shapes) {
        // Expand to 5x5
        for (let i = -2; i <= 2; i++) {
            // Diagonals
            const diagPoints = [[r+i, c+i], [r+i, c-i]];
            for (const [pr, pc] of diagPoints) {
                if (pr >= 0 && pr < rows && pc >= 0 && pc < cols) {
                    output[pr][pc] = centerColor;
                }
            }
            // Horiz/Vert
            if (i !== 0) {
                const hvPoints = [[r+i, c], [r, c+i]];
                for (const [pr, pc] of hvPoints) {
                    if (pr >= 0 && pr < rows && pc >= 0 && pc < cols) {
                        output[pr][pc] = armColor;
                    }
                }
            }
        }
    }

    return output;
}
