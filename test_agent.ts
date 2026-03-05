import * as fs from 'fs';
import { GridAgent } from './src/agent.ts';

const agent = new GridAgent();

const files = [
    './training/007bbfb7.json',
    './training/00d62c1b.json',
    './training/017c7c7b.json',
    './training/025d127b.json',
    './training/045e512c.json',
    './training/0520fde7.json',
    './training/05269061.json',
    './training/05f2a901.json',
    './training/06df4c85.json',
    './training/08ed6ac7.json',
    './training/09629e4f.json',
    './training/0962bcdd.json',
    './training/0a938d79.json',
    './training/0b148d64.json',
    './training/0ca9ddb6.json',
    './training/0d3d703e.json',
    './training/0dfd9992.json',
    './training/0e206a2e.json',
    './10fcaaa3.json',
    './11852cab.json',
    './1190e5a7.json',
    './137eaa0f.json',
    './training/05f2a901.json',
    './150deff5.json',
    './178fcbfb.json',
    './1a07d186.json',
    './1b2d62fb.json',
    './1bfc4729.json',
    './1c786137.json'
];

files.forEach(file => {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    console.log(`\nTesting agent on ${file}...`);
    
    data.train.forEach((pair: any, index: number) => {
        const result = agent.solve(pair.input, pair.output, data.train);
        const isCorrect = JSON.stringify(result) === JSON.stringify(pair.output);
        console.log(`  Train Case ${index + 1}: ${isCorrect ? 'PASSED ✅' : 'FAILED ❌'}`);
    });

    data.test.forEach((pair: any, index: number) => {
        const result = agent.solve(pair.input, pair.output, data.train);
        const isCorrect = JSON.stringify(result) === JSON.stringify(pair.output);
        console.log(`  Test Case ${index + 1}: ${isCorrect ? 'PASSED ✅' : 'FAILED ❌'}`);
    });
});
