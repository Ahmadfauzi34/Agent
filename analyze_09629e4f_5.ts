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

for (let t = 0; t < data.train.length; t++) {
    console.log(`\nTrain Case ${t + 1}:`);
    const pair = data.train[t];
    const inSubgrids = getSubgrids(pair.input);
    const outSubgrids = getSubgrids(pair.output);

    for (let i = 0; i < 9; i++) {
        const colors = new Set<number>();
        inSubgrids[i].forEach(row => row.forEach(c => { if (c !== 0) colors.add(c); }));
        
        const outColors = new Set<number>();
        outSubgrids[i].forEach(row => row.forEach(c => { if (c !== 0) outColors.add(c); }));
        
        if (outColors.size > 0) {
            console.log(`Subgrid ${i} -> Output: ${Array.from(outColors)[0]}`);
            console.log("In:");
            inSubgrids[i].forEach(row => console.log(row.join('')));
        }
    }
}
