import { ARCTensorEngine } from './src/tensor_engine.ts';
import * as fs from 'fs';
import * as path from 'path';

const engine = new ARCTensorEngine();
const rootDir = './';
const harvestedSeeds: any[] = [];

console.log("Starting ARC JSON Harvesting...");

// Read all files in the root directory
const files = fs.readdirSync(rootDir);

// Filter for JSON files that look like ARC tasks (8 characters hex name)
const arcFiles = files.filter(file => file.match(/^[0-9a-f]{8}\.json$/));

console.log(`Found ${arcFiles.length} ARC task files.`);

let successCount = 0;
let errorCount = 0;

for (const file of arcFiles) {
    const taskId = path.basename(file, '.json');
    try {
        const rawData = fs.readFileSync(path.join(rootDir, file), 'utf-8');
        const taskData = JSON.parse(rawData);
        
        if (taskData && taskData.train && Array.isArray(taskData.train)) {
            // Run the tensor engine
            const seed = engine.solveTensor(taskId, taskData.train);
            harvestedSeeds.push(seed);
            successCount++;
        } else {
            console.warn(`Skipping ${file}: Invalid ARC format (missing 'train' array)`);
        }
    } catch (e) {
        console.error(`Error processing ${file}:`, e);
        errorCount++;
    }
}

// Save all harvested seeds to a single file
const outputFile = 'all_harvested_arc_seeds.json';
fs.writeFileSync(outputFile, JSON.stringify(harvestedSeeds, null, 2));

console.log(`\nHarvesting Complete!`);
console.log(`Successfully processed: ${successCount}`);
console.log(`Errors: ${errorCount}`);
console.log(`Saved to: ${outputFile}`);
