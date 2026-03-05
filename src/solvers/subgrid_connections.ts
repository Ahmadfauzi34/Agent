/**
 * Bounding Box / Rectangle Connection Solver
 * 
 * Wait, looking at the output, my code fills the entire subgrid AND the separators between them!
 * But the expected output shows that the separators are filled, but the subgrids between the endpoints are NOT filled!
 * Wait, let's look at Train 1 Row 3:
 * Exp: 00822822822822822800
 * Got: 00822222222222222800
 * 
 * Ah! The expected output has `8` as the separator!
 * The subgrids are filled with `2`, and the separators are `8`!
 * Wait, in the input, the separator is `8`.
 * In the expected output, the separator is STILL `8`!
 * Wait, if the separator is STILL `8`, then the line is drawn by filling the subgrids, but NOT the separators!
 * Let me re-read the expected output:
 * 008 22 8 22 8 22 8 22 8 22 8 00
 * So the subgrids are filled with `2`. The separators are `8`.
 * My code filled the separators with `2` as well!
 * 
 * Let's check the corner pixels.
 * In my code, I was filling the separators with the color.
 * But the expected output shows the separators remain their original color (`8` in Train 1, `1` in Train 2, `4` in Train 3)!
 * 
 * Wait, if the separators remain their original color, then the "lines" are just a sequence of subgrids that are filled with the color!
 * Let's re-examine Train 1 Row 5 (separator row):
 * Exp: 88888888888888888888
 * Got: 88888888888888222888
 * 
 * Yes! The expected output has NO `2`s in the separator row!
 * The separators are completely untouched!
 * The "lines" are formed by filling the subgrids that lie on the path!
 * 
 * Let's verify this.
 * In Train 1:
 * 2 is at (1,1), (1,5), (3,5).
 * The path goes from (1,1) to (1,5) and from (1,5) to (3,5).
 * The subgrids on this path are:
 * (1,1), (1,2), (1,3), (1,4), (1,5)
 * (2,5), (3,5)
 * 
 * And the expected output has exactly these subgrids filled with `2`, and the separators are untouched!
 * 
 * Oh my god, this is so much simpler!
 * I just need to fill the subgrids on the path, and NOT touch the separators!
 * 
 * Let's review the algorithm to find the path:
 * 1. Find all pairs of points that share a row. For each pair, draw a horizontal line (fill subgrids between them).
 * 2. Find all pairs of points that share a column. For each pair, draw a vertical line (fill subgrids between them).
 * 3. For any isolated point, drop a perpendicular to the existing lines.
 * 
 * Let's check Train 3, color 2:
 * 2 is at (1,5), (3,3), (3,6).
 * Pairs sharing row: (3,3) and (3,6). Fill subgrids (3,3), (3,4), (3,5), (3,6).
 * Isolated point: (1,5).
 * Drop perpendicular to horizontal line at r=3.
 * The perpendicular goes from (1,5) to (3,5).
 * Fill subgrids (1,5), (2,5), (3,5).
 * 
 * Wait, let's look at Train 3 expected output for color 2:
 * Row 5 (r=1 in subgrid coords, since subgrid size is 2x2, separators are 1px. r=0 is 0..1, r=1 is 3..4, r=2 is 6..7, r=3 is 9..10).
 * Wait, in Train 3, subgrid size is 2x2.
 * Separator is 1px.
 * Subgrid r=1 is rows 3..4.
 * Subgrid c=5 is cols 15..16.
 * Let's check Train 3 expected output:
 * Row 3, 4:
 * 004 33 4 00 4 00 4 00 4 22 4 00 4 00
 * Subgrid (1,5) is `22`.
 * Row 6, 7:
 * 004 33 4 00 4 00 4 00 4 00 4 00 4 00
 * Wait! Subgrid (2,5) is NOT filled!
 * Let me re-read Train 3 expected output from my debug script:
 * Row 5 (which is separator): 44444444444444444444444
 * Row 6, 7 (subgrid r=2):
 * Exp: 004 33 4 00 4 00 4 00 4 00 4 00 4 00
 * Got: 004 33 4 00 4 00 4 00 4 22 4 00 4 00
 * 
 * Wait, in the expected output, subgrid (2,5) is NOT filled!
 * Let me check subgrid (3,5).
 * Row 9, 10 (subgrid r=3):
 * Exp: 004 33 4 00 4 22 4 22 4 22 4 22 4 00
 * Subgrids at r=3:
 * c=0: 00
 * c=1: 33
 * c=2: 00
 * c=3: 22
 * c=4: 22
 * c=5: 22
 * c=6: 22
 * 
 * So at r=3, subgrids 3, 4, 5, 6 are filled with 2.
 * At r=1, subgrid 5 is filled with 2.
 * At r=2, subgrid 5 is NOT filled!
 * 
 * Wait, what???
 * Let me re-read the Train 3 In blocks:
 * 3 at (1,1), (6,1), (6,5)
 * 2 at (1,5), (3,3), (3,6)
 * 
 * Out blocks for 2:
 * (1,5) is filled.
 * (3,3), (3,4), (3,5), (3,6) are filled.
 * (2,5) is NOT filled!
 * 
 * Why is (2,5) not filled?
 * If (1,5) is connected to (3,5), then (2,5) should be filled!
 * But it's not!
 * Let me check the expected output again.
 * Train Case 3 Expected:
 * 00400400400400400400400
 * 00400400400400400400400
 * 44444444444444444444444
 * 00433400400400422400400  <- r=3,4 (subgrid r=1). c=1 is 33, c=5 is 22.
 * 00433400400400422400400
 * 44444444444444444444444
 * 00433400400400400400400  <- r=6,7 (subgrid r=2). c=1 is 33. c=5 is 00!
 * 00433400400400400400400
 * 44444444444444444444444
 * 00433400422422422422400  <- r=9,10 (subgrid r=3). c=1 is 33. c=3,4,5,6 are 22.
 * 
 * Wait, so (1,5) is NOT connected to (3,5) vertically!
 * Then what is the pattern?
 * In Train 3, 2 is at (1,5), (3,3), (3,6).
 * The output has 2 at (1,5), and a horizontal line from (3,3) to (3,6).
 * (1,5) is just left alone! It is NOT connected!
 * 
 * Let's check 3 in Train 3:
 * In: (1,1), (6,1), (6,5).
 * Out:
 * r=1: c=1 is 33
 * r=2: c=1 is 33
 * r=3: c=1 is 33
 * r=4: c=1 is 33
 * r=5: c=1 is 33
 * r=6: c=1,2,3,4,5 are 33
 * 
 * So 3 IS connected! It forms an L-shape from (1,1) down to (6,1) and right to (6,5).
 * Why is 3 connected but 2 is not?
 * Because 3 has two blocks that share a column ((1,1) and (6,1)) and two blocks that share a row ((6,1) and (6,5)).
 * 2 has two blocks that share a row ((3,3) and (3,6)), but NO blocks that share a column!
 * 
 * Ah!
 * The rule is ONLY connect blocks that share a row or a column!
 * If a block doesn't share a row or column with any other block of the same color, it is NOT connected!
 * 
 * Let's re-verify this.
 * Train 1:
 * 2 at (1,1), (1,5), (3,5).
 * (1,1) and (1,5) share a row. Connect them.
 * (1,5) and (3,5) share a column. Connect them.
 * All blocks share a row or col with another block.
 * 
 * Train 2:
 * 2 at (1,1), (5,1).
 * Share a column. Connect them.
 * 8 at (4,6), (6,3), (6,6).
 * (4,6) and (6,6) share a col. Connect.
 * (6,3) and (6,6) share a row. Connect.
 * 
 * Train 3:
 * 3 at (1,1), (6,1), (6,5).
 * (1,1) and (6,1) share a col. Connect.
 * (6,1) and (6,5) share a row. Connect.
 * 2 at (1,5), (3,3), (3,6).
 * (3,3) and (3,6) share a row. Connect.
 * (1,5) does NOT share a row or col with any other 2.
 * So it is NOT connected!
 * 
 * Wow! The rule is incredibly simple:
 * For each color:
 * 1. Find all pairs of blocks that share a row. Draw a horizontal line between them.
 * 2. Find all pairs of blocks that share a column. Draw a vertical line between them.
 * That's it! No dropping perpendiculars!
 * 
 * Let's double check if there are any other blocks in Train 3.
 * In blocks:
 * 3 at (1,1), (6,1), (6,5)
 * 2 at (1,5), (3,3), (3,6)
 * 
 * Out blocks:
 * 3 at (1,1)..(6,1) and (6,1)..(6,5)
 * 2 at (1,5) and (3,3)..(3,6)
 * 
 * Yes! (1,5) is just left alone!
 * 
 * Let me check Train 2 again.
 * 4 at (1,4).
 * Out: 4 at (1,4). Left alone!
 * 9 at (3,3), (3,7).
 * Out: 9 at (3,3)..(3,7). Connected horizontally!
 * 
 * This is exactly it!
 * The rule is:
 * For each row, if there are multiple blocks of the same color, connect the min and max column.
 * For each column, if there are multiple blocks of the same color, connect the min and max row.
 * 
 * Wait, what if there are 3 blocks in the same row?
 * e.g. (1,1), (1,3), (1,5).
 * Connect min (1) to max (5).
 * 
 * Let's implement this. It's so much simpler!
 */
