import { PDRLogger } from '../level1-pdr/pdr-debug';

// Tipe Data untuk Objek Fisika
export interface PhysicsObject {
    id: number;
    color: number;
    pixels: { x: number, y: number }[];
    center: { x: number, y: number };
    mass: number; // Jumlah piksel
    momentum: { x: number, y: number }; // [UPGRADE] Inertia/Velocity
}

// Hukum Fisika yang Ditemukan
export interface PhysicsLaw {
    type: 'GRAVITY' | 'MAGNETISM' | 'REPULSION' | 'FRICTION' | 'NONE';
    actorColor: number;      // Warna yang terpengaruh
    targetColor?: number;    // Warna penyebab (untuk Magnet/Repulsi)
    direction?: { x: number, y: number }; // Arah gaya (untuk Gravitasi)
    magnitude?: string;      // Rumus simbolik (v = ...)
    conditions?: string[];   // [UPGRADE] Syarat Logika Hybrid (misal: "mass < 5", "is_square")
    confidence: number;      // Seberapa yakin agen (0-1)
}

export class InteractionSolver {

    /**
     * 🧠 INTI PEMIKIRAN: Menganalisis Perubahan Fisika dari Input ke Output
     * Tanpa hardcode. Agen harus menyimpulkan sendiri.
     */
    public static deriveLaws(inputGrid: number[][], outputGrid: number[][]): PhysicsLaw[] {
        PDRLogger.section("🧲 InteractionSolver: Menganalisis Hukum Fisika...");

        const inputObjs = this.extractObjects(inputGrid);
        const outputObjs = this.extractObjects(outputGrid);
        
        const laws: PhysicsLaw[] = [];
        const movements: { obj: PhysicsObject, delta: { x: number, y: number } }[] = [];

        // 1. Lacak Pergerakan Objek (Object Tracking)
        for (const inObj of inputObjs) {
            // Cari objek yang sama di output (berdasarkan warna & massa)
            const outObj = outputObjs.find(o => o.color === inObj.color && Math.abs(o.mass - inObj.mass) < 3); // Toleransi massa

            if (outObj) {
                const dx = outObj.center.x - inObj.center.x;
                const dy = outObj.center.y - inObj.center.y;

                if (dx !== 0 || dy !== 0) {
                    movements.push({ obj: inObj, delta: { x: dx, y: dy } });
                    PDRLogger.trace(`   Object #${inObj.id} (Color ${inObj.color}) moved: dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`);
                }
            }
        }

        if (movements.length === 0) {
            PDRLogger.info("   Tidak ada pergerakan objek terdeteksi.");
            return [];
        }

        // 2. Analisis Penyebab Pergerakan (Causal Inference)
        
        // A. Cek Interaksi Antar Objek (Magnetisme / Repulsi)
        const interactionLaws = this.checkInteractions(inputObjs, movements);
        
        // [UPGRADE] Conditional Physics: Cek apakah hukum hanya berlaku untuk objek tertentu (misal: mass < 5)
        for (const law of interactionLaws) {
            const movingActors = movements.filter(m => m.obj.color === law.actorColor).map(m => m.obj);
            const allActors = inputObjs.filter(o => o.color === law.actorColor);
            
            // Jika tidak semua aktor bergerak, cari pembeda (Discriminator)
            if (movingActors.length < allActors.length) {
                const stationaryActors = allActors.filter(a => !movingActors.includes(a));
                
                // Hipotesis 1: Massa (Ukuran)
                const maxMassMoving = Math.max(...movingActors.map(o => o.mass));
                const minMassStationary = Math.min(...stationaryActors.map(o => o.mass));
                
                if (maxMassMoving < minMassStationary) {
                    law.conditions = [`mass <= ${maxMassMoving}`];
                    PDRLogger.info(`   ⚖️ Conditional Law Detected: Only objects with mass <= ${maxMassMoving} obey this law.`);
                }
            }
        }
        
        if (interactionLaws.length > 0) {
            laws.push(...interactionLaws);
        } else {
            // B. Cek Gravitasi Global (Hanya jika tidak ada interaksi spesifik)
            const gravityLaw = this.checkGravity(movements);
            if (gravityLaw) {
                laws.push(gravityLaw);
                PDRLogger.info(`   🌌 Hukum Gravitasi Terdeteksi: Arah (${gravityLaw.direction?.x}, ${gravityLaw.direction?.y})`);
            }
        }

        return laws;
    }

