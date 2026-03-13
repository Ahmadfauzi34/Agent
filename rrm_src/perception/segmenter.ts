export interface ARCObject {
  id: number; color: number; pixels: { x: number; y: number }[];
  center: { x: number; y: number };
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
}

export class ObjectSegmenter {
  /**
   * 🌊 QUANTUM WAVEFRONT SEGMENTATION
   * Replaces floodFill and 'if' statements with amplitude masking and continuous flow.
   */
  public static segment(grid: number[][], backgroundColor: number = 0): ARCObject[] {
    const h = grid.length; const w = grid[0].length;
    const visited = new Int8Array(h * w); // Flat array for tensor operations
    const objects: ARCObject[] = [];
    let objectId = 1;

    for (let i = 0; i < h * w; i++) {
        const y = Math.floor(i / w);
        const x = i % w;
        const color = grid[y][x];

        // Tensor Masking: (IsNotBg * IsNotVisited) === 1 continues execution
        const validMask = ((color - backgroundColor) !== 0 ? 1 : 0) * (1 - visited[i]);

        validMask && (() => {
            const pixels: { x: number; y: number }[] = [];
            this.floodWave(grid, x, y, color, visited, pixels, w, h);

            const bbox = this.calculateBoundingBox(pixels);
            objects.push({
                id: objectId++, color, pixels,
                center: this.calculateCenter(pixels),
                boundingBox: bbox
            });
        })();
    }
    return objects;
  }

  private static floodWave(grid: number[][], startX: number, startY: number, targetColor: number, visited: Int8Array, pixels: { x: number; y: number }[], w: number, h: number) {
    const stack = [{ x: startX, y: startY }];
    visited[startY * w + startX] = 1;

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      pixels.push({ x, y });
      const neighbors = [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];

      for (const n of neighbors) {
        // Continuous Boundary Masking: X bounds [0, w-1] -> 0 or 1
        const boundsX = ((n.x >= 0 ? 1 : 0) * (n.x < w ? 1 : 0));
        const boundsY = ((n.y >= 0 ? 1 : 0) * (n.y < h ? 1 : 0));

        boundsX * boundsY && (() => {
            const idx = n.y * w + n.x;
            const colorMatch = grid[n.y][n.x] === targetColor ? 1 : 0;
            const flowMask = colorMatch * (1 - visited[idx]);

            flowMask && (() => {
                visited[idx] = 1;
                stack.push(n);
            })();
        })();
      }
    }
  }

  private static calculateCenter(pixels: { x: number; y: number }[]): { x: number; y: number } {
    const sumX = pixels.reduce((acc, p) => acc + p.x, 0);
    const sumY = pixels.reduce((acc, p) => acc + p.y, 0);
    return { x: sumX / pixels.length, y: sumY / pixels.length };
  }

  private static calculateBoundingBox(pixels: { x: number; y: number }[]) {
    // Math.min/max arrays bypasses 'if/else' conditionals
    const xs = pixels.map(p => p.x);
    const ys = pixels.map(p => p.y);
    return {
        minX: Math.min(...xs), minY: Math.min(...ys),
        maxX: Math.max(...xs), maxY: Math.max(...ys)
    };
  }
}