export function solveSubgridConnections(grid: number[][]): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Find separator color
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
    
    // Find colored subgrids
    const colorBlocks = new Map<number, {r: number, c: number}[]>();
    
    for (let sr = 0; sr < numSubgridsR; sr++) {
        for (let sc = 0; sc < numSubgridsC; sc++) {
            const startR = sr * (subgridH + 1);
            const startC = sc * (subgridW + 1);
            
            let color = grid[startR][startC];
            if (color !== 0 && color !== separator) {
                let isSolid = true;
                for (let r = 0; r < subgridH; r++) {
                    for (let c = 0; c < subgridW; c++) {
                        if (grid[startR + r][startC + c] !== color) {
                            isSolid = false;
                            break;
                        }
                    }
                }
                if (isSolid) {
                    if (!colorBlocks.has(color)) {
                        colorBlocks.set(color, []);
                    }
                    colorBlocks.get(color)!.push({r: sr, c: sc});
                }
            }
        }
    }
    
    const output = grid.map(row => [...row]);
    
    // Connect blocks of the same color
    for (const [color, blocks] of colorBlocks.entries()) {
        const lines = new Set<string>();
        
        // 1. Rows with >= 2 blocks
        const blocksByRow = new Map<number, number[]>();
        for (const b of blocks) {
            if (!blocksByRow.has(b.r)) blocksByRow.set(b.r, []);
            blocksByRow.get(b.r)!.push(b.c);
        }
        
        for (const [r, cList] of blocksByRow.entries()) {
            if (cList.length >= 2) {
                const minC = Math.min(...cList);
                const maxC = Math.max(...cList);
                for (let c = minC; c <= maxC; c++) {
                    lines.add(`${r},${c}`);
                }
            }
        }
        
        // 2. Cols with >= 2 blocks
        const blocksByCol = new Map<number, number[]>();
        for (const b of blocks) {
            if (!blocksByCol.has(b.c)) blocksByCol.set(b.c, []);
            blocksByCol.get(b.c)!.push(b.r);
        }
        
        for (const [c, rList] of blocksByCol.entries()) {
            if (rList.length >= 2) {
                const minR = Math.min(...rList);
                const maxR = Math.max(...rList);
                for (let r = minR; r <= maxR; r++) {
                    lines.add(`${r},${c}`);
                }
            }
        }
        
        // Render lines to output (only fill subgrids, NOT separators)
        for (const lineStr of lines) {
            const [sr, sc] = lineStr.split(',').map(Number);
            const startR = sr * (subgridH + 1);
            const startC = sc * (subgridW + 1);
            
            for (let r = 0; r < subgridH; r++) {
                for (let c = 0; c < subgridW; c++) {
                    output[startR + r][startC + c] = color;
                }
            }
        }
    }
    
    return output;
}
