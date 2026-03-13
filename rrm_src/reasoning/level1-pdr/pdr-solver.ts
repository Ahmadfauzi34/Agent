import { YStreamPrimal, ZStreamDual, ObjectSegmenter, ARCObject } from '../../perception';
import { PDRLogger, LogLevel } from './pdr-debug';
import { InteractionSolver } from '../level4-dynamics/interaction-solver';

// Tipe Data Grid ARC
type Grid = number[][];

// Struktur Hukum Fisika yang Ditemukan
interface PhysicsLaw {
  type: 'TRANSLATION' | 'REFLECTION' | 'ROTATION' | 'PATTERN_CONTINUATION' | 'COLOR_MAPPING' | 'MULTI_OBJECT_TRANSLATION' | 'INTERACTION' | 'UNKNOWN';
  params: any; // dx, dy, axis, angle, colorMap, objectRules, interactionLaws, etc.
  confidence: number;
}

export class PDRSolver {
  private yStream = new YStreamPrimal();
  private zStream: ZStreamDual;

  constructor(dimension = 32) { // Dimensi ARC biasanya kecil (30x30 max)
    this.zStream = new ZStreamDual();
  }

  // Fungsi Utama: Belajar dari Contoh (Train) dan Terapkan ke Soal (Test)
  solveTask(trainInputs: Grid[], trainOutputs: Grid[], testInput: Grid): Grid {
    PDRLogger.section('SOLVING TASK');
    PDRLogger.info(`Train Pairs: ${trainInputs.length}, Test Input: ${testInput.length}x${testInput[0].length}`);

    // 1. Pelajari Hukum Fisika dari Pasangan Train
    const laws: PhysicsLaw[] = [];
    
    for (let i = 0; i < trainInputs.length; i++) {
      PDRLogger.debug(`Analyzing Train Pair ${i}`);
      const law = this.deduceLaw(trainInputs[i], trainOutputs[i]);
      laws.push(law);
      PDRLogger.debug(`Train Pair ${i} Law Deduced: ${law.type}`, law.params);
    }

    // 2. Konsolidasi Hukum dengan Consensus Critic (Self-Critic)
    PDRLogger.info("🕵️ CONSENSUS CRITIC: Memvalidasi konsistensi hukum fisika...");
    
    let bestLaw: PhysicsLaw | null = null;
    let bestScore = -1;

    // Filter duplicate laws untuk efisiensi
    const uniqueLaws = laws.filter((law, index, self) =>
        index === self.findIndex((t) => (
            t.type === law.type && JSON.stringify(t.params) === JSON.stringify(law.params)
        ))
    );

    for (const candidate of uniqueLaws) {
        if (candidate.type === 'UNKNOWN') continue;

        let score = 0;
        for (let j = 0; j < trainInputs.length; j++) {
            try {
                const predicted = this.applyLaw(trainInputs[j], candidate);
                if (this.gridsEqual(predicted, trainOutputs[j])) {
                    score++;
                }
            } catch (e) {
                // Ignore error during validation
            }
        }
        
        const confidence = score / trainInputs.length;
        PDRLogger.debug(`   ⚖️ Review: Hukum [${candidate.type}] valid pada ${score}/${trainInputs.length} contoh.`);

        // Pilih skor tertinggi
        if (confidence > bestScore) {
            bestScore = confidence;
            bestLaw = candidate;
        } else if (confidence === bestScore && bestLaw) {
             // Tie-breaker: Prioritas Occam's Razor (Simpel > Kompleks)
             const priority = ['TRANSLATION', 'ROTATION', 'REFLECTION', 'COLOR_MAPPING', 'INTERACTION', 'MULTI_OBJECT_TRANSLATION'];
             const idxCandidate = priority.indexOf(candidate.type);
             const idxCurrent = priority.indexOf(bestLaw.type);
             
             // Jika candidate lebih prioritas (index lebih kecil dan valid)
             if (idxCandidate !== -1 && (idxCandidate < idxCurrent || idxCurrent === -1)) {
                 bestLaw = candidate;
             }
        }
    }

    // --- INTEGRASI Z-STREAM (PATTERN DETECTION) ---
    // Jika tidak ada hukum yang konsisten (Score < 1.0), gunakan Z-Stream sebagai fallback atau pelengkap
    if (!bestLaw || bestScore < 1.0) {
        if (bestLaw) {
             PDRLogger.info(`   ⚠️ Hukum terbaik hanya memiliki akurasi ${(bestScore*100).toFixed(0)}%. Mencoba analisis pola Z-Stream...`);
        } else {
             PDRLogger.info("   ❌ Tidak ada hukum fisika deterministik yang ditemukan. Mengaktifkan Z-Stream...");
        }
        
        // Ambil contoh pertama untuk analisis cepat
        const flatIn = trainInputs[0].flat();
        const flatOut = trainOutputs[0].flat();
        
        const analysisIn = this.zStream.analyze(flatIn);
        const analysisOut = this.zStream.analyze(flatOut);
        
        PDRLogger.debug(`   Z-Stream PMR In: ${analysisIn.pmr.toFixed(2)}, Out: ${analysisOut.pmr.toFixed(2)}`);
        
        if (analysisIn.isStructured && analysisOut.isStructured) {
             PDRLogger.info("   🌊 Z-Stream: Pola Terstruktur Terdeteksi (Pattern Conservation).");
             // Jika belum ada bestLaw, kita bisa mencoba strategi heuristik lain di sini
        }
    }
    
    if (!bestLaw) bestLaw = { type: 'UNKNOWN', params: {}, confidence: 0 };

    PDRLogger.info(`FINAL LAW SELECTED: ${bestLaw.type}`, bestLaw.params);

    // 3. Terapkan Hukum ke Test Input
    return this.applyLaw(testInput, bestLaw);
  }

