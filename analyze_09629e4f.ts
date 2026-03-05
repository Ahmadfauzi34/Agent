import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('./training/09629e4f.json', 'utf-8'));

data.train.forEach((pair: any, index: number) => {
    console.log(`Train Case ${index + 1}:`);
    console.log(`Input size: ${pair.input.length}x${pair.input[0].length}`);
    console.log(`Output size: ${pair.output.length}x${pair.output[0].length}`);
    
    // Print unique colors
    const inColors = new Set<number>();
    pair.input.forEach((row: number[]) => row.forEach(c => inColors.add(c)));
    const outColors = new Set<number>();
    pair.output.forEach((row: number[]) => row.forEach(c => outColors.add(c)));
    
    console.log(`Input colors: ${Array.from(inColors).sort().join(', ')}`);
    console.log(`Output colors: ${Array.from(outColors).sort().join(', ')}`);
    
    console.log("Input:");
    pair.input.forEach((row: number[]) => console.log(row.map(c => c === 0 ? '.' : c.toString()).join('')));
    console.log("Output:");
    pair.output.forEach((row: number[]) => console.log(row.map(c => c === 0 ? '.' : c.toString()).join('')));
});

console.log("Test Case 1:");
const testPair = data.test[0];
console.log(`Input size: ${testPair.input.length}x${testPair.input[0].length}`);
const testInColors = new Set<number>();
testPair.input.forEach((row: number[]) => row.forEach(c => testInColors.add(c)));
console.log(`Input colors: ${Array.from(testInColors).sort().join(', ')}`);
console.log("Input:");
testPair.input.forEach((row: number[]) => console.log(row.map(c => c === 0 ? '.' : c.toString()).join('')));
