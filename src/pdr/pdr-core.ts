// src/pdr/pdr-core.ts
import { YStreamPrimal } from './y-stream';
import { ZStreamDual } from './z-stream';
import { IdentityBridge } from '../arc/IdentityBridge';

export class PDRCoreWeightless {
  private yStream = new YStreamPrimal();
  private zStream: ZStreamDual;
  private bridge = new IdentityBridge();

  constructor(dimension = 1024) {
    this.zStream = new ZStreamDual(dimension);
  }

  solve(grid: (Float64Array | number[])[]) {
    const results: string[] = [];

    grid.forEach((row, idx) => {
      // 1. Z-Stream: "Apakah baris ini punya pola berulang?"
      const spectral = this.zStream.analyze(row);
      
      // 2. Y-Stream: "Di mana letak objek-objek di baris ini?"
      const positions = this.yStream.detectObjects(row);

      // 3. RESONANSI (The Bridge)
      if (spectral.isStructured && positions.length > 0) {
        // Jika Z bilang ada pola, dan Y menemukan posisi objeknya...
        // Kita gunakan Bridge untuk memvalidasi Irama
        const connections = this.bridge.findConnections(grid, idx);
        
        // Kita hanya tertarik jika ada lebih dari 1 kemunculan (pola berulang)
        if (connections.length > 1) {
            const rhythm = this.bridge.detectRhythm(connections);

            if (rhythm > 0) {
              results.push(`Resonansi Terdeteksi! Baris ${idx} mengikuti Irama ${rhythm} baris.`);
            }
        }
      } else if (positions.length === 1) {
        // Jika tidak ada pola global, tapi ada objek tunggal yang tajam
        results.push(`Singularitas Terdeteksi! Objek tunggal di baris ${idx}, posisi ${positions[0]}.`);
      }
    });

    return results;
  }
}
