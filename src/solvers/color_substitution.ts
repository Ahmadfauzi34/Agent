/**
 * Color Substitution Solver
 * 
 * Pattern: Each color in the input is mapped to a specific color in the output.
 * The mapping is consistent across all training examples.
 * 
 * This solver learns the color mapping from the training examples and applies it to the test input.
 */
export function solveColorSubstitution(input: number[][], trainPairs?: {input: number[][], output: number[][]}[]): number[][] {
    if (!trainPairs || trainPairs.length === 0) return input;
    
    // 1. Learn the color mapping
    const colorMap = new Map<number, number>();
    let isConsistent = true;
    
    for (const pair of trainPairs) {
        const inGrid = pair.input;
        const outGrid = pair.output;
        
        if (inGrid.length !== outGrid.length || inGrid[0].length !== outGrid[0].length) {
            // This solver only works if input and output dimensions are the same
            return input;
        }
        
        for (let r = 0; r < inGrid.length; r++) {
            for (let c = 0; c < inGrid[0].length; c++) {
                const inColor = inGrid[r][c];
                const outColor = outGrid[r][c];
                
                if (colorMap.has(inColor)) {
                    if (colorMap.get(inColor) !== outColor) {
                        isConsistent = false;
                        break;
                    }
                } else {
                    colorMap.set(inColor, outColor);
                }
            }
            if (!isConsistent) break;
        }
        if (!isConsistent) break;
    }
    
    if (!isConsistent || colorMap.size === 0) {
        return input; // Fallback if mapping is inconsistent
    }
    
    // Check if the mapping actually changes anything
    let changesSomething = false;
    for (const [inColor, outColor] of colorMap.entries()) {
        if (inColor !== outColor) {
            changesSomething = true;
            break;
        }
    }
    
    if (!changesSomething) {
        return input; // Fallback if it's just an identity mapping
    }
    
    // 2. Apply the mapping to the test input
    const rows = input.length;
    const cols = input[0].length;
    const output = Array.from({ length: rows }, () => Array(cols).fill(0));
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const inColor = input[r][c];
            if (colorMap.has(inColor)) {
                output[r][c] = colorMap.get(inColor)!;
            } else {
                // If we encounter a color not seen in training, we can try to infer it
                // For example, if it's a bijection, we can find the missing color.
                // But for simplicity, just keep it the same.
                output[r][c] = inColor;
            }
        }
    }
    
    return output;
}
