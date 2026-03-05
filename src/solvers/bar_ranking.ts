/**
 * Bar Ranking Solver
 * 
 * Pattern: Identify vertical bars of a single color (usually color 5). 
 * Rank them by height (tallest first) and assign unique colors 
 * (1, 2, 3, ...) based on their rank.
 */
export function solveBarRanking(grid: number[][]): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;

    // 1. Find all vertical bars of color 5
    const bars: { col: number, height: number, points: [number, number][] }[] = [];
    for (let c = 0; c < cols; c++) {
        const points: [number, number][] = [];
        for (let r = 0; r < rows; r++) {
            if (grid[r][c] === 5) {
                points.push([r, c]);
            }
        }
        if (points.length > 0) {
            bars.push({ col: c, height: points.length, points });
        }
    }

    if (bars.length === 0) return grid;

    // 2. Sort bars by height (descending)
    // Tie-breaker: left-to-right (lower column index first)
    bars.sort((a, b) => b.height - a.height || a.col - b.col);

    // 3. Create output grid and assign colors
    const output = grid.map(row => [...row]);
    for (let i = 0; i < bars.length; i++) {
        const color = i + 1;
        for (const [r, c] of bars[i].points) {
            output[r][c] = color;
        }
    }

    return output;
}
