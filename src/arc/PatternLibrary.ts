import { Pattern } from './types';
import { PatternStorage } from './PatternStorage';

export class PatternLibrary {
    private static instance: PatternLibrary;
    private patterns: Pattern[] = [];
    private readonly VERSION = "1.0.0";

    private constructor() {
        // Initialize patterns asynchronously
        this.init();
    }

    private async init() {
        this.patterns = await PatternStorage.load();
    }

    static getInstance(): PatternLibrary {
        if (!PatternLibrary.instance) {
            PatternLibrary.instance = new PatternLibrary();
        }
        return PatternLibrary.instance;
    }

    getPatterns(): Pattern[] {
        return this.patterns;
    }

    async addPattern(pattern: Pattern): Promise<void> {
        // Check if pattern already exists
        const existingIndex = this.patterns.findIndex(p => p.formulaName === pattern.formulaName);
        if (existingIndex === -1) {
            pattern.version = this.VERSION;
            pattern.usageCount = 0;
            pattern.lastUsed = 0;
            this.patterns.push(pattern);
            await PatternStorage.save(this.patterns);
        } else {
            // Update accuracy if it's better
            if (pattern.accuracy > this.patterns[existingIndex].accuracy) {
                this.patterns[existingIndex].accuracy = pattern.accuracy;
                await PatternStorage.save(this.patterns);
            }
        }
    }

    async getBestPattern(inputs: {x: number, y: number}[], outputs: {x: number, y: number}[]): Promise<Pattern | null> {
        let bestPattern: Pattern | null = null;
        let bestScore = -1;

        for (const pattern of this.patterns) {
            let matches = 0;
            for (let i = 0; i < inputs.length; i++) {
                const p = inputs[i];
                const outX = pattern.a * p.x + pattern.b * p.y + pattern.c;
                const outY = pattern.d * p.x + pattern.e * p.y + pattern.f;
                if (Math.abs(outX - outputs[i].x) < 0.1 && Math.abs(outY - outputs[i].y) < 0.1) {
                    matches++;
                }
            }
            const accuracyScore = matches / inputs.length;
            
            // Score = accuracy * 0.8 + (usageCount > 0 ? 0.2 : 0)
            const score = accuracyScore * 0.8 + (pattern.usageCount > 0 ? 0.2 : 0);
            
            if (score > bestScore && accuracyScore >= 0.8) { // Require high confidence
                bestScore = score;
                bestPattern = pattern;
            }
        }
        
        if (bestPattern) {
            bestPattern.usageCount++;
            bestPattern.lastUsed = Date.now();
            await PatternStorage.save(this.patterns);
        }
        
        return bestPattern;
    }
}
