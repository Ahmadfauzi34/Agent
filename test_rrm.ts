
import { GridAgent } from './src/agent.ts';

const agent = new GridAgent();

// --- Test Case 1: Frame Extraction ---
console.log("\n========================================");
console.log("TEST CASE 1: Frame Extraction (Scaling)");
console.log("========================================");

const input1 = [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 1, 2, 1, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0]
];
const output1 = [
    [1, 1, 1],
    [1, 2, 1],
    [1, 1, 1]
];
// Training pair to teach the rule
const train1 = [{ input: input1, output: output1 }];
// Test input (same logic)
const test1 = [
    [0, 0, 0, 0],
    [0, 3, 3, 0],
    [0, 3, 3, 0],
    [0, 0, 0, 0]
];

agent.solve(test1, undefined, train1);


// --- Test Case 2: Pattern Split ---
console.log("\n========================================");
console.log("TEST CASE 2: Pattern Split (Periodicity)");
console.log("========================================");

const input2 = [
    [1, 2, 1, 2],
    [3, 4, 3, 4],
    [1, 2, 1, 2],
    [3, 4, 3, 4]
];
const output2 = [
    [1, 2],
    [3, 4]
];
const train2 = [{ input: input2, output: output2 }];
const test2 = [
    [5, 6, 5, 6],
    [7, 8, 7, 8],
    [5, 6, 5, 6],
    [7, 8, 7, 8]
];

agent.solve(test2, undefined, train2);


// --- Test Case 3: Magnetic Attraction ---
console.log("\n========================================");
console.log("TEST CASE 3: Magnetic Attraction (Movement)");
console.log("========================================");

const input3 = [
    [1, 0, 0, 0, 2],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
];
const output3 = [
    [0, 1, 2, 0, 0], // Moved closer
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
];
const train3 = [{ input: input3, output: output3 }];
const test3 = [
    [3, 0, 0, 0, 4],
    [0, 0, 0, 0, 0]
];

agent.solve(test3, undefined, train3);


// --- Test Case 4: Gravity ---
console.log("\n========================================");
console.log("TEST CASE 4: Gravity (Falling)");
console.log("========================================");

const input4 = [
    [1, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
];
const output4 = [
    [0, 0, 0],
    [0, 0, 0],
    [1, 0, 0]
];
const train4 = [{ input: input4, output: output4 }];
const test4 = [
    [0, 2, 0],
    [0, 0, 0],
    [0, 0, 0]
];

agent.solve(test4, undefined, train4);


// --- Test Case 5: Multi-Step (Gravity + Color Mapping) ---
console.log("\n========================================");
console.log("TEST CASE 5: Multi-Step (Gravity + Color)");
console.log("========================================");

const input5 = [
    [0, 1, 0],
    [0, 0, 0],
    [0, 0, 0]
];
const output5 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 2, 0]
];
const train5 = [
    { input: [[0, 1, 0], [0, 0, 0], [0, 0, 0]], output: [[0, 0, 0], [0, 0, 0], [0, 2, 0]] },
    { input: [[0, 3, 0], [0, 0, 0], [0, 0, 0]], output: [[0, 0, 0], [0, 0, 0], [0, 4, 0]] }
];
const test5 = [
    [0, 5, 0],
    [0, 0, 0],
    [0, 0, 0]
];

const result5 = agent.solve(test5, [[0, 0, 0], [0, 0, 0], [0, 6, 0]], train5);
console.log("Final Result 5:", JSON.stringify(result5));
