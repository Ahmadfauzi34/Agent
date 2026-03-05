import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('./training/06df4c85.json', 'utf-8'));

import { solveSubgridConnections } from './src/solvers/subgrid_connections.ts';

for (let t = 0; t < data.train.length; t++) {
    console.log(`\nTrain Case ${t + 1}:`);
    const pair = data.train[t];
    const out = solveSubgridConnections(pair.input);
    
    // Check if output matches expected
    for (let r = 0; r < out.length; r++) {
        let rowStr = "";
        let expStr = "";
        for (let c = 0; c < out[0].length; c++) {
            rowStr += out[r][c];
            expStr += pair.output[r][c];
        }
        if (rowStr !== expStr) {
            console.log(`Row ${r}:`);
            console.log(`Exp: ${expStr}`);
            console.log(`Got: ${rowStr}`);
        }
    }
}
