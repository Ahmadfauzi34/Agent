
// src/pdr/object-segmenter.ts

export interface ARCObject {
  id: number;
  color: number;
  pixels: { x: number; y: number }[];
  center: { x: number; y: number };
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
}

export class ObjectSegmenter {
  // Melakukan segmentasi grid menjadi objek-objek terpisah
  // Menggunakan algoritma Connected Components (Flood Fill)
  // Mengabaikan warna latar belakang (biasanya 0 / Hitam)
  public static segment(grid: number[][], backgroundColor: number = 0): ARCObject[] {
    const h = grid.length;
    const w = grid[0].length;
    const visited = Array(h).fill(false).map(() => Array(w).fill(false));
    const objects: ARCObject[] = [];
    let objectId = 1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const color = grid[y][x];
        
        // Jika bukan background dan belum dikunjungi, ini adalah objek baru
        if (color !== backgroundColor && !visited[y][x]) {
          const pixels: { x: number; y: number }[] = [];
          
          // Lakukan Flood Fill untuk menemukan semua pixel yang terhubung
          this.floodFill(grid, x, y, color, visited, pixels);
          
          // Hitung properti objek
          const center = this.calculateCenter(pixels);
          const boundingBox = this.calculateBoundingBox(pixels);

          objects.push({
            id: objectId++,
            color,
            pixels,
            center,
            boundingBox
          });
        }
      }
    }

    return objects;
  }

  private static floodFill(
    grid: number[][], 
    startX: number, 
    startY: number, 
    targetColor: number, 
    visited: boolean[][], 
    pixels: { x: number; y: number }[]
  ) {
    const h = grid.length;
    const w = grid[0].length;
    const stack = [{ x: startX, y: startY }];

    visited[startY][startX] = true;

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      pixels.push({ x, y });

      // Cek 4 tetangga (Atas, Bawah, Kiri, Kanan)
      const neighbors = [
        { x: x + 1, y: y },
        { x: x - 1, y: y },
        { x: x, y: y + 1 },
        { x: x, y: y - 1 }
      ];

      for (const n of neighbors) {
        if (
          n.x >= 0 && n.x < w && 
          n.y >= 0 && n.y < h && 
          !visited[n.y][n.x] && 
          grid[n.y][n.x] === targetColor
        ) {
          visited[n.y][n.x] = true;
          stack.push(n);
        }
      }
    }
  }

  private static calculateCenter(pixels: { x: number; y: number }[]): { x: number; y: number } {
    let sumX = 0;
    let sumY = 0;
    for (const p of pixels) {
      sumX += p.x;
      sumY += p.y;
    }
    return {
      x: sumX / pixels.length,
      y: sumY / pixels.length
    };
  }

  private static calculateBoundingBox(pixels: { x: number; y: number }[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pixels) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }
}