  // Menganalisis Perubahan Input -> Output
  private deduceLaw(input: Grid, output: Grid): PhysicsLaw {
    // Cek Dimensi
    const h = input.length;
    const w = input[0].length;
    if (h !== output.length || w !== output[0].length) {
        return { type: 'UNKNOWN', params: {}, confidence: 0 };
    }

    // A. Cek Translasi (Pergeseran Objek)
    const centerIn = this.getCenterOfMass(input);
    const centerOut = this.getCenterOfMass(output);

    if (centerIn && centerOut) {
      const dx = centerOut.x - centerIn.x;
      const dy = centerOut.y - centerIn.y;
      
      // Cek apakah ada perubahan warna juga?
      const colorMap = this.detectColorMapping(input, output, dx, dy);
      
      if (this.verifyTranslation(input, output, dx, dy, colorMap)) {
        return { 
            type: 'TRANSLATION', 
            params: { dx, dy, colorMap }, 
            confidence: 1.0 
        };
      }
    }

    // B. Cek Rotasi & Refleksi
    const hOut = output.length;
    const wOut = output[0].length;

    if (h === wOut && w === hOut) {
        // Cek Rotasi 90 & 270
        const rot90 = this.rotate90(input);
        if (this.gridsEqual(rot90, output)) return { type: 'ROTATION', params: { angle: 90 }, confidence: 1.0 };
        
        const rot270 = this.rotate270(input);
        if (this.gridsEqual(rot270, output)) return { type: 'ROTATION', params: { angle: 270 }, confidence: 1.0 };
    }

    if (h === hOut && w === wOut) {
        // Cek Rotasi 180
        const rot180 = this.rotate180(input);
        if (this.gridsEqual(rot180, output)) return { type: 'ROTATION', params: { angle: 180 }, confidence: 1.0 };

        // Cek Refleksi
        const flipH = this.flipH(input);
        if (this.gridsEqual(flipH, output)) return { type: 'REFLECTION', params: { axis: 'HORIZONTAL' }, confidence: 1.0 };

        const flipV = this.flipV(input);
        if (this.gridsEqual(flipV, output)) return { type: 'REFLECTION', params: { axis: 'VERTICAL' }, confidence: 1.0 };
    }

    // C. Cek Interaksi Fisika (Magnetisme/Gravitasi) via InteractionSolver
    const interactionLaws = InteractionSolver.deriveLaws(input, output);
    if (interactionLaws.length > 0) {
        return {
            type: 'INTERACTION',
            params: { laws: interactionLaws },
            confidence: 0.9
        };
    }

    // D. Cek Multi-Object Translation
    const multiObjLaw = this.deduceMultiObjectLaw(input, output);
    if (multiObjLaw) return multiObjLaw;

    // E. Cek Color Mapping Tanpa Translasi (In-Place)
    const staticColorMap = this.detectColorMapping(input, output, 0, 0);
    if (Object.keys(staticColorMap).length > 0 && this.verifyTranslation(input, output, 0, 0, staticColorMap)) {
        return {
            type: 'COLOR_MAPPING',
            params: { colorMap: staticColorMap },
            confidence: 1.0
        };
    }

    return { type: 'UNKNOWN', params: {}, confidence: 0 };
  }

