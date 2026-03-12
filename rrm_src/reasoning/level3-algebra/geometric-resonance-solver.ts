import { PDRLogger } from '../level1-pdr/pdr-debug';

type Grid = number[][];

export class GeometricResonanceSolver {
  
  // 1. DAFTAR TRANSFORMASI FISIKA (Tanpa Bobot)
  private transforms = [
    { id: 'IDENTITY',   fn: (g: Grid) => g },
    { id: 'MIRROR_X',   fn: (g: Grid) => g.map(row => [...row].reverse()) },
    { id: 'MIRROR_Y',   fn: (g: Grid) => [...g].reverse() },
    { id: 'TRANSPOSE',  fn: (g: Grid) => g[0].map((_, i) => g.map(row => row[i])) },
    { id: 'ROT_180',    fn: (g: Grid) => [...g].reverse().map(row => [...row].reverse()) },
  ];

  public solve(trainPairs: {input: Grid, output: Grid}[], testInput: Grid): Grid | null {
    PDRLogger.log("🚀 GRS: Mencari Resonansi Geometri (Translation-Invariant)...");

    for (const transform of this.transforms) {
      let isMatch = true;
      let colorMap: Record<number, number> = {};
      let globalOffset: { dx: number, dy: number } | null = null;

      for (const pair of trainPairs) {
        const transformedInput = transform.fn(pair.input);
        
        // Cek Resonansi: Apakah Bentuknya Cocok (setelah alignment)?
        const matchResult = this.checkResonance(transformedInput, pair.output);
        
        if (!matchResult.isGeometricMatch) {
          isMatch = false;
          break;
        }

        // Pastikan offset konsisten antar pair (opsional, tapi bagus untuk validasi)
        if (globalOffset === null) {
            globalOffset = matchResult.offset;
        } else {
            // Jika offset berbeda antar pair, mungkin bukan hukum universal, 
            // TAPI untuk ARC, kadang offset relatif terhadap objek, bukan grid absolut.
            // Untuk saat ini kita izinkan offset berbeda asalkan bentuknya resonan.
            // (Atau kita bisa enforce konsistensi jika perlu)
        }

        // Simpan pola warna yang ditemukan
        colorMap = { ...colorMap, ...matchResult.detectedColors };
      }

      if (isMatch) {
        PDRLogger.log(`✅ RESONANSI DITEMUKAN: ${transform.id}`);
        // Kita perlu menghitung offset untuk Test Input.
        // Asumsi sederhana: Gunakan offset dari pair terakhir atau rata-rata?
        // Masalah: Offset mungkin bergantung pada posisi input.
        // Solusi: Kita hanya menerapkan transformasi bentuk + color map. 
        // Posisi output test harus dihitung.
        // JIKA offset konsisten (misal selalu dx=2, dy=2), kita pakai itu.
        // JIKA offset bergantung posisi input, kita perlu logika lebih canggih (seperti CoordinateSolver).
        
        // SEMENTARA: Kita asumsikan offset = 0 atau kita cari offset dari Test Input (jika ada logic posisi).
        // TAPI GRS ini "Resonance", artinya "Bentuknya Sama".
        // Jika Task 05 adalah Transpose + Geser, kita harus tahu gesernya berapa.
        
        // HACK: Untuk Task 05, CoordinateSolver menemukan dx=2, dy=-2.
        // GRS tanpa logika posisi yang kuat mungkin hanya bisa menebak bentuk.
        // Mari kita coba kembalikan bentuk yang sudah ditransformasi, 
        // lalu kita "center" kan atau biarkan di posisi aslinya (jika offset 0).
        
        // UPDATE: checkResonance sekarang mengembalikan offset. 
        // Jika kita ingin GRS menangani translasi, kita harus menerapkan translasi itu ke Test Input.
        // Mari kita ambil offset dari pair pertama sebagai tebakan terbaik.
        const finalOffset = globalOffset || { dx: 0, dy: 0 };
        
        return this.applyFinal(transform.fn(testInput), colorMap, finalOffset);
      }
    }

    return null; // Gagal, silakan lanjut ke Level 3 Brute Force
  }

  /**
   * 🧠 INTI FISIKA: Check Resonance dengan Alignment
   * Memeriksa apakah dua grid memiliki struktur posisi yang sama SETELAH digeser agar overlap.
   */
  private checkResonance(transformed: Grid, output: Grid) {
    const bboxIn = this.getBoundingBox(transformed);
    const bboxOut = this.getBoundingBox(output);

    // Jika salah satu kosong (tidak ada objek), anggap tidak cocok kecuali keduanya kosong
    if (!bboxIn || !bboxOut) {
        return { isGeometricMatch: !bboxIn && !bboxOut, detectedColors: {}, offset: {dx:0, dy:0} };
    }

    // Cek ukuran bounding box harus sama persis
    if (bboxIn.w !== bboxOut.w || bboxIn.h !== bboxOut.h) {
        return { isGeometricMatch: false, detectedColors: {}, offset: {dx:0, dy:0} };
    }

    const detectedColors: Record<number, number> = {};
    const offset = { dx: bboxOut.minX - bboxIn.minX, dy: bboxOut.minY - bboxIn.minY };

    // Iterasi relatif terhadap bounding box
    for (let r = 0; r < bboxIn.h; r++) {
      for (let c = 0; c < bboxIn.w; c++) {
        const inVal = transformed[bboxIn.minY + r][bboxIn.minX + c];
        const outVal = output[bboxOut.minY + r][bboxOut.minX + c];

        // Jika input ada warna tapi output kosong (atau sebaliknya) -> Tidak Resonansi
        if ((inVal === 0 && outVal !== 0) || (inVal !== 0 && outVal === 0)) {
          return { isGeometricMatch: false, detectedColors: {}, offset: {dx:0, dy:0} };
        }

        if (inVal !== 0) {
          if (detectedColors[inVal] !== undefined && detectedColors[inVal] !== outVal) {
            return { isGeometricMatch: false, detectedColors: {}, offset: {dx:0, dy:0} }; // Warna tidak konsisten
          }
          detectedColors[inVal] = outVal;
        }
      }
    }

    return { isGeometricMatch: true, detectedColors, offset };
  }

  private getBoundingBox(grid: Grid) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let hasPixel = false;
      for (let y = 0; y < grid.length; y++) {
          for (let x = 0; x < grid[0].length; x++) {
              if (grid[y][x] !== 0) {
                  hasPixel = true;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
              }
          }
      }
      if (!hasPixel) return null;
      return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  private applyFinal(grid: Grid, colorMap: Record<number, number>, offset: {dx: number, dy: number}): Grid {
    const H = grid.length;
    const W = grid[0].length;
    const result = Array.from({ length: H }, () => Array(W).fill(0));

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const val = grid[y][x];
            if (val !== 0) {
                const nx = x + offset.dx;
                const ny = y + offset.dy;
                if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                    result[ny][nx] = colorMap[val] || val;
                }
            }
        }
    }
    return result;
  }
}
