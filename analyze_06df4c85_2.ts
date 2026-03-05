import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('./training/06df4c85.json', 'utf-8'));

function getSubgrids(grid: number[][]) {
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
    
    const numSubgridsR = Math.floor((rows + 1) / (subgridH + 1));
    const numSubgridsC = Math.floor((cols + 1) / (subgridW + 1));
    
    const subgrids = [];
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
                    subgrids.push({ color, r: sr, c: sc });
                }
            }
        }
    }
    return subgrids;
}

for (let t = 0; t < data.train.length; t++) {
    console.log(`\nTrain Case ${t + 1}:`);
    const pair = data.train[t];
    const inSubgrids = getSubgrids(pair.input);
    const outSubgrids = getSubgrids(pair.output);

    console.log("In blocks:", inSubgrids);
    console.log("Out blocks:", outSubgrids);
}
