import { ARCTensorEngine } from './src/tensor_engine.ts';
import * as fs from 'fs';

const engine = new ARCTensorEngine();

// --- MOCK ARC TASKS ---

// Task 1: 045e512c (Simulated)
// Color 8 is static. Color 2 moves right by 3. Color 3 moves down by 2.
const task1_input = [
    [8, 8, 0, 0, 0, 0, 0],
    [8, 8, 0, 0, 0, 0, 0],
    [0, 0, 2, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 3, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0]
];

const task1_output = [
    [8, 8, 0, 0, 0, 0, 0],
    [8, 8, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 0], // 2 shifted right by 3
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 3, 0, 0, 0, 0, 0]  // 3 shifted down by 2
];

// Task 2: Tiling/Expansion
const task2_input = [
    [4, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
];

const task2_output = [
    [4, 0, 4, 0],
    [0, 0, 0, 0],
    [4, 0, 4, 0],
    [0, 0, 0, 0]
];

// --- HARVESTING ---
console.log("Harvesting ARC JSON Seeds...\n");

const seed1 = engine.solveTensor("045e512c", [{ input: task1_input, output: task1_output }]);
const seed2 = engine.solveTensor("b1948b0a", [{ input: task2_input, output: task2_output }]);

const harvestedSeeds = [seed1, seed2];

// Output to console
console.log(JSON.stringify(harvestedSeeds, null, 2));

// Save to file
fs.writeFileSync('harvested_arc_seeds.json', JSON.stringify(harvestedSeeds, null, 2));
console.log("\n✅ Saved to harvested_arc_seeds.json");
