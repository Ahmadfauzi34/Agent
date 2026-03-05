/**
 * Column Periodicity Solver
 * 
 * Pattern: Find the smallest repeating pattern for each column and 
 * continue it until the output grid size is reached.
 */
export function solvePeriodicity(grid: number[][], outputRows: number = 9, colorMap: { [key: number]: number } = { 1: 2 }): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    
    const output: number[][] = Array.from({ length: outputRows }, () => Array(cols).fill(0));

    for (let c = 0; c < cols; c++) {
        const column = grid.map(row => row[c]);
        
        // Find the smallest period
        let periodLength = rows;
        for (let len = 1; len <= rows; len++) {
            let isMatch = true;
            for (let i = 0; i < rows - len; i++) {
                if (column[i] !== column[i + len]) {
                    isMatch = false;
                    break;
                }
            }
            if (isMatch) {
                periodLength = len;
                break;
            }
        }
        
        const period = column.slice(0, periodLength);
        for (let r = 0; r < outputRows; r++) {
            const val = period[r % period.length];
            // Apply color transformation if needed
            output[r][c] = colorMap[val] !== undefined ? colorMap[val] : val;
        }
    }

    return output;
}
