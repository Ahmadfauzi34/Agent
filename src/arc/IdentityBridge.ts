import { Physics } from '../vsa/physics-utils';

export class IdentityBridge {
  // Mencari semua posisi yang mirip dengan posisi target
  findConnections(grid: (Float64Array | number[])[], targetIndex: number, threshold = 0.95) {
    const targetVec = grid[targetIndex];
    const connections: { index: number; score: number }[] = [];

    grid.forEach((vec, idx) => {
      const score = Physics.cosineSimilarity(targetVec, vec);
      if (score > threshold) {
        connections.push({ index: idx, score });
      }
    });

    return connections;
  }

  // Menemukan Irama/Jarak (Rhythm Detection)
  detectRhythm(connections: { index: number; score: number }[]) {
    if (connections.length < 2) return 0;
    // Jarak antara dua deteksi terakhir
    return Math.abs(connections[connections.length - 1].index - connections[connections.length - 2].index);
  }
}
