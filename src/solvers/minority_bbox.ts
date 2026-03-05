/**
 * Minority Bounding Box Solver
 * 
 * Pattern: The grid contains two non-zero colors. One color occupies a single 
 * region (quadrant), while the other color occupies multiple regions, spanning 
 * a much larger bounding box.
 * 
 * The solution is to find the color with the smallest bounding box area,
 * and return the grid cropped to that bounding box.
 */
export function solveMinorityBbox(grid: number[][]): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // 1. Find all non-zero colors and their bounding boxes
    const bboxes: { [color: number]: { minR: number, maxR: number, minC: number, maxC: number } } = {};
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = grid[r][c];
            if (color !== 0) {
                if (!bboxes[color]) {
                    bboxes[color] = { minR: r, maxR: r, minC: c, maxC: c };
                } else {
                    bboxes[color].minR = Math.min(bboxes[color].minR, r);
                    bboxes[color].maxR = Math.max(bboxes[color].maxR, r);
                    bboxes[color].minC = Math.min(bboxes[color].minC, c);
                    bboxes[color].maxC = Math.max(bboxes[color].maxC, c);
                }
            }
        }
    }
    
    // 2. Find the color with the smallest bounding box area
    let targetColor = -1;
    let minArea = Infinity;
    
    for (const colorStr in bboxes) {
        const color = parseInt(colorStr);
        const box = bboxes[color];
        const area = (box.maxR - box.minR + 1) * (box.maxC - box.minC + 1);
        if (area < minArea) {
            minArea = area;
            targetColor = color;
        }
    }
    
    if (targetColor === -1) return grid; // Fallback
    
    // 3. Crop the grid to the target color's bounding box
    const box = bboxes[targetColor];
    const output: number[][] = [];
    
    for (let r = box.minR; r <= box.maxR; r++) {
        const row: number[] = [];
        for (let c = box.minC; c <= box.maxC; c++) {
            const color = grid[r][c];
            // Only keep the target color and background (0)
            // Wait, looking at the examples, the output only contains the target color and 0.
            // If there's any other color inside the bounding box (shouldn't happen), we can just keep it or replace with 0.
            // Let's just copy the grid values.
            row.push(color === targetColor ? color : 0);
        }
        output.push(row);
    }
    
    return output;
}
