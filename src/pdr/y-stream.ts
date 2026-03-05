// src/pdr/y-stream.ts
export class YStreamPrimal {
  // Mencari "Singularity" (Objek Unik)
  detectObjects(signal: Float64Array | number[]) {
    const objects: number[] = [];
    const sigArray = signal instanceof Float64Array ? signal : new Float64Array(signal);
    
    for (let i = 1; i < sigArray.length - 1; i++) {
      // Filter Laplacian Weightless [-1, 2, -1]
      const laplace = (2 * sigArray[i]) - sigArray[i-1] - sigArray[i+1];
      if (laplace > 1.0) { // Jika ada lonjakan energi tajam
        objects.push(i);
      }
    }
    return objects; // Daftar index posisi objek
  }
}
