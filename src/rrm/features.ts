/**
 * RRM (Recursive Reasoning Machine) - Feature Analyzer
 * 
 * This module extracts "Physics" and "Signal" properties from the grid.
 * It does NOT solve the problem, it only describes the state of the world.
 */

export interface GridFeatures {
    mass: number;           // Total non-zero pixels
    centerOfMass: {r: number, c: number}; // Weighted center (gravity)
    density: number;        // Mass / Area
    symmetry: {             // Signal correlation
        horizontal: number, // 0 to 1
        vertical: number,   // 0 to 1
        diagonal: number    // 0 to 1
    };
    periodicity: {          // Repeating patterns (FFT-like)
        rowPeriod: number,  // e.g., 3 means pattern repeats every 3 rows
        colPeriod: number   // e.g., 2 means pattern repeats every 2 cols
    };
    boundingBox: {r: number, c: number, h: number, w: number};
}

// --- Physics Calculations ---

function calculateMass(grid: number[][]): number {
    let mass = 0;
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            if (grid[r][c] !== 0) mass++;
        }
    }
    return mass;
}

function calculateCenterOfMass(grid: number[][]): {r: number, c: number} {
    let mass = 0;
    let sumR = 0;
    let sumC = 0;
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            if (grid[r][c] !== 0) {
                mass++;
                sumR += r;
                sumC += c;
            }
        }
    }
    if (mass === 0) return {r: -1, c: -1};
    return {r: sumR / mass, c: sumC / mass};
}

// --- Signal Calculations ---

function calculateSymmetry(grid: number[][]): {horizontal: number, vertical: number, diagonal: number} {
    const H = grid.length;
    const W = grid[0].length;
    let hMatch = 0, vMatch = 0, dMatch = 0;
    let total = H * W;

    // Horizontal (Left-Right Mirror)
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (grid[r][c] === grid[r][W - 1 - c]) hMatch++;
        }
    }

    // Vertical (Top-Bottom Mirror)
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (grid[r][c] === grid[H - 1 - r][c]) vMatch++;
        }
    }

    // Diagonal (Transpose Mirror) - Only for square-ish logic
    let dTotal = 0;
    for (let r = 0; r < Math.min(H, W); r++) {
        for (let c = 0; c < Math.min(H, W); c++) {
            dTotal++;
            if (grid[r][c] === grid[c][r]) dMatch++;
        }
    }

    return {
        horizontal: hMatch / total,
        vertical: vMatch / total,
        diagonal: dTotal > 0 ? dMatch / dTotal : 0
    };
}

function calculatePeriodicity(grid: number[][]): {rowPeriod: number, colPeriod: number} {
    const H = grid.length;
    const W = grid[0].length;

    // Row Periodicity (Vertical repetition)
    // Simple autocorrelation: check if row r == row r+k
    let bestRowPeriod = 0;
    let maxRowScore = 0;

    for (let k = 1; k <= H / 2; k++) {
        let match = 0;
        let count = 0;
        for (let r = 0; r < H - k; r++) {
            count++;
            let rowMatch = true;
            for (let c = 0; c < W; c++) {
                if (grid[r][c] !== grid[r + k][c]) {
                    rowMatch = false;
                    break;
                }
            }
            if (rowMatch) match++;
        }
        if (count > 0) {
            const score = match / count;
            if (score > 0.8 && score > maxRowScore) { // Threshold 80% match
                maxRowScore = score;
                bestRowPeriod = k;
            }
        }
    }

    // Col Periodicity (Horizontal repetition)
    let bestColPeriod = 0;
    let maxColScore = 0;

    for (let k = 1; k <= W / 2; k++) {
        let match = 0;
        let count = 0;
        for (let c = 0; c < W - k; c++) {
            count++;
            let colMatch = true;
            for (let r = 0; r < H; r++) {
                if (grid[r][c] !== grid[r][c + k]) {
                    colMatch = false;
                    break;
                }
            }
            if (colMatch) match++;
        }
        if (count > 0) {
            const score = match / count;
            if (score > 0.8 && score > maxColScore) {
                maxColScore = score;
                bestColPeriod = k;
            }
        }
    }

    return { rowPeriod: bestRowPeriod, colPeriod: bestColPeriod };
}

function getBoundingBox(grid: number[][]) {
    let minR = grid.length, maxR = -1, minC = grid[0].length, maxC = -1;
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            if (grid[r][c] !== 0) {
                if (r < minR) minR = r;
                if (r > maxR) maxR = r;
                if (c < minC) minC = c;
                if (c > maxC) maxC = c;
            }
        }
    }
    if (maxR === -1) return {r: 0, c: 0, h: 0, w: 0};
    return {r: minR, c: minC, h: maxR - minR + 1, w: maxC - minC + 1};
}

// --- Main Analyzer Function ---

export function analyzeGrid(grid: number[][]): GridFeatures {
    const mass = calculateMass(grid);
    const H = grid.length;
    const W = grid[0].length;
    
    return {
        mass: mass,
        centerOfMass: calculateCenterOfMass(grid),
        density: mass / (H * W),
        symmetry: calculateSymmetry(grid),
        periodicity: calculatePeriodicity(grid),
        boundingBox: getBoundingBox(grid)
    };
}
