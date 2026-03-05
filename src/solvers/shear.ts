/**
 * Shear Correction Solver
 * 
 * Pattern: For each connected component of a non-zero color, shift all rows 
 * except the bottom-most row to the right by 1, but do not exceed the 
 * original bounding box's maximum column index.
 */
export function solveShear(grid: number[][]): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    const output = grid.map(row => [...row]);
    
    // 1. Find connected components (4-connectivity)
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const components: { r: number, c: number }[][] = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] !== 0 && !visited[r][c]) {
                const color = grid[r][c];
                const component: { r: number, c: number }[] = [];
                const queue: [number, number][] = [[r, c]];
                visited[r][c] = true;

                while (queue.length > 0) {
                    const [currR, currC] = queue.shift()!;
                    component.push({ r: currR, c: currC });

                    const neighbors = [
                        [currR + 1, currC], [currR - 1, currC],
                        [currR, currC + 1], [currR, currC - 1],
                        [currR + 1, currC + 1], [currR + 1, currC - 1],
                        [currR - 1, currC + 1], [currR - 1, currC - 1]
                    ];

                    for (const [nR, nC] of neighbors) {
                        if (nR >= 0 && nR < rows && nC >= 0 && nC < cols &&
                            grid[nR][nC] === color && !visited[nR][nC]) {
                            visited[nR][nC] = true;
                            queue.push([nR, nC]);
                        }
                    }
                }
                components.push(component);
            }
        }
    }

    // 2. Clear output for components that will be moved
    for (const component of components) {
        for (const { r, c } of component) {
            output[r][c] = 0;
        }
    }

    // 3. Apply transformation for each component
    for (const component of components) {
        let maxRow = -1;
        let maxCol = -1;
        const color = grid[component[0].r][component[0].c];

        for (const { r, c } of component) {
            if (r > maxRow) maxRow = r;
            if (c > maxCol) maxCol = c;
        }

        for (const { r, c } of component) {
            if (r === maxRow) {
                // Bottom row stays the same
                output[r][c] = color;
            } else {
                // Other rows shift right by 1, capped at maxCol
                const newC = Math.min(c + 1, maxCol);
                output[r][newC] = color;
            }
        }
    }

    return output;
}
