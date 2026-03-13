/**
 * Quantum & Tensor Math Utilities
 * Berisi fungsi-fungsi matematika kontinu murni tanpa if-else.
 */

export const dotProduct = (vecA: number[], vecB: number[]): number => 
    vecA.reduce((sum, val, i) => sum + (val * vecB[i]), 0);

export const addVectors = (vecA: number[], vecB: number[]): number[] => 
    vecA.map((val, i) => val + vecB[i]);

export const scaleVector = (vec: number[], scalar: number): number[] => 
    vec.map(val => val * scalar);

export const matVecMultiply = (matrix: number[][], vec: number[]): number[] => 
    matrix.map(row => dotProduct(row, vec));

export const waveCollapse = (energies: number[], temp: number = 0.1): number[] => {
    // Normalisasi energi untuk mencegah overflow pada Math.exp
    const maxEnergy = Math.max(...energies);
    const normalizedEnergies = energies.map(e => e - maxEnergy);
    
    const exponentials = normalizedEnergies.map(e => Math.exp(e / temp));
    const totalEnergy = exponentials.reduce((sum, val) => sum + val, 0);
    return exponentials.map(e => e / totalEnergy);
};

export const addMatricesWeighted = (matrices: number[][][], weights: number[]): number[][] => {
    const size = matrices[0].length;
    let result = Array.from({ length: size }, () => new Array(size).fill(0));
    
    matrices.forEach((matrix, mIdx) => {
        const weight = weights[mIdx];
        matrix.forEach((row, i) => {
            row.forEach((val, j) => {
                result[i][j] += val * weight;
            });
        });
    });
    return result;
};
