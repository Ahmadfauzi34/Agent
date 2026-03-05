/**
 * Grid Spread Solver
 * 
 * Pattern: The grid is divided into subgrids by a separator color (e.g., 5).
 * One of the subgrids contains a specific pattern or color that needs to be 
 * spread or copied to other subgrids, or each subgrid is filled with its 
 * dominant color.
 * 
 * In this specific variant (09629e4f), the grid is divided into 3x3 subgrids 
 * by a separator (5). Each 3x3 subgrid has some pixels. We need to find the 
 * "dominant" color (excluding 5 and 0 and maybe 8) and fill the entire 3x3 
 * subgrid with that color, OR maybe the color that appears exactly once?
 * Let's analyze:
 * Train 1: 
 * Subgrid 1: 2, 4, 3, 6 -> filled with 2
 * Subgrid 2: 6, 4, 8, 3 -> filled with 0
 * Subgrid 3: 4, 6, 2 -> filled with 0
 * Subgrid 4: 3, 8, 4 -> filled with 0
 * Subgrid 5: 6, 2, 4, 3, 8 -> filled with 4
 * Subgrid 6: 4, 8, 6, 3, 2 -> filled with 3
 * Subgrid 7: 3, 6, 2, 8, 4 -> filled with 6
 * Subgrid 8: 2, 4, 8, 3 -> filled with 0
 * Subgrid 9: 6, 8, 2, 3, 4 -> filled with 0
 * 
 * Wait, looking at the colors:
 * The input has colors 2, 3, 4, 6, 8.
 * The output has colors 2, 3, 4, 6. (8 is removed).
 * In each row of subgrids (3 subgrids), there are some colors.
 * Actually, let's look at the subgrids across the entire grid.
 * There are 9 subgrids.
 * Subgrid 1 (top-left): 2, 4, 3, 6
 * Subgrid 2 (top-mid): 6, 4, 8, 3
 * Subgrid 3 (top-right): 4, 6, 2
 * 
 * Is it about which color is missing?
 * Colors are 2, 3, 4, 6.
 * Subgrid 1 has 2,3,4,6.
 * Subgrid 2 has 3,4,6,8. (Missing 2) -> filled with 0
 * Subgrid 3 has 2,4,6. (Missing 3) -> filled with 0
 * 
 * Let's re-examine Train 1 Output:
 * Top-left: 222...
 * Mid-mid: 444...
 * Mid-right: 333...
 * Bot-left: 666...
 * 
 * Why these?
 * In Train 1:
 * Top-left input:
 * 2..
 * .43
 * 6..
 * 
 * Mid-mid input:
 * 62.
 * ..4
 * 38.
 * 
 * Mid-right input:
 * .48
 * 56. (wait, 5 is separator)
 * 
 * Let's print the subgrids clearly.
 */
import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('./training/09629e4f.json', 'utf-8'));

function getSubgrids(grid: number[][]) {
    const subgrids = [];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const subgrid = [];
            for (let i = 0; i < 3; i++) {
                const row = [];
                for (let j = 0; j < 3; j++) {
                    row.push(grid[r * 4 + i][c * 4 + j]);
                }
                subgrid.push(row);
            }
            subgrids.push(subgrid);
        }
    }
    return subgrids;
}

const pair = data.train[0];
const inSubgrids = getSubgrids(pair.input);
const outSubgrids = getSubgrids(pair.output);

for (let i = 0; i < 9; i++) {
    console.log(`Subgrid ${i}:`);
    console.log("In:");
    inSubgrids[i].forEach(row => console.log(row.join('')));
    console.log("Out:");
    outSubgrids[i].forEach(row => console.log(row.join('')));
    
    const colors = new Set<number>();
    inSubgrids[i].forEach(row => row.forEach(c => { if (c !== 0) colors.add(c); }));
    console.log(`Colors: ${Array.from(colors).sort().join(',')}`);
}
