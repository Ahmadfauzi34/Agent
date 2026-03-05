import { HoloFFT, DIMENSION } from '../vsa/fft-math';

const MAX_GRID_SIZE = 30;

const BASE_COLOR = HoloFFT.create();
const BASE_X = HoloFFT.create();
const BASE_Y = HoloFFT.create();
const BASE_W = HoloFFT.create();
const BASE_H = HoloFFT.create();

// KAMUS SEMESTA LENGKAP
export const ARC_COLORS = Array.from({ length: 10 }, (_, i) => HoloFFT.power(BASE_COLOR, i));
export const POS_X = Array.from({ length: MAX_GRID_SIZE }, (_, i) => HoloFFT.power(BASE_X, i));
export const POS_Y = Array.from({ length: MAX_GRID_SIZE }, (_, i) => HoloFFT.power(BASE_Y, i));
export const OBJ_WIDTH = Array.from({ length: MAX_GRID_SIZE + 1 }, (_, i) => HoloFFT.power(BASE_W, i));
export const OBJ_HEIGHT = Array.from({ length: MAX_GRID_SIZE + 1 }, (_, i) => HoloFFT.power(BASE_H, i));

export type LensType = 'HOLISTIC' | 'IGNORE_COLOR' | 'IGNORE_POSITION' | 'PURE_GEOMETRY' | 'PURE_COLOR' | 'COLOR_MAP' | 'TRANSFORM_SWAP_XY' | 'TRANSFORM_MIRROR_X' | 'TRANSFORM_MIRROR_Y' | 'NORMALIZE_POSITION';

// Struktur anatomi sebuah objek
interface ObjectFeature {
    color: number;
    minX: number;
    minY: number;
    width: number;
    height: number;
}

export const VSAUtils = {
  // 🔍 MESIN SEGMENTASI (Flood-Fill Algorithm)
  findObjects: (grid: number[][]): ObjectFeature[] => {
    const objects: ObjectFeature[] = [];
    const visited = new Set<string>();

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const color = grid[y][x];
        
        // Jika menemukan piksel berwarna yang belum pernah dikunjungi
        if (color !== 0 && !visited.has(`${x},${y}`)) {
          let minX = x, maxX = x, minY = y, maxY = y;
          const stack = [[x, y]];
          visited.add(`${x},${y}`);

          // Lacak semua piksel yang bersentuhan (Bentuk 1 Objek)
          while (stack.length > 0) {
            const [currX, currY] = stack.pop()!;
            minX = Math.min(minX, currX);
            maxX = Math.max(maxX, currX);
            minY = Math.min(minY, currY);
            maxY = Math.max(maxY, currY);

            // Cek 4 arah mata angin (Atas, Bawah, Kiri, Kanan)
            const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [dx, dy] of directions) {
              const nx = currX + dx, ny = currY + dy;
              
              // Jika tetangga masih di dalam batas layar, warnanya sama, dan belum dikunjungi
              if (nx >= 0 && nx < grid[0].length && ny >= 0 && ny < grid.length &&
                  grid[ny][nx] === color && !visited.has(`${nx},${ny}`)) {
                visited.add(`${nx},${ny}`);
                stack.push([nx, ny]);
              }
            }
          }
          
          // Daftarkan objek yang baru saja ditemukan
          objects.push({ 
              color, 
              minX, 
              minY, 
              width: (maxX - minX) + 1, 
              height: (maxY - minY) + 1 
          });
        }
      }
    }
    return objects;
  },

  // 🧠 ENCODER SUPERPOSISI
  encodeGrid: (grid: number[][], lens: LensType = 'HOLISTIC'): Float64Array => {
    if (lens === 'COLOR_MAP') {
        const pixelVecs: Float64Array[] = [];
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const colorVec = ARC_COLORS[grid[y][x]];
                const posVec = HoloFFT.bind(POS_X[x], POS_Y[y]);
                pixelVecs.push(HoloFFT.bind(colorVec, posVec));
            }
        }
        return HoloFFT.bundle(pixelVecs);
    }

    const objects = VSAUtils.findObjects(grid);
    const gridHeight = grid.length;
    const gridWidth = grid[0].length;
    
    // Jika layar kosong, kembalikan vektor identitas/noise
    if (objects.length === 0) return HoloFFT.create();

    const objectVectors: Float64Array[] = [];

    // Proses setiap objek secara terpisah menggunakan Lensa Mental
    for (const obj of objects) {
      let objVec;
      
      if (lens === 'PURE_COLOR') {
          // PURE_COLOR hanya peduli pada warna, abaikan dimensi dan posisi
          objVec = ARC_COLORS[obj.color];
      } else {
          // Fondasi absolut: Objek pasti punya dimensi
          objVec = HoloFFT.bind(OBJ_WIDTH[obj.width], OBJ_HEIGHT[obj.height]);

          if (lens === 'HOLISTIC' || lens === 'IGNORE_POSITION' || lens.startsWith('TRANSFORM_')) {
            objVec = HoloFFT.bind(objVec, ARC_COLORS[obj.color]);
          }
          
          if (lens === 'HOLISTIC' || lens === 'IGNORE_COLOR') {
            objVec = HoloFFT.bind(objVec, POS_X[obj.minX]);
            objVec = HoloFFT.bind(objVec, POS_Y[obj.minY]);
          }

          if (lens === 'TRANSFORM_SWAP_XY') {
            objVec = HoloFFT.bind(objVec, POS_X[obj.minY]);
            objVec = HoloFFT.bind(objVec, POS_Y[obj.minX]);
          }

          if (lens === 'TRANSFORM_MIRROR_X') {
            const newMinX = gridWidth - obj.minX - obj.width;
            objVec = HoloFFT.bind(objVec, POS_X[newMinX]);
            objVec = HoloFFT.bind(objVec, POS_Y[obj.minY]);
          }

          if (lens === 'TRANSFORM_MIRROR_Y') {
            const newMinY = gridHeight - obj.minY - obj.height;
            objVec = HoloFFT.bind(objVec, POS_X[obj.minX]);
            objVec = HoloFFT.bind(objVec, POS_Y[newMinY]);
          }

          if (lens === 'NORMALIZE_POSITION') {
            // HANYA BENTUK DAN WARNA (Tanpa Posisi)
            // Ini memungkinkan kita untuk "memindahkan" objek ke mana saja nanti
            // dengan cara mengikatnya dengan POS_X[target] dan POS_Y[target]
            objVec = HoloFFT.bind(objVec, ARC_COLORS[obj.color]);
          }
          
          // PURE_GEOMETRY hanya menggunakan OBJ_WIDTH dan OBJ_HEIGHT yang sudah di-bind di atas
          // Tidak menambahkan warna atau posisi
      }
      
      objectVectors.push(objVec);
    }

    // 🌌 SUPERPOSISI: Gabungkan semua vektor objek menjadi satu Semesta
    return HoloFFT.bundle(objectVectors);
  },

  // Hitung titik tengah (Center of Mass) dari piksel non-hitam
  getCenterOfMass: (grid: number[][]): {x: number, y: number} | null => {
    let sumX = 0, sumY = 0, count = 0;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] !== 0) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }
    if (count === 0) return null;
    return { x: Math.round(sumX / count), y: Math.round(sumY / count) };
  }
};
