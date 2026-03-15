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
