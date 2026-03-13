import { HRR as HoloFFT } from '../core/hrr';
import { VSAUtils, LensType, POS_X, POS_Y, ARC_COLORS } from '../perception/vsa-utils';
import { PDRLogger } from '../reasoning/level1-pdr/pdr-debug';

// 🌟 SUCCESS SEED BANK: Menyimpan aturan yang berhasil memecahkan soal sebelumnya
export const SuccessSeedBank: Map<string, { vector: Int32Array, lens: LensType, type: 'transform' | 'constant' }> = new Map();

export const ARCLogic = {
  // Menyimpan aturan sukses ke dalam bank benih (Success Consolidation)
  consolidateSuccess: (taskId: string, lens: LensType, type: 'transform' | 'constant', vector: Int32Array) => {
    const key = `${taskId}_${lens}_${type}`;
    // Gunakan cloneBuffer agar data di Map tidak terpengaruh mutasi di luar
    SuccessSeedBank.set(key, { vector: HoloFFT.cloneBuffer(vector), lens, type });
    PDRLogger.log(`   🌟 Success Consolidated: [${lens}] ${type} rule saved to Seed Bank.`);
  },

  // Mencari apakah ada benih sukses yang cocok dengan pola saat ini
  findMatchingSeed: (inputGrid: number[][], outputGrid: number[][], lens: LensType): { vector: Int32Array, similarity: number, taskId: string } | null => {
    const currentRule = ARCLogic.extractRule(inputGrid, outputGrid, lens);
    let bestSim = -1;
    let bestSeed: { vector: Int32Array, taskId: string } | null = null;

    for (const [key, seed] of SuccessSeedBank.entries()) {
        if (seed.lens === lens && seed.type === 'transform') {
            const sim = HoloFFT.similarity(currentRule, seed.vector);
            if (sim > bestSim) {
                bestSim = sim;
                bestSeed = { vector: seed.vector, taskId: key.split('_')[0]! };
            }
        }
    }

    if (bestSim > 0.9) {
        return { ...bestSeed!, similarity: bestSim };
    }
    return null;
  },

  // Menggabungkan dua aturan menjadi satu (Composition)
  // Dalam VSA, A * B berarti menerapkan B lalu A (atau sebaliknya tergantung konvensi)
  composeRules: (ruleA: Int32Array, ruleB: Int32Array): Int32Array => {
    return HoloFFT.bind(ruleA, ruleB);
  },

  // Menerapkan aturan secara berulang (Recursion/Iteration)
  applyRuleRepeatedly: (inputGrid: number[][], ruleVec: Int32Array, lens: LensType, steps: number): Int32Array => {
    let currentRule = ruleVec;
    if (steps > 1) {
        currentRule = HoloFFT.fractionalBind(ruleVec, steps);
    } else if (steps === 0) {
        // Identity rule
        const id = new Int32Array(ruleVec.length).fill(1);
        currentRule = id;
    }
    return ARCLogic.applyRule(inputGrid, currentRule, lens);
  },

  extractRule: (inputGrid: number[][], outputGrid: number[][], lens: LensType): Int32Array => {
    if (lens === 'COLOR_MAP') {
        const rules: Int32Array[] = [];
        const seen = new Set<string>();
        for (let y = 0; y < inputGrid.length; y++) {
            for (let x = 0; x < inputGrid[y].length; x++) {
                const cIn = inputGrid[y][x];
                const cOut = outputGrid[y] ? outputGrid[y][x] : undefined;
                if (cOut !== undefined) {
                    const key = `${cIn}->${cOut}`;
                    // Hanya simpan mapping unik untuk menghindari bias frekuensi
                    if (!seen.has(key)) {
                        seen.add(key);
                        const cInVec = ARC_COLORS[cIn];
                        const cOutVec = ARC_COLORS[cOut];
                        rules.push(HoloFFT.bind(cOutVec, HoloFFT.inverse(cInVec)));
                    }
                }
            }
        }
        return HoloFFT.bundle(rules);
    }
    const inputVec = VSAUtils.encodeGrid(inputGrid, lens);
    const outputVec = VSAUtils.encodeGrid(outputGrid, lens);
    
    return HoloFFT.bind(outputVec, HoloFFT.inverse(inputVec));
  },

  extractConstantRule: (outputGrid: number[][], lens: LensType): Int32Array => {
    return VSAUtils.encodeGrid(outputGrid, lens);
  },

  // Membersihkan rule dari crosstalk noise dengan mencari komponen dominan di kamus
  cleanUpRule: (noisyRule: Int32Array, lens: LensType): Int32Array => {
      // Hanya bersihkan untuk transformasi spasial murni saat ini
      if (lens === 'IGNORE_COLOR') {
          let bestSim = 0;
          let bestCleanRule = noisyRule;

          // Cek semua kemungkinan translasi (dx, dy)
          for (let dx = -10; dx <= 10; dx++) {
              for (let dy = -10; dy <= 10; dy++) {
                  let shiftX = dx >= 0 ? POS_X[dx] : HoloFFT.inverse(POS_X[-dx]);
                  let shiftY = dy >= 0 ? POS_Y[dy] : HoloFFT.inverse(POS_Y[-dy]);
                  
                  const candidateRule = HoloFFT.bind(shiftX, shiftY);
                  const sim = HoloFFT.similarity(noisyRule, candidateRule);
                  
                  if (sim > bestSim) {
                      bestSim = sim;
                      bestCleanRule = candidateRule;
                  }
              }
          }

          // Jika kita menemukan komponen yang cukup kuat (> 0.3), gunakan itu
          if (bestSim > 0.3) {
              return bestCleanRule;
          }
      }

      if (lens === 'COLOR_MAP') {
          // Since we use unique mappings in extractRule, the rule is already clean.
          // No need to filter further, as it might remove valid rare mappings.
          return noisyRule;
      }

      return noisyRule;
  },

  applyRule: (inputGrid: number[][], ruleVec: Int32Array, lens: LensType): Int32Array => {
    const inputVec = VSAUtils.encodeGrid(inputGrid, lens);
    return HoloFFT.bind(ruleVec, inputVec);
  },

  // Deteksi pola posisi output: Absolute atau Centered
  detectPositionPattern: (trainPairs: {input: number[][], output: number[][]}[]) => {
      if (trainPairs.length === 0) return null;
      
      const centers = trainPairs.map(pair => {
          const c = VSAUtils.getCenterOfMass(pair.output);
          return { 
              center: c, 
              gridW: pair.output[0].length, 
              gridH: pair.output.length 
          };
      });

      if (centers.some(c => c.center === null)) return null;

      // 1. Cek Absolute Position (Koordinat X,Y selalu sama)
      const first = centers[0].center!;
      const isAbsolute = centers.every(c => 
          Math.abs(c.center!.x - first.x) <= 1 && 
          Math.abs(c.center!.y - first.y) <= 1
      );

      if (isAbsolute) {
          return { type: 'ABSOLUTE', x: first.x, y: first.y };
      }

      // 2. Cek Centered Position (Selalu di tengah grid)
      const isCentered = centers.every(c => {
          const midX = Math.floor(c.gridW / 2);
          const midY = Math.floor(c.gridH / 2);
          // Toleransi 1 piksel
          return Math.abs(c.center!.x - midX) <= 1 && Math.abs(c.center!.y - midY) <= 1;
      });

      if (isCentered) {
          return { type: 'CENTER' };
      }

      return null;
  },

  // Ekstraksi objek terpisah berdasarkan warna (atau konektivitas di masa depan)
  extractObjects: (grid: number[][]) => {
      const objects: { color: number, grid: number[][] }[] = [];
      const visited = new Set<string>();
      const H = grid.length;
      const W = grid[0].length;

      // Sederhana: Anggap setiap warna unik sebagai satu objek (untuk sekarang)
      // Nanti bisa diupgrade ke Connected Components Labeling (BFS/DFS)
      
      const colors = new Set<number>();
      for(let y=0; y<H; y++) {
          for(let x=0; x<W; x++) {
              if (grid[y][x] !== 0) colors.add(grid[y][x]);
          }
      }

      // Untuk setiap warna, buat grid mask-nya
      // PERBAIKAN: Jika ada beberapa pulau warna yang sama, ini akan menggabungkannya.
      // Untuk Task 11 (Magnetisme), objeknya berbeda warna, jadi aman.
      // Tapi idealnya pakai Connected Components.
      
      // Mari kita pakai Connected Components sederhana saja biar lebih robust
      const componentGrid = Array(H).fill(0).map(() => Array(W).fill(0));
      let compId = 1;
      
      for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
              if (grid[y][x] !== 0 && componentGrid[y][x] === 0) {
                  // Found new component, start BFS
                  const color = grid[y][x];
                  const q = [{x, y}];
                  componentGrid[y][x] = compId;
                  
                  // Buat grid kosong untuk objek ini
                  const objGrid = Array(H).fill(0).map(() => Array(W).fill(0));
                  objGrid[y][x] = color;
                  
                  while (q.length > 0) {
                      const curr = q.shift()!;
                      const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
                      
                      for (const d of dirs) {
                          const nx = curr.x + d[0];
                          const ny = curr.y + d[1];
                          
                          if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                              if (grid[ny][nx] === color && componentGrid[ny][nx] === 0) {
                                  componentGrid[ny][nx] = compId;
                                  objGrid[ny][nx] = color;
                                  q.push({x: nx, y: ny});
                              }
                          }
                      }
                  }
                  
                  objects.push({ color, grid: objGrid });
                  compId++;
              }
          }
      }
      
      return objects;
  }
};
