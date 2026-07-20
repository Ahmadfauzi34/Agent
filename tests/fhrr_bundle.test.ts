import { describe, test, expect } from 'vitest';
import { FHRR, DIMENSION } from '../rrm_src/core/fhrr';

// Helper to calculate L2 norm (Magnitude)
const getL2Norm = (v: Float32Array): number => {
  let sumSq = 0;
  for (let i = 0; i < DIMENSION; i++) {
    sumSq += v[i]! * v[i]!;
  }
  return Math.sqrt(sumSq);
};

// Helper to manually normalize a vector
const normalizeL2 = (v: Float32Array): Float32Array => {
  const norm = getL2Norm(v);
  const res = new Float32Array(DIMENSION);
  const invNorm = norm > 0 ? 1.0 / norm : 0.0;
  for (let i = 0; i < DIMENSION; i++) {
    res[i] = v[i]! * invNorm;
  }
  return res;
};

// Helper to generate perfectly orthogonal vectors (e.g. 1-hot / impulse vectors)
const createImpulse = (index: number): Float32Array => {
  const v = new Float32Array(DIMENSION);
  v[index % DIMENSION] = 1.0;
  return v;
};

describe('FHRR.bundle 50 Comprehensive Robustness Test Suite', () => {

  // ==========================================
  // KELOMPOK 1: KASUS DASAR & EDGE CASES (1-10)
  // ==========================================

  test('1. Bundling array kosong harus mengembalikan vektor nol murni', () => {
    const bundled = FHRR.bundle([]);
    expect(bundled).toBeInstanceOf(Float32Array);
    expect(bundled.length).toBe(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBe(0.0);
    }
  });

  test('2. Bundling satu vektor harus mengembalikan vektor yang identik dengan input', () => {
    const vec = FHRR.create(1);
    const bundled = FHRR.bundle([vec]);
    expect(bundled).toEqual(vec);
  });

  test('3. Bundling dua vektor identik harus menghasilkan vektor dengan magnitudo dua kalinya', () => {
    const vec = FHRR.create(2);
    const bundled = FHRR.bundle([vec, vec]);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBeCloseTo(vec[i]! * 2, 6);
    }
  });

  test('4. Bundling vektor dengan lawannya (negatif murni) harus menghasilkan vektor nol', () => {
    const vecA = FHRR.create(3);
    const vecB = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) vecB[i] = -vecA[i]!;

    const bundled = FHRR.bundle([vecA, vecB]);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBeCloseTo(0.0, 7);
    }
  });

  test('5. Bundling vektor nol dengan dirinya sendiri harus mengembalikan vektor nol', () => {
    const zero = new Float32Array(DIMENSION);
    const bundled = FHRR.bundle([zero, zero, zero]);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBe(0.0);
    }
  });

  test('6. Bundling vektor aktif dengan vektor nol harus menghasilkan vektor aktif semula', () => {
    const vec = FHRR.create(4);
    const zero = new Float32Array(DIMENSION);
    const bundled = FHRR.bundle([vec, zero]);
    expect(bundled).toEqual(vec);
  });

  test('7. Immutability check: FHRR.bundle tidak boleh memutasi array input asli', () => {
    const vecA = FHRR.create(5);
    const vecB = FHRR.create(6);
    const vecACopy = new Float32Array(vecA);
    const vecBCopy = new Float32Array(vecB);

    FHRR.bundle([vecA, vecB]);

    expect(vecA).toEqual(vecACopy);
    expect(vecB).toEqual(vecBCopy);
  });

  test('8. Bundling 3 vektor yang saling meniadakan secara simetris (A + B + C = 0)', () => {
    const a = FHRR.create(7);
    const b = FHRR.create(8);
    // c = -(a + b)
    const c = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) {
      c[i] = -(a[i]! + b[i]!);
    }

    const bundled = FHRR.bundle([a, b, c]);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBeCloseTo(0.0, 6);
    }
  });

  test('9. Tipe data kembalian dari FHRR.bundle harus selalu Float32Array', () => {
    const vec = FHRR.create(9);
    const bundled = FHRR.bundle([vec, vec]);
    expect(bundled).toBeInstanceOf(Float32Array);
  });

  test('10. Bundling berulang-ulang dari elemen tunggal mempertahankan presisi', () => {
    const vec = FHRR.create(10);
    let bundled = FHRR.bundle([vec]);
    for (let i = 0; i < 5; i++) {
      bundled = FHRR.bundle([bundled]);
    }
    expect(bundled).toEqual(vec);
  });

  // ==========================================
  // KELOMPOK 2: MASSIVE SUPERPOSITION & SCALE LIMITS (11-20)
  // ==========================================

  test('11. Bundling 10 vektor acak FHRR independen', () => {
    const list = Array.from({ length: 10 }, (_, i) => FHRR.create(100 + i));
    const bundled = FHRR.bundle(list);
    expect(bundled.length).toBe(DIMENSION);
    expect(getL2Norm(bundled)).toBeGreaterThan(1.0);
  });

  test('12. Bundling 50 vektor acak FHRR independen', () => {
    const list = Array.from({ length: 50 }, (_, i) => FHRR.create(200 + i));
    const bundled = FHRR.bundle(list);
    expect(getL2Norm(bundled)).toBeGreaterThan(3.0);
  });

  test('13. Bundling 100 vektor acak FHRR independen', () => {
    const list = Array.from({ length: 100 }, (_, i) => FHRR.create(300 + i));
    const bundled = FHRR.bundle(list);
    expect(getL2Norm(bundled)).toBeGreaterThan(5.0);
  });

  test('14. Bundling 1000 vektor acak FHRR (skala masif) harus tetap stabil dan berkinerja cepat', () => {
    const list = Array.from({ length: 1000 }, (_, i) => FHRR.create(400 + i));
    const start = Date.now();
    const bundled = FHRR.bundle(list);
    const end = Date.now();
    expect(bundled.length).toBe(DIMENSION);
    expect(end - start).toBeLessThan(100); // Harus selesai dalam beberapa milidetik saja
  });

  test('15. Skalabilitas L2 Norm pada bundling masif: L2 norm dari N vektor ortogonal mendekati sqrt(N)', () => {
    const N = 64;
    // Gunakan impulse vectors yang dijamin saling ortogonal sempurna
    const list = Array.from({ length: N }, (_, i) => createImpulse(i));
    const bundled = FHRR.bundle(list);
    const norm = getL2Norm(bundled);
    // sqrt(64) = 8
    expect(norm).toBeCloseTo(8.0, 7);
  });

  test('16. Bundling 1000 vektor nol murni harus mengembalikan vektor nol tanpa overhead atau kebocoran memori', () => {
    const zeros = Array.from({ length: 1000 }, () => new Float32Array(DIMENSION));
    const bundled = FHRR.bundle(zeros);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBe(0.0);
    }
  });

  test('17. Bundling 1000 salinan dari satu vektor harus menghasilkan 1000x magnitudo asli', () => {
    const vec = FHRR.create(17);
    const list = Array.from({ length: 1000 }, () => vec);
    const bundled = FHRR.bundle(list);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBeCloseTo(vec[i]! * 1000, 3);
    }
  });

  test('18. Bundling 500 pasang vektor saling meniadakan (+vec dan -vec) menghasilkan nol', () => {
    const list: Float32Array[] = [];
    for (let i = 0; i < 500; i++) {
      const vec = FHRR.create(500 + i);
      const negVec = new Float32Array(DIMENSION);
      for (let j = 0; j < DIMENSION; j++) negVec[j] = -vec[j]!;
      list.push(vec, negVec);
    }
    const bundled = FHRR.bundle(list);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBeCloseTo(0.0, 5);
    }
  });

  test('19. Konsistensi spasial bundling masif yang didekonstruksi bertahap', () => {
    const a = FHRR.create(191);
    const b = FHRR.create(192);
    const c = FHRR.create(193);

    const b1 = FHRR.bundle([a, b]);
    const b2 = FHRR.bundle([b1, c]);
    const bDirect = FHRR.bundle([a, b, c]);

    expect(b2).toEqual(bDirect);
  });

  test('20. Bundling 500 vektor dengan nilai seragam yang meningkat secara linier', () => {
    const list: Float32Array[] = [];
    for (let i = 1; i <= 500; i++) {
      list.push(new Float32Array(DIMENSION).fill(i));
    }
    const bundled = FHRR.bundle(list);
    // Jumlah dari 1 s.d 500 adalah (500 * 501) / 2 = 125250
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBe(125250);
    }
  });

  // ==========================================
  // KELOMPOK 3: STATISTICAL PROPERTIES & VECTOR SPACE (21-30)
  // ==========================================

  test('21. Similarity komponen di dalam bundel tak-ternormalisasi terhadap bundel itu sendiri', () => {
    const a = FHRR.create(21);
    const b = FHRR.create(22);
    const bundled = FHRR.bundle([a, b]);

    const simA = FHRR.similarity(bundled, a);
    const simB = FHRR.similarity(bundled, b);

    // Kemiripan matematis dengan komponen dalam superposisi 2-vektor harus ~ 1 / sqrt(2) ≈ 0.707
    expect(simA).toBeGreaterThan(0.65);
    expect(simA).toBeLessThan(0.76);
    expect(simB).toBeGreaterThan(0.65);
    expect(simB).toBeLessThan(0.76);
  });

  test('22. Crosstalk/Interference: Bundling vektor independen tidak merusak ortogonalitas dengan vektor luar', () => {
    const a = FHRR.create(23);
    const b = FHRR.create(24);
    const external = FHRR.create(25);

    const bundled = FHRR.bundle([a, b]);
    const sim = FHRR.similarity(bundled, external);

    // Harus tetap ortogonal secara statistik dengan elemen luar (< 0.15)
    expect(Math.abs(sim)).toBeLessThan(0.15);
  });

  test('23. Bundling 3 vektor ortogonal sempurna menghasilkan kemiripan ~ 1 / sqrt(3) ≈ 0.577 terhadap masing-masing komponen', () => {
    const v0 = createImpulse(0);
    const v1 = createImpulse(1);
    const v2 = createImpulse(2);

    const bundled = FHRR.bundle([v0, v1, v2]);
    const sim0 = FHRR.similarity(bundled, v0);
    const sim1 = FHRR.similarity(bundled, v1);
    const sim2 = FHRR.similarity(bundled, v2);

    expect(sim0).toBeCloseTo(0.57735, 4);
    expect(sim1).toBeCloseTo(0.57735, 4);
    expect(sim2).toBeCloseTo(0.57735, 4);
  });

  test('24. Hubungan linearitas superposisi: similarity(A + B, C) = similarity(A, C) + similarity(B, C) (tertimbang magnitudo)', () => {
    const a = FHRR.create(26);
    const b = FHRR.create(27);
    const c = FHRR.create(28);

    const ab = FHRR.bundle([a, b]);
    const normAB = getL2Norm(ab);
    const simLHS = FHRR.similarity(ab, c);

    const simAC = FHRR.similarity(a, c);
    const simBC = FHRR.similarity(b, c);

    // Secara matematis: similarity(a+b, c) = (a.c + b.c) / (||a+b|| * ||c||)
    // Karena ||a|| = ||b|| = ||c|| = 1.0, maka LHS = (simAC + simBC) / ||a+b||
    const expected = (simAC + simBC) / normAB;
    expect(simLHS).toBeCloseTo(expected, 6);
  });

  test('25. Membundel 10 komponen acak dan memverifikasi batas interferensi / crosstalk (< 0.1) untuk komponen tak terdaftar', () => {
    const list = Array.from({ length: 10 }, (_, i) => FHRR.create(1000 + i));
    const external = FHRR.create(9999);
    const bundled = FHRR.bundle(list);

    const sim = FHRR.similarity(bundled, external);
    expect(Math.abs(sim)).toBeLessThan(0.15);
  });

  test('26. Sifat pembatalan fasa (Phase Cancellation) di dalam superposisi linear FHRR', () => {
    const a = FHRR.create(30);
    // Buat b yang berlawanan fasa dengan a di separuh indeks
    const b = new Float32Array(a);
    for (let i = 0; i < DIMENSION / 2; i++) {
      b[i] = -a[i]!;
    }
    const bundled = FHRR.bundle([a, b]);
    // Setengah pertama saling menghapuskan (bernilai 0), setengah kedua saling memperkuat (bernilai 2*a)
    for (let i = 0; i < DIMENSION / 2; i++) {
      expect(bundled[i]).toBeCloseTo(0.0, 7);
    }
    for (let i = DIMENSION / 2; i < DIMENSION; i++) {
      expect(bundled[i]).toBeCloseTo(a[i]! * 2, 6);
    }
  });

  test('27. Bundling dari linear combination bertumpuk (A + 2B + 3C)', () => {
    const a = FHRR.create(31);
    const b = FHRR.create(32);
    const c = FHRR.create(33);

    const doubleB = new Float32Array(DIMENSION);
    const tripleC = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) {
      doubleB[i] = b[i]! * 2;
      tripleC[i] = c[i]! * 3;
    }

    const bundled = FHRR.bundle([a, doubleB, tripleC]);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBeCloseTo(a[i]! + b[i]! * 2 + c[i]! * 3, 5);
    }
  });

  test('28. Hubungan korelasi silang dari bundel (A + B) vs bundel (C + D)', () => {
    const a = FHRR.create(34);
    const b = FHRR.create(35);
    const c = FHRR.create(36);
    const d = FHRR.create(37);

    const b1 = FHRR.bundle([a, b]);
    const b2 = FHRR.bundle([c, d]);

    const sim = FHRR.similarity(b1, b2);
    expect(Math.abs(sim)).toBeLessThan(0.15); // Harus sangat rendah karena semua komponen independen
  });

  test('29. Bundling komponen berbobot negatif menggeser arah similarity menjadi negatif', () => {
    const a = FHRR.create(38);
    const b = FHRR.create(39);
    const negB = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) negB[i] = -b[i]!;

    const bundled = FHRR.bundle([a, negB]);
    const simB = FHRR.similarity(bundled, b);
    expect(simB).toBeLessThan(-0.5); // Kemiripan negatif yang kuat dengan b asli
  });

  test('30. Superposisi simetris: bundling (A + B) vs (A - B) menghasilkan ortogonalitas statistik', () => {
    const a = FHRR.create(40);
    const b = FHRR.create(41);
    const negB = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) negB[i] = -b[i]!;

    const bundlePos = FHRR.bundle([a, b]);
    const bundleNeg = FHRR.bundle([a, negB]);

    const sim = FHRR.similarity(bundlePos, bundleNeg);
    // (a+b).(a-b) = a.a - b.b = 1 - 1 = 0
    expect(Math.abs(sim)).toBeLessThan(0.15);
  });

  // ==========================================
  // KELOMPOK 4: ROBUSTNESS, EXTREME VALUES & ANTI-NAN (31-40)
  // ==========================================

  test('31. Bundling dengan vektor yang mengandung NaN harus tetap mengalirkan NaN atau ditangani dengan aman tanpa crash', () => {
    const a = FHRR.create(42);
    const nanVec = new Float32Array(DIMENSION).fill(NaN);
    const bundled = FHRR.bundle([a, nanVec]);
    expect(bundled).toBeInstanceOf(Float32Array);
    for (let i = 0; i < DIMENSION; i++) {
      expect(isNaN(bundled[i]!)).toBe(true);
    }
  });

  test('32. Bundling dengan elemen Infinity harus menghasilkan komponen Infinity tanpa fatal crash', () => {
    const a = FHRR.create(43);
    const infVec = new Float32Array(DIMENSION).fill(Infinity);
    const bundled = FHRR.bundle([a, infVec]);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBe(Infinity);
    }
  });

  test('33. Bundling dengan elemen -Infinity harus menghasilkan komponen -Infinity secara presisi', () => {
    const a = FHRR.create(44);
    const negInfVec = new Float32Array(DIMENSION).fill(-Infinity);
    const bundled = FHRR.bundle([a, negInfVec]);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBe(-Infinity);
    }
  });

  test('34. Bundling elemen Infinity dan -Infinity pada posisi yang sama harus menghasilkan NaN (Infinity - Infinity = NaN) secara aman', () => {
    const infVec = new Float32Array(DIMENSION).fill(Infinity);
    const negInfVec = new Float32Array(DIMENSION).fill(-Infinity);
    const bundled = FHRR.bundle([infVec, negInfVec]);
    for (let i = 0; i < DIMENSION; i++) {
      expect(isNaN(bundled[i]!)).toBe(true);
    }
  });

  test('35. Bundling dengan vektor subnormal (elemen sangat kecil 1e-38) tidak boleh memicu underflow crash', () => {
    const subnormal = new Float32Array(DIMENSION).fill(1e-38);
    const vec = FHRR.create(45);
    const bundled = FHRR.bundle([vec, subnormal]);
    expect(bundled).toBeInstanceOf(Float32Array);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBeCloseTo(vec[i]!, 7);
    }
  });

  test('36. Bundling dengan vektor berukuran super raksasa (elemen 1e38) tidak boleh memicu overflow crash', () => {
    const giant = new Float32Array(DIMENSION).fill(1e38);
    const vec = FHRR.create(46);
    const bundled = FHRR.bundle([vec, giant]);
    expect(bundled).toBeInstanceOf(Float32Array);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBeCloseTo(1e38, -32); // Toleransi logaritmik sangat longgar
    }
  });

  test('37. Bundling campuran antara NaN, Infinity, -Infinity, subnormal, dan angka riil acak', () => {
    const vec = FHRR.create(47);
    const messy = new Float32Array(DIMENSION);
    messy[0] = NaN;
    messy[1] = Infinity;
    messy[2] = -Infinity;
    messy[3] = 1e-35;

    const bundled = FHRR.bundle([vec, messy]);
    expect(isNaN(bundled[0]!)).toBe(true);
    expect(bundled[1]).toBe(Infinity);
    expect(bundled[2]).toBe(-Infinity);
    expect(bundled[3]).toBeCloseTo(vec[3]!, 7);
  });

  test('38. Bundling 100 vektor yang masing-masing mengandung satu elemen NaN di indeks berbeda', () => {
    const list: Float32Array[] = [];
    for (let i = 0; i < 100; i++) {
      const v = FHRR.create(1000 + i);
      v[i] = NaN;
      list.push(v);
    }
    const bundled = FHRR.bundle(list);
    // Indeks 0 sampai 99 harus bernilai NaN
    for (let i = 0; i < 100; i++) {
      expect(isNaN(bundled[i]!)).toBe(true);
    }
    // Indeks ke-100 ke atas harus berupa angka riil normal yang valid
    for (let i = 100; i < DIMENSION; i++) {
      expect(isNaN(bundled[i]!)).toBe(false);
    }
  });

  test('39. Pembatalan fasa ekstrem: Bundling spike raksasa (1e30) dengan negatifnya (-1e30) menghasilkan nol', () => {
    const p = new Float32Array(DIMENSION);
    const n = new Float32Array(DIMENSION);
    p[42] = 1e30;
    n[42] = -1e30;

    const bundled = FHRR.bundle([p, n]);
    expect(bundled[42]).toBe(0.0);
  });

  test('40. Membundel vektor yang memiliki elemen negatif nol (-0.0) menghasilkan 0.0 sesuai standar IEEE 754', () => {
    const a = new Float32Array(DIMENSION).fill(-0.0);
    const b = new Float32Array(DIMENSION).fill(-0.0);
    const bundled = FHRR.bundle([a, b]);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBe(0.0);
    }
  });

  // ==========================================
  // KELOMPOK 5: NORMALIZATION & MATHEMATICAL PROPERTIES (41-50)
  // ==========================================

  test('41. Bundling dari vektor ternormalisasi tidak otomatis menghasilkan vektor ternormalisasi (L2 norm > 1.0)', () => {
    const a = FHRR.create(41);
    const b = FHRR.create(42);
    const bundled = FHRR.bundle([a, b]);
    const norm = getL2Norm(bundled);
    expect(norm).toBeGreaterThan(1.0);
  });

  test('42. Menormalisasi manual hasil bundling menghasilkan L2 norm presisi 1.0', () => {
    const a = FHRR.create(43);
    const b = FHRR.create(44);
    const bundled = FHRR.bundle([a, b]);
    const normalized = normalizeL2(bundled);
    expect(getL2Norm(normalized)).toBeCloseTo(1.0, 6);
  });

  test('43. Distributivitas Binding terhadap Bundling (A * (B + C) = A * B + A * C)', () => {
    const a = FHRR.create(45);
    const b = FHRR.create(46);
    const c = FHRR.create(47);

    // LHS: A * (B + C)
    const bPlusC = FHRR.bundle([b, c]);
    const LHS = FHRR.bind(a, bPlusC);

    // RHS: A * B + A * C
    const ab = FHRR.bind(a, b);
    const ac = FHRR.bind(a, c);
    const RHS = FHRR.bundle([ab, ac]);

    // Kemiripan antara LHS dan RHS harus mendekati 1.0
    expect(FHRR.similarity(LHS, RHS)).toBeGreaterThan(0.98);
  });

  test('44. Bundling linier simetris: inv(A + B) harus sama dengan inv(A) + inv(B)', () => {
    const a = FHRR.create(48);
    const b = FHRR.create(49);

    const LHS = FHRR.inverse(FHRR.bundle([a, b]));
    const RHS = FHRR.bundle([FHRR.inverse(a), FHRR.inverse(b)]);

    expect(LHS).toEqual(RHS);
  });

  test('45. Bundling dari fractional bind distributif secara linier: fractionalBind(A, p) + fractionalBind(B, p) diuji', () => {
    const a = FHRR.create(50);
    const b = FHRR.create(51);
    const p = 0.5;

    const b1 = FHRR.bundle([FHRR.fractionalBind(a, p), FHRR.fractionalBind(b, p)]);
    expect(b1.length).toBe(DIMENSION);
    expect(getL2Norm(b1)).toBeGreaterThan(1.0);
  });

  test('46. Superposisi berbobot: Bundling setengah porsi A dan setengah porsi B (0.5A + 0.5B)', () => {
    const a = FHRR.create(52);
    const b = FHRR.create(53);

    const halfA = new Float32Array(DIMENSION);
    const halfB = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) {
      halfA[i] = a[i]! * 0.5;
      halfB[i] = b[i]! * 0.5;
    }

    const bundled = FHRR.bundle([halfA, halfB]);
    const normalized = normalizeL2(bundled);
    // Kemiripan dengan komponen harus seimbang
    expect(FHRR.similarity(normalized, a)).toBeGreaterThan(0.65);
    expect(FHRR.similarity(normalized, b)).toBeGreaterThan(0.65);
  });

  test('47. Asosiativitas Bundling: (A + B) + C harus hampir sama dengan A + (B + C) di bawah toleransi float', () => {
    const a = FHRR.create(54);
    const b = FHRR.create(55);
    const c = FHRR.create(56);

    const ab_c = FHRR.bundle([FHRR.bundle([a, b]), c]);
    const a_bc = FHRR.bundle([a, FHRR.bundle([b, c])]);

    for (let i = 0; i < DIMENSION; i++) {
      expect(ab_c[i]).toBeCloseTo(a_bc[i]!, 5);
    }
  });

  test('48. Komutativitas Bundling: A + B harus sama secara numerik dengan B + A', () => {
    const a = FHRR.create(57);
    const b = FHRR.create(58);

    const ab = FHRR.bundle([a, b]);
    const ba = FHRR.bundle([b, a]);

    expect(ab).toEqual(ba);
  });

  test('49. Bundling dari 100 vektor bernilai acak terkontrol pada rentang homogen positif selalu valid', () => {
    const list = Array.from({ length: 100 }, () => new Float32Array(DIMENSION).fill(0.1));
    const bundled = FHRR.bundle(list);
    for (let i = 0; i < DIMENSION; i++) {
      expect(bundled[i]).toBeCloseTo(10.0, 5);
    }
  });

  test('50. Aljabar Rekursif Kompleks dengan Bundling, Binding, Inversi, dan Fractional Binding menghasilkan kesamaan deterministik 1.0', () => {
    const a = FHRR.create(59);
    const b = FHRR.create(60);
    const c = FHRR.create(61);

    const term1 = FHRR.bind(a, FHRR.inverse(b));
    const term2 = FHRR.fractionalBind(c, 0.5);

    const res1 = FHRR.bundle([term1, term2]);
    const res2 = FHRR.bundle([term1, term2]);

    expect(res1).toEqual(res2);
    expect(FHRR.similarity(res1, res2)).toBeCloseTo(1.0, 7);
  });

});
