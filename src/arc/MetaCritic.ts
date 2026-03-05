// src/arc/MetaCritic.ts
import { PDRLogger } from '../pdr/pdr-debug';
import { VSAUtils } from './VSAUtils';

export const MetaCritic = {
    // Memeriksa apakah output masuk akal secara fisik (misal: tidak ada piksel yang hilang, warna valid)
    verify: (input: number[][], output: number[][]): boolean => {
        PDRLogger.trace("🧐 Meta-Critic: Memulai verifikasi output...");
        
        // 1. Cek dimensi
        if (input.length !== output.length || input[0].length !== output[0].length) {
            PDRLogger.trace("   ❌ Meta-Critic: Dimensi tidak cocok!");
            return false;
        }

        // 2. Cek apakah ada warna yang tidak dikenal (misal: > 9)
        for (let y = 0; y < output.length; y++) {
            for (let x = 0; x < output[y].length; x++) {
                if (output[y][x] < 0 || output[y][x] > 9) {
                    PDRLogger.trace(`   ❌ Meta-Critic: Warna tidak valid ditemukan: ${output[y][x]}`);
                    return false;
                }
            }
        }

        // 3. Cek apakah output kosong total (jika input tidak kosong)
        let inputHasContent = false;
        for (let y = 0; y < input.length; y++) {
            for (let x = 0; x < input[y].length; x++) {
                if (input[y][x] !== 0) inputHasContent = true;
            }
        }
        
        let outputHasContent = false;
        for (let y = 0; y < output.length; y++) {
            for (let x = 0; x < output[y].length; x++) {
                if (output[y][x] !== 0) outputHasContent = true;
            }
        }

        if (inputHasContent && !outputHasContent) {
            PDRLogger.trace("   ❌ Meta-Critic: Output kosong padahal input berisi!");
            return false;
        }

        // 4. Cek konsistensi jumlah objek (Sederhana: objek tidak boleh hilang total)
        const inputObjs = VSAUtils.findObjects(input);
        const outputObjs = VSAUtils.findObjects(output);
        
        if (inputObjs.length > 0 && outputObjs.length === 0) {
            PDRLogger.trace("   ❌ Meta-Critic: Objek hilang!");
            return false;
        }

        // 5. Cek Simetri (Jika input simetris, output harus simetris)
        const checkSymmetry = (grid: number[][]) => {
            const h = grid.length;
            const w = grid[0].length;
            let horizontal = true, vertical = true, diagonal = true;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    if (grid[y][x] !== grid[y][w - 1 - x]) horizontal = false;
                    if (grid[y][x] !== grid[h - 1 - y][x]) vertical = false;
                    if (x < w && y < h && x < h && y < w && grid[y][x] !== grid[x][y]) diagonal = false;
                }
            }
            return { horizontal, vertical, diagonal };
        };

        const inSym = checkSymmetry(input);
        const outSym = checkSymmetry(output);

        if ((inSym.horizontal && !outSym.horizontal) || 
            (inSym.vertical && !outSym.vertical) ||
            (inSym.diagonal && !outSym.diagonal)) {
            PDRLogger.trace("   ❌ Meta-Critic: Simetri pola terlanggar!");
            return false;
        }

        PDRLogger.trace("   ✅ Meta-Critic: Output lolos verifikasi.");
        return true;
    }
};