  // --- LOGIKA BARU: MULTI-OBJECT TRANSLATION ---
  private deduceMultiObjectLaw(input: Grid, output: Grid): PhysicsLaw | null {
    // 1. Segmentasi Objek
    const objectsIn = ObjectSegmenter.segment(input);
    const objectsOut = ObjectSegmenter.segment(output);
    
    PDRLogger.trace(`MultiObject: Objects In: ${objectsIn.length}, Out: ${objectsOut.length}`);

    if (objectsIn.length === 0 || objectsOut.length === 0) return null;

    const getShapeString = (obj: ARCObject) => {
        const normalized = obj.pixels.map(p => `${p.x - obj.boundingBox.minX},${p.y - obj.boundingBox.minY}`);
        normalized.sort();
        return normalized.join('|');
    };

    const objectsInShapes = objectsIn.map(o => ({ ...o, shape: getShapeString(o) }));
    const objectsOutShapes = objectsOut.map(o => ({ ...o, shape: getShapeString(o) }));

    const objectRules: any[] = [];

    // 2. Matching Objek Input ke Output berdasarkan BENTUK (Shape)
    for (const objIn of objectsInShapes) {
        const match = objectsOutShapes.find(o => o.shape === objIn.shape);
        
        if (match) {
            const dx = Math.round(match.boundingBox.minX - objIn.boundingBox.minX);
            const dy = Math.round(match.boundingBox.minY - objIn.boundingBox.minY);
            const colorOut = match.color;
            
            PDRLogger.trace(`MultiObject: Match Shape (Color ${objIn.color}->${colorOut}): dx=${dx}, dy=${dy}`);

            objectRules.push({
                shape: objIn.shape,
                colorIn: objIn.color,
                colorOut: colorOut,
                dx,
                dy
            });
        }
    }

    if (objectRules.length > 0) {
        return {
            type: 'MULTI_OBJECT_TRANSLATION',
            params: { rules: objectRules },
            confidence: 0.8
        };
    }

    return null;
  }

