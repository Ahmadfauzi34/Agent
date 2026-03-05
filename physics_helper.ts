/**
 * Physics Helper Script using Nerdamer
 * 
 * Usage:
 * npx ts-node physics_helper.ts
 * 
 * This script demonstrates how to use nerdamer to solve symbolic and numeric physics problems.
 * You can modify the 'solvePhysics' calls at the bottom to solve different equations.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nerdamer = require('nerdamer');
const FFT = require('fft.js');
require('nerdamer/Algebra');
require('nerdamer/Calculus');
require('nerdamer/Solve');

// Helper function to solve physics equations
function solvePhysics(equation: string, variable: string, values?: Record<string, number>) {
    console.log(`\n--- Solving for ${variable} in: ${equation} ---`);
    
    // 1. Solve symbolically first
    try {
        const solution = nerdamer(equation).solveFor(variable);
        console.log(`Symbolic Solution: ${solution.toString()}`);

        // 2. If values are provided, substitute and evaluate
        if (values) {
            // nerdamer.solve returns an expression or a list of expressions.
            // We need to evaluate each solution.
            const solutions = solution.toString().replace('[', '').replace(']', '').split(',');
            
            solutions.forEach((sol: string) => {
                let evaluated = nerdamer(sol).evaluate(values);
                console.log(`  Result for ${sol}: ${evaluated.text()}`);
            });
        }
    } catch (e) {
        console.error("Error solving:", e);
    }
}

// Helper function to calculate FFT of a signal
function calculateFFT(signal: number[], sampleRate: number) {
    console.log(`\n--- Calculating FFT for signal with ${signal.length} samples ---`);

    // 1. Determine FFT size (next power of 2)
    let size = 1;
    while (size < signal.length) size *= 2;
    
    // 2. Prepare input (pad with zeros)
    const fft = new FFT(size);
    const input = fft.createComplexArray();
    const output = fft.createComplexArray();
    
    for (let i = 0; i < signal.length; i++) {
        input[2 * i] = signal[i]; // Real part
        input[2 * i + 1] = 0;     // Imaginary part
    }

    // 3. Perform FFT
    fft.transform(output, input);

    // 4. Calculate Magnitude Spectrum
    const magnitudes: { frequency: number, magnitude: number }[] = [];
    const uniquePoints = size / 2 + 1; // Nyquist limit

    for (let i = 0; i < uniquePoints; i++) {
        const real = output[2 * i];
        const imag = output[2 * i + 1];
        const magnitude = Math.sqrt(real * real + imag * imag);
        const frequency = i * sampleRate / size;
        
        // Only keep significant peaks for display
        if (magnitude > 0.1) {
             magnitudes.push({ frequency, magnitude });
        }
    }

    // 5. Find dominant frequencies
    magnitudes.sort((a, b) => b.magnitude - a.magnitude);
    console.log("Top 5 Dominant Frequencies:");
    magnitudes.slice(0, 5).forEach((m, idx) => {
        console.log(`  ${idx + 1}. ${m.frequency.toFixed(2)} Hz (Magnitude: ${m.magnitude.toFixed(2)})`);
    });

    return magnitudes;
}

// --- Examples ---

// 1. Kinematics: d = v*t
console.log("1. Kinematics (Simple):");
solvePhysics('d = v * t', 't', { d: 100, v: 20 });

// 2. Kinematics: d = vi*t + 0.5*a*t^2
console.log("2. Kinematics (Acceleration):");
solvePhysics('d = vi * t + 0.5 * a * t^2', 'a', { d: 50, vi: 0, t: 5 });

// 3. Forces: F = m * a
console.log("3. Forces:");
solvePhysics('F = m * a', 'm', { F: 500, a: 9.8 });

// 4. Energy: KE = 0.5 * m * v^2
console.log("4. Kinetic Energy:");
solvePhysics('KE = 0.5 * m * v^2', 'v', { KE: 1000, m: 50 });

// 5. Gravitational Potential Energy: PE = m * g * h
console.log("5. Potential Energy:");
solvePhysics('PE = m * g * h', 'h', { PE: 500, m: 10, g: 9.8 });

// 6. Conservation of Energy: m*g*h = 0.5*m*v^2
console.log("6. Conservation of Energy (Solve for v):");
solvePhysics('m * g * h = 0.5 * m * v^2', 'v', { g: 9.8, h: 20 });

// 7. Signal Processing: FFT Example
console.log("7. Signal Processing (FFT):");
// Generate a composite signal: 50Hz + 120Hz sine waves
const sampleRate = 1000; // Hz
const duration = 1; // seconds
const signal: number[] = [];
for (let i = 0; i < sampleRate * duration; i++) {
    const t = i / sampleRate;
    // Signal = 1.0 * sin(2*pi*50*t) + 0.5 * sin(2*pi*120*t)
    const val = 1.0 * Math.sin(2 * Math.PI * 50 * t) + 0.5 * Math.sin(2 * Math.PI * 120 * t);
    signal.push(val);
}
calculateFFT(signal, sampleRate);
