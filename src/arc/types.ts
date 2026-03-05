import { z } from 'zod';

export type Grid = number[][];

export interface TaskPair {
    input: Grid;
    output: Grid;
}

export interface Task {
    name: string;
    train: TaskPair[];
    test: TaskPair[];
}

export interface Pattern {
    version: string;
    formulaName: string;
    a: number; b: number; c: number;
    d: number; e: number; f: number;
    accuracy: number;
    usageCount: number;
    lastUsed: number;
}

export const PatternSchema = z.object({
    version: z.string(),
    formulaName: z.string(),
    a: z.number(), b: z.number(), c: z.number(),
    d: z.number(), e: z.number(), f: z.number(),
    accuracy: z.number(),
    usageCount: z.number(),
    lastUsed: z.number(),
});

export const PatternArraySchema = z.array(PatternSchema);
