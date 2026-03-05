import * as fs from 'fs';
import { GridAgent } from './src/agent.ts';

const agent = new GridAgent();
const file = './training/06df4c85.json';
const data = JSON.parse(fs.readFileSync(file, 'utf-8'));

data.train.forEach((pair: any, index: number) => {
    const result = agent.solve(pair.input, pair.output, data.train);
    const isCorrect = JSON.stringify(result) === JSON.stringify(pair.output);
    console.log(`Train Case ${index + 1}: ${isCorrect ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!isCorrect) {
        console.log("Expected:");
        console.log(pair.output.map((r: number[]) => r.join('')).join('\n'));
        console.log("Got:");
        console.log(result.map((r: number[]) => r.join('')).join('\n'));
    }
});
