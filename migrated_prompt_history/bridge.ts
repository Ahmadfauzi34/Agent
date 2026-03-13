import { Physics } from '../core/physics';

export class IdentityBridge {
  findConnections(grid: (Float64Array | number[])[], targetIndex: number, threshold = 0.95) {
    const targetVec = grid[targetIndex];
    const connections: { index: number; score: number }[] =[];

    grid.forEach((vec, idx) => {
      const score = Physics.cosineSimilarity(targetVec, vec);
      if (score > threshold) {
        connections.push({ index: idx, score });
      }
    });
    return connections;
  }

  detectRhythm(connections: { index: number; score: number }[]) {
    if (connections.length < 2) return 0;
    return Math.abs(connections[connections.length - 1].index - connections[connections.length - 2].index);
  }
}
