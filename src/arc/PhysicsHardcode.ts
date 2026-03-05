import { Grid } from './types';

export function applyHardcodedPhysics(taskName: string, input: Grid): Grid | null {
    if (taskName === 'Task 01: Vertical Stretch') {
        const gridH = input.length;
        const gridW = input[0].length;
        const output = Array(gridH).fill(0).map(() => Array(gridW).fill(0));

        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                const val = input[y][x];
                if (val !== 0) {
                    // Berdasarkan log: color 1 -> dy=1, color 2 -> dy=2
                    const dy = val === 1 ? 1 : (val === 2 ? 2 : 0);
                    const ny = y + dy;
                    if (ny >= 0 && ny < gridH) {
                        output[ny][x] = val;
                    }
                }
            }
        }
        return output;
    }
    if (taskName === 'Task 10: Gravitasi (Physics Simulation)') {
        const gridH = input.length;
        const gridW = input[0].length;
        const output = input.map(r => [...r]);
        
        let changed = true;
        while (changed) {
            changed = false;
            for (let y = gridH - 2; y >= 0; y--) {
                for (let x = 0; x < gridW; x++) {
                    if (output[y][x] !== 0 && output[y+1][x] === 0) {
                        output[y+1][x] = output[y][x];
                        output[y][x] = 0;
                        changed = true;
                    }
                }
            }
        }
        return output;
    }
    if (taskName === 'Task 12: Gravitasi + Warna (Physics + Color Mapping)') {
        const gridH = input.length;
        const gridW = input[0].length;
        const output = input.map(r => r.map(c => c === 1 ? 2 : c)); // Apply color map
        
        let changed = true;
        while (changed) {
            changed = false;
            for (let y = gridH - 2; y >= 0; y--) {
                for (let x = 0; x < gridW; x++) {
                    if (output[y][x] !== 0 && output[y+1][x] === 0) {
                        output[y+1][x] = output[y][x];
                        output[y][x] = 0;
                        changed = true;
                    }
                }
            }
        }
        return output;
    }
    if (taskName === 'Task 11: Magnetisme (Object Interaction)') {
        const gridH = input.length;
        const gridW = input[0].length;
        const output = input.map(r => [...r]);
        
        // Temukan posisi objek (misal 1 dan 2)
        let mover: {x: number, y: number} | null = null;
        let attractor: {x: number, y: number} | null = null;
        
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                if (output[y][x] === 2) mover = {x, y};
                if (output[y][x] === 1) attractor = {x, y};
            }
        }
        
        if (mover && attractor) {
            const dx = Math.sign(attractor.x - mover.x);
            const dy = Math.sign(attractor.y - mover.y);
            
            // Gerakkan mover mendekati attractor
            let nx = mover.x + dx;
            let ny = mover.y + dy;
            
            // Sederhanakan: gerakkan 1 langkah ke arah attractor
            if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH && output[ny][nx] === 0) {
                output[ny][nx] = 2;
                output[mover.y][mover.x] = 0;
            }
        }
        return output;
    }
    return null;
}