    /**
     * Mengubah Grid menjadi Daftar Objek (Connected Components)
     */
    private static extractObjects(grid: number[][]): PhysicsObject[] {
        const objects: PhysicsObject[] = [];
        const visited = new Set<string>();
        const H = grid.length;
        const W = grid[0].length;
        let objIdCounter = 1;

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const color = grid[y][x];
                if (color !== 0 && !visited.has(`${x},${y}`)) {
                    // BFS untuk menemukan satu objek utuh
                    const pixels: { x: number, y: number }[] = [];
                    const queue = [{ x, y }];
                    visited.add(`${x},${y}`);

                    while (queue.length > 0) {
                        const p = queue.shift()!;
                        pixels.push(p);

                        const neighbors = [
                            { x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y },
                            { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }
                        ];

                        for (const n of neighbors) {
                            if (n.x >= 0 && n.x < W && n.y >= 0 && n.y < H &&
                                grid[n.y][n.x] === color && !visited.has(`${n.x},${n.y}`)) {
                                visited.add(`${n.x},${n.y}`);
                                queue.push(n);
                            }
                        }
                    }

                    // Hitung Center of Mass
                    const sumX = pixels.reduce((sum, p) => sum + p.x, 0);
                    const sumY = pixels.reduce((sum, p) => sum + p.y, 0);
                    
                    objects.push({
                        id: objIdCounter++,
                        color,
                        pixels,
                        center: { x: sumX / pixels.length, y: sumY / pixels.length },
                        mass: pixels.length,
                        momentum: { x: 0, y: 0 }
                    });
                }
            }
        }
        return objects;
    }

    /**
     * Mengecek apakah ada gaya gravitasi global
     */
    private static checkGravity(movements: { obj: PhysicsObject, delta: { x: number, y: number } }[]): PhysicsLaw | null {
        if (movements.length === 0) return null;

        const firstDir = { 
            x: Math.sign(movements[0].delta.x), 
            y: Math.sign(movements[0].delta.y) 
        };

        const isConsistent = movements.every(m => 
            Math.sign(m.delta.x) === firstDir.x && Math.sign(m.delta.y) === firstDir.y
        );

        if (isConsistent) {
            return {
                type: 'GRAVITY',
                actorColor: -1,
                direction: firstDir,
                confidence: 0.9
            };
        }
        return null;
    }

    /**
     * Mengecek interaksi antar objek (Magnetisme/Repulsi) dengan analisis vektor
     */
    private static checkInteractions(allObjects: PhysicsObject[], movements: { obj: PhysicsObject, delta: { x: number, y: number } }[]): PhysicsLaw[] {
        const detectedLaws: PhysicsLaw[] = [];
        
        // Kelompokkan gerakan berdasarkan warna aktor
        const movesByColor = new Map<number, { obj: PhysicsObject, delta: { x: number, y: number } }[]>();
        movements.forEach(m => {
            if (!movesByColor.has(m.obj.color)) movesByColor.set(m.obj.color, []);
            movesByColor.get(m.obj.color)!.push(m);
        });

        for (const [color, moves] of movesByColor) {
            // Hipotesis: Semua objek warna ini tertarik ke objek warna lain
            const candidateTargets = new Map<number, number>(); // targetColor -> score

            for (const move of moves) {
                const actor = move.obj;
                const delta = move.delta;
                
                // Cek semua objek lain sebagai kandidat target
                for (const other of allObjects) {
                    if (other.id === actor.id) continue;
                    
                    const vec = { x: other.center.x - actor.center.x, y: other.center.y - actor.center.y };
                    const dist = Math.hypot(vec.x, vec.y);
                    if (dist === 0) continue;
                    
                    // Normalized direction to target
                    const dirTo = { x: vec.x / dist, y: vec.y / dist };
                    // Normalized movement
                    const moveDist = Math.hypot(delta.x, delta.y);
                    const moveDir = { x: delta.x / moveDist, y: delta.y / moveDist };
                    
                    const dot = dirTo.x * moveDir.x + dirTo.y * moveDir.y;
                    
                    if (dot > 0.85) { // Bergerak menuju (Magnet)
                        candidateTargets.set(other.color, (candidateTargets.get(other.color) || 0) + 1);
                    }
                }
            }
            
            // Cari kandidat terbaik
            let bestTargetColor = -1;
            let maxScore = 0;
            candidateTargets.forEach((score, tColor) => {
                if (score > maxScore) {
                    maxScore = score;
                    bestTargetColor = tColor;
                }
            });
            
            // Jika kandidat menjelaskan sebagian besar gerakan
            if (maxScore >= moves.length * 0.5) {
                // Gunakan representasi rumus simbolik sederhana (tanpa library eksternal)
                // F = sign(Target - Actor)
                const formula = `v = sign(Target_${bestTargetColor} - Actor_${color})`;
                
                detectedLaws.push({
                    type: 'MAGNETISM',
                    actorColor: color,
                    targetColor: bestTargetColor,
                    magnitude: formula,
                    confidence: maxScore / moves.length
                });
                PDRLogger.info(`   🧲 Magnetism Detected: Color ${color} attracted to Color ${bestTargetColor}. Formula: ${formula}`);
            }
        }
        
        return detectedLaws;
    }

    /**
     * Menerapkan Hukum Fisika dengan Simulasi Step-by-Step
     */
    public static applyLaws(inputGrid: number[][], laws: PhysicsLaw[]): number[][] {
        // Deep copy grid
        let currentGrid = inputGrid.map(row => [...row]);
        const H = inputGrid.length;
        const W = inputGrid[0].length;

        // State Persistence Map (ID -> Momentum)
        let previousObjects: PhysicsObject[] = [];

        // Simulasi Loop (Step-by-Step)
        let steps = 0;
        const MAX_STEPS = Math.max(H, W) * 3; // Limit steps increased for bouncing
        let hasMovement = true;

        PDRLogger.info("   🔄 Memulai Simulasi Fisika Step-by-Step (Inelastic)...");

        while ((hasMovement || steps < 5) && steps < MAX_STEPS) { // Force min 5 steps for bounce to settle
            hasMovement = false;
            steps++;
            
            const objects = this.extractObjects(currentGrid);
            
            // 0. Restore Momentum (Transfer State)
            if (previousObjects.length > 0) {
                for (const obj of objects) {
                    // Cari objek sebelumnya yang dekat (overlap)
                    const prev = previousObjects.find(p => 
                        p.color === obj.color && 
                        Math.abs(p.center.x - obj.center.x) <= 1.5 && 
                        Math.abs(p.center.y - obj.center.y) <= 1.5
                    );
                    if (prev) {
                        obj.momentum = prev.momentum;
                    }
                }
            }

            const nextPositions = new Map<number, {x: number, y: number}[]>(); 
            const collisions = new Map<number, {x: boolean, y: boolean}>(); // Track collision axis

            // 1. Hitung Keinginan Bergerak (Desired Moves)
            for (const obj of objects) {
                let totalDx = 0;
                let totalDy = 0;

                // A. Apply Forces from Laws
                for (const law of laws) {
                    if (law.actorColor === obj.color || law.actorColor === -1) {
                        // [UPGRADE] Cek Kondisi (Conditions)
                        if (law.conditions && law.conditions.length > 0) {
                            let conditionsMet = true;
                            for (const cond of law.conditions) {
                                // Parse kondisi sederhana "mass <= X"
                                if (cond.startsWith("mass <=")) {
                                    const limit = parseInt(cond.split("<=")[1]);
                                    if (obj.mass > limit) {
                                        conditionsMet = false;
                                        break;
                                    }
                                }
                            }
                            if (!conditionsMet) continue; // Skip hukum ini jika kondisi tidak terpenuhi
                        }

                        if (law.type === 'MAGNETISM' && law.targetColor !== undefined) {
                            // Cari target terdekat
                            const targets = objects.filter(o => o.color === law.targetColor);
                            let nearestTarget = null;
                            let minDist = Infinity;
                            
                            // [LOW MATH FIX] Jangan gunakan Center of Mass.
                            // Gunakan jarak terdekat antar piksel (Manhattan Distance) untuk menghindari tarikan diagonal yang salah.
                            let bestDx = 0;
                            let bestDy = 0;

                            for (const t of targets) {
                                for (const pActor of obj.pixels) {
                                    for (const pTarget of t.pixels) {
                                        // Manhattan Distance
                                        const d = Math.abs(pTarget.x - pActor.x) + Math.abs(pTarget.y - pActor.y);
                                        if (d < minDist) { 
                                            minDist = d; 
                                            nearestTarget = t;
                                            
                                            // Arah dorongan adalah menuju piksel terdekat tersebut
                                            bestDx = Math.sign(pTarget.x - pActor.x);
                                            bestDy = Math.sign(pTarget.y - pActor.y);
                                        }
                                    }
                                }
                            }
                            
                            if (nearestTarget) {
                                totalDx += bestDx;
                                totalDy += bestDy;
                            }
                        } else if (law.type === 'GRAVITY' && law.direction) {
                            totalDx += law.direction.x;
                            totalDy += law.direction.y;
                        }
                    }
                }
                
                // B. Apply Momentum (Inertia)
                totalDx += obj.momentum.x;
                totalDy += obj.momentum.y;

                // Friction / Damping (Decay Momentum)
                if (obj.momentum.x !== 0) obj.momentum.x = Math.sign(obj.momentum.x) * Math.max(0, Math.abs(obj.momentum.x) - 0.2);
                if (obj.momentum.y !== 0) obj.momentum.y = Math.sign(obj.momentum.y) * Math.max(0, Math.abs(obj.momentum.y) - 0.2);

                // Clamp ke 1 step per tick (Chebyshev distance 1)
                const stepDx = Math.sign(totalDx);
                const stepDy = Math.sign(totalDy);
                
                if (stepDx !== 0 || stepDy !== 0) {
                    nextPositions.set(obj.id, obj.pixels.map(p => ({x: p.x + stepDx, y: p.y + stepDy})));
                }
            }

            // 2. Deteksi & Resolusi Kolisi
            const validMoves = new Map<number, {x: number, y: number}[]>();
            
            for (const [id, nextPixels] of nextPositions) {
                let collisionX = false;
                let collisionY = false;
                let collision = false;

                const currentObj = objects.find(o => o.id === id)!;
                // Cek arah gerak untuk menentukan normal collision
                const dx = nextPixels[0].x - currentObj.pixels[0].x;
                const dy = nextPixels[0].y - currentObj.pixels[0].y;

                for (const p of nextPixels) {
                    // Out of bounds
                    if (p.x < 0 || p.x >= W) collisionX = true;
                    if (p.y < 0 || p.y >= H) collisionY = true;
                    
                    if (collisionX || collisionY) { collision = true; break; }
                    
                    // Cek tabrakan dengan grid SAAT INI
                    const isSelf = currentObj.pixels.some(sp => sp.x === p.x && sp.y === p.y);
                    
                    if (!isSelf && currentGrid[p.y][p.x] !== 0) {
                        // Simplifikasi: Anggap tabrakan terjadi di sumbu pergerakan
                        if (dx !== 0) collisionX = true;
                        if (dy !== 0) collisionY = true;
                        collision = true; break;
                    }
                }
                
                if (!collision) {
                    validMoves.set(id, nextPixels);
                } else {
                    // [UPGRADE] Collision Response: Elastic vs Rigid (Pushing)
                    
                    // Cek apa yang ditabrak?
                    // Kita perlu tahu objek mana yang menghalangi
                    let hitObject: PhysicsObject | null = null;
                    
                    // Scan area tabrakan untuk mencari objek penghalang
                    // (Simplifikasi: Cek pixel pertama yang tabrakan)
                    for (const p of nextPixels) {
                        if (p.x >= 0 && p.x < W && p.y >= 0 && p.y < H) {
                            const colColor = currentGrid[p.y][p.x];
                            if (colColor !== 0 && colColor !== currentObj.color) {
                                hitObject = objects.find(o => o.color === colColor && o.pixels.some(px => px.x === p.x && px.y === p.y)) || null;
                                if (hitObject) break;
                            }
                        }
                    }

                    // Logika Pushing:
                    // Jika menabrak objek lain (bukan tembok batas) DAN objek itu lebih kecil/sama (Movable)
                    if (hitObject && hitObject.mass <= currentObj.mass * 2) {
                        // TRANSFER MOMENTUM (Push)
                        // Benda target menerima momentum pendorong
                        // Arah dorong = arah gerak penabrak
                        const pushX = Math.sign(currentObj.momentum.x || dx); // Gunakan momentum atau delta
                        const pushY = Math.sign(currentObj.momentum.y || dy);
                        
                        hitObject.momentum.x += pushX * 0.8; // Transfer efisiensi 80%
                        hitObject.momentum.y += pushY * 0.8;
                        
                        // Penabrak melambat (Inelastic collision)
                        currentObj.momentum.x *= 0.2;
                        currentObj.momentum.y *= 0.2;
                        
                        PDRLogger.trace(`   💪 Pushing: Object #${id} pushes Object #${hitObject.id}. Transfer Momentum.`);
                        hasMovement = true; 
                    } else {
                        // INELASTIC COLLISION (Berhenti saat menabrak tembok / benda berat)
                        // Di ARC, gravitasi/magnetisme biasanya membuat benda menempel, bukan memantul.
                        currentObj.momentum.x = 0;
                        currentObj.momentum.y = 0;
                        PDRLogger.trace(`   🛑 Stop: Object #${id} hits Wall/Heavy. Sticking.`);
                        // Kita tidak men-set hasMovement = true di sini, agar jika semua objek sudah menempel, simulasi berhenti.
                    }
                }
            }
            
            // 3. Terapkan Gerakan Valid
            if (validMoves.size > 0) {
                hasMovement = true;
                
                // Hapus posisi lama
                for (const [id, _] of validMoves) {
                    const obj = objects.find(o => o.id === id)!;
                    for (const p of obj.pixels) currentGrid[p.y][p.x] = 0;
                }
                
                // Tulis posisi baru
                for (const [id, nextPixels] of validMoves) {
                    const obj = objects.find(o => o.id === id)!;
                    for (const p of nextPixels) currentGrid[p.y][p.x] = obj.color;
                }
            }

            previousObjects = objects;
        }
        
        PDRLogger.info(`   🏁 Simulasi Selesai dalam ${steps} langkah.`);
        return currentGrid;
    }
}