  // Menerapkan Hukum Fisika
  private applyLaw(input: Grid, law: PhysicsLaw): Grid {
    const h = input.length;
    const w = input[0].length;
    const output = Array(h).fill(0).map(() => Array(w).fill(0));

    if (law.type === 'TRANSLATION') {
      const { dx, dy, colorMap } = law.params;
      
      let isIdentityMap = true;
      for (const key in colorMap) {
          if (parseInt(key) !== colorMap[key]) {
              isIdentityMap = false;
              break;
          }
      }

      const uniqueTargets = new Set(Object.values(colorMap));
      const wildcardTarget = (!isIdentityMap && uniqueTargets.size === 1) ? [...uniqueTargets][0] : null;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const val = input[y][x];
          if (val !== 0) {
            const newX = x + dx;
            const newY = y + dy;
            
            if (newX >= 0 && newX < w && newY >= 0 && newY < h) {
              let newVal = val;
              if (colorMap && colorMap[val] !== undefined) {
                  newVal = colorMap[val];
              } else if (wildcardTarget !== null) {
                  newVal = wildcardTarget as number;
              }
              output[newY][newX] = newVal;
            }
          }
        }
      }
    } else if (law.type === 'ROTATION') {
        const { angle } = law.params;
        if (angle === 90) return this.rotate90(input);
        if (angle === 180) return this.rotate180(input);
        if (angle === 270) return this.rotate270(input);
    } else if (law.type === 'REFLECTION') {
        const { axis } = law.params;
        if (axis === 'HORIZONTAL') return this.flipH(input);
        if (axis === 'VERTICAL') return this.flipV(input);
    } else if (law.type === 'INTERACTION') {
        // --- LOGIKA PENERAPAN INTERAKSI FISIKA ---
        const { laws } = law.params;
        return InteractionSolver.applyLaws(input, laws);
    } else if (law.type === 'COLOR_MAPPING') {
        const { colorMap } = law.params;
        let isIdentityMap = true;
        for (const key in colorMap) {
            if (parseInt(key) !== colorMap[key]) {
                isIdentityMap = false;
                break;
            }
        }
        const uniqueTargets = new Set(Object.values(colorMap));
        const wildcardTarget = (!isIdentityMap && uniqueTargets.size === 1) ? [...uniqueTargets][0] : null;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const val = input[y][x];
                if (val !== 0) {
                    let newVal = val;
                    if (colorMap[val] !== undefined) {
                        newVal = colorMap[val];
                    } else if (wildcardTarget !== null) {
                        newVal = wildcardTarget as number;
                    }
                    output[y][x] = newVal;
                }
            }
        }
    } else if (law.type === 'MULTI_OBJECT_TRANSLATION') {
        // --- LOGIKA PENERAPAN MULTI-OBJECT ---
        const { rules } = law.params;
        const objectsIn = ObjectSegmenter.segment(input);
        
        PDRLogger.trace(`MultiObject Apply: Found ${objectsIn.length} objects in Test Input`);

        const getShapeString = (obj: ARCObject) => {
            const normalized = obj.pixels.map(p => `${p.x - obj.boundingBox.minX},${p.y - obj.boundingBox.minY}`);
            normalized.sort();
            return normalized.join('|');
        };

        for (const obj of objectsIn) {
            const shape = getShapeString(obj);
            // Cari aturan berdasarkan bentuk, fallback ke warna jika bentuk tidak unik
            const rule = rules.find((r: any) => r.shape === shape || r.colorIn === obj.color);
            
            const dx = rule ? rule.dx : 0;
            const dy = rule ? rule.dy : 0;
            const colorOut = rule ? rule.colorOut : obj.color;
            
            PDRLogger.trace(`MultiObject Apply: Object Shape/Color ${obj.color} -> dx=${dx}, dy=${dy}, colorOut=${colorOut}`);

            for (const p of obj.pixels) {
                const newX = Math.round(p.x + dx);
                const newY = Math.round(p.y + dy);

                if (newX >= 0 && newX < w && newY >= 0 && newY < h) {
                    output[newY][newX] = colorOut;
                }
            }
        }
    } else {
        return input.map(row => [...row]);
    }

    return output;
  }

  private rotate90(grid: Grid): Grid {
    const H = grid.length;
    const W = grid[0].length;
    const out = Array.from({ length: W }, () => Array(H).fill(0));
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            out[c][H - 1 - r] = grid[r][c];
        }
    }
    return out;
  }

  private rotate180(grid: Grid): Grid {
    const H = grid.length;
    const W = grid[0].length;
    const out = Array.from({ length: H }, () => Array(W).fill(0));
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            out[H - 1 - r][W - 1 - c] = grid[r][c];
        }
    }
    return out;
  }

  private rotate270(grid: Grid): Grid {
    const H = grid.length;
    const W = grid[0].length;
    const out = Array.from({ length: W }, () => Array(H).fill(0));
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            out[W - 1 - c][r] = grid[r][c];
        }
    }
    return out;
  }

  private flipH(grid: Grid): Grid {
    const H = grid.length;
    const W = grid[0].length;
    const out = Array.from({ length: H }, () => Array(W).fill(0));
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            out[r][W - 1 - c] = grid[r][c];
        }
    }
    return out;
  }

  private flipV(grid: Grid): Grid {
    const H = grid.length;
    const W = grid[0].length;
    const out = Array.from({ length: H }, () => Array(W).fill(0));
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            out[H - 1 - r][c] = grid[r][c];
        }
    }
    return out;
  }

  private gridsEqual(a: Grid, b: Grid): boolean {
    if (a.length !== b.length || a[0].length !== b[0].length) return false;
    for (let r = 0; r < a.length; r++) {
        for (let c = 0; c < a[0].length; c++) {
            if (a[r][c] !== b[r][c]) return false;
        }
    }
    return true;
  }

  // Helper: Pusat Massa
  private getCenterOfMass(grid: Grid): { x: number, y: number } | null {
    let sumX = 0, sumY = 0, count = 0;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x] !== 0) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }
    return count > 0 ? { x: Math.round(sumX / count), y: Math.round(sumY / count) } : null;
  }

  // Helper: Deteksi Mapping Warna
  private detectColorMapping(input: Grid, output: Grid, dx: number, dy: number): Record<number, number> {
    const map: Record<number, number> = {};
    const h = input.length;
    const w = input[0].length;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const valIn = input[y][x];
            if (valIn !== 0) {
                const newX = x + dx;
                const newY = y + dy;
                if (newX >= 0 && newX < w && newY >= 0 && newY < h) {
                    const valOut = output[newY][newX];
                    if (valOut !== 0) { // Asumsi background 0 tidak memetakan warna
                        if (map[valIn] !== undefined && map[valIn] !== valOut) {
                            // Konflik! Satu warna dipetakan ke dua warna berbeda
                            return {}; 
                        }
                        map[valIn] = valOut;
                    }
                }
            }
        }
    }
    return map;
  }

  // Helper: Verifikasi Translasi + Warna
  private verifyTranslation(input: Grid, output: Grid, dx: number, dy: number, colorMap: Record<number, number>): boolean {
    const h = input.length;
    const w = input[0].length;
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const valIn = input[y][x];
        if (valIn !== 0) {
            const newX = x + dx;
            const newY = y + dy;
            
            if (newX >= 0 && newX < w && newY >= 0 && newY < h) {
                const expectedVal = colorMap[valIn] !== undefined ? colorMap[valIn] : valIn;
                if (output[newY][newX] !== expectedVal) return false;
            }
        }
      }
    }
    return true;
  }
}
