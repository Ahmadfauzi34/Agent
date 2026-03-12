import { z } from 'zod';

export const PatternSchema = z.object({
    formulaName: z.string(),
    a: z.number(),
    b: z.number(),
    c: z.number(),
    d: z.number(),
    e: z.number(),
    f: z.number(),
    accuracy: z.number(),
    usageCount: z.number(),
    lastUsed: z.number(),
    version: z.string().optional()
});

export const PatternArraySchema = z.array(PatternSchema);
export type Pattern = z.infer<typeof PatternSchema>;

export type Grid = number[][];

export interface TaskPair {
    input: Grid;
    output: Grid;
}

export interface Task {
    name?: string;
    train: TaskPair[];
    test: TaskPair[];
}
