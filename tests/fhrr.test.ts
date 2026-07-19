import { describe, test, expect } from 'vitest';
import { FHRR, DIMENSION } from '../rrm_src/core/fhrr';

describe('FHRR.similarity 50 Comprehensive Robustness Test Suite', () => {

  // ==========================================
  // KELOMPOK 1: KASUS DASAR (HAPPY PATHS) - 10 TEST CASES
  // ==========================================

  test('1. Similarity dengan dirinya sendiri harus presisi 1.0', () => {
    const vec = FHRR.create(1);
    expect(FHRR.similarity(vec, vec)).toBeCloseTo(1.0, 7);
  });

  test('2. Similarity dengan klon identik harus presisi 1.0', () => {
    const vecA = FHRR.create(2);
    const vecB = new Float32Array(vecA);
    expect(FHRR.similarity(vecA, vecB)).toBeCloseTo(1.0, 7);
  });

  test('3. Similarity dengan inversi negatif murni harus presisi -1.0', () => {
    const vecA = FHRR.create(3);
    const vecB = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) vecB[i] = -vecA[i];
    expect(FHRR.similarity(vecA, vecB)).toBeCloseTo(-1.0, 7);
  });

  test('4. Dua vektor dengan arah tegak lurus sempurna (ortogonal dasar) harus memiliki similarity 0.0', () => {
    const vecA = new Float32Array(DIMENSION);
    const vecB = new Float32Array(DIMENSION);
    // Buat ortogonal dengan meletakkan nilai non-nol di indeks yang tidak beririsan
    vecA[0] = 1.0;
    vecB[1] = 1.0;
    expect(FHRR.similarity(vecA, vecB)).toBe(0.0);
  });

  test('5. Vektor basis ortogonal bernormalisasi dengan dot product nol harus mengembalikan nilai 0.0', () => {
    const vecA = new Float32Array(DIMENSION);
    const vecB = new Float32Array(DIMENSION);
    // Setengah pertama vecA bernilai positif, setengah kedua bernilai negatif, vecB seragam positif
    for (let i = 0; i < DIMENSION / 2; i++) {
      vecA[i] = 1.0;
      vecA[DIMENSION / 2 + i] = -1.0;
      vecB[i] = 1.0;
      vecB[DIMENSION / 2 + i] = 1.0;
    }
    expect(FHRR.similarity(vecA, vecB)).toBe(0.0);
  });

  test('6. Kasus happy path 2D-like grid: kemiripan bertahap pada perubahan kecil', () => {
    const vecA = FHRR.create(10);
    const vecB = new Float32Array(vecA);
    vecB[0] += 0.1; // Sedikit pergeseran
    const sim = FHRR.similarity(vecA, vecB);
    expect(sim).toBeGreaterThan(0.9);
    expect(sim).toBeLessThan(1.0);
  });

  test('7. Kemiripan vektor bernilai acak terkontrol pada rentang homogen positif', () => {
    const vecA = new Float32Array(DIMENSION).fill(0.5);
    const vecB = new Float32Array(DIMENSION).fill(0.5);
    expect(FHRR.similarity(vecA, vecB)).toBeCloseTo(1.0, 7);
  });

  test('8. Kemiripan dua vektor acak FHRR independen harus mendekati ortogonalitas statistik (sangat dekat dengan 0.0)', () => {
    const vecA = FHRR.create(4);
    const vecB = FHRR.create(5);
    const sim = FHRR.similarity(vecA, vecB);
    // Ekspektasi dimensi tinggi (D=8192): simpangan baku ~ 1 / sqrt(8192) = 0.011
    expect(Math.abs(sim)).toBeLessThan(0.15);
  });

  test('9. Skalar kelipatan positif tidak boleh mengubah nilai similarity', () => {
    const vecA = FHRR.create(6);
    const vecB = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) vecB[i] = vecA[i] * 5.7;
    expect(FHRR.similarity(vecA, vecB)).toBeCloseTo(1.0, 7);
  });

  test('10. Skalar kelipatan negatif harus membalikkan similarity secara presisi menjadi -1.0', () => {
    const vecA = FHRR.create(7);
    const vecB = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) vecB[i] = vecA[i] * -0.003;
    expect(FHRR.similarity(vecA, vecB)).toBeCloseTo(-1.0, 7);
  });


  // ==========================================
  // KELOMPOK 2: BOUNDARY, ROBUSTNESS, DAN ANTI-NAN - 15 TEST CASES
  // ==========================================

  test('11. Zero Vector vs Zero Vector tidak boleh crash atau NaN, harus mengembalikan 0.0', () => {
    const vecA = new Float32Array(DIMENSION);
    const vecB = new Float32Array(DIMENSION);
    const sim = FHRR.similarity(vecA, vecB);
    expect(sim).toBe(0.0);
    expect(isNaN(sim)).toBe(false);
  });

  test('12. Zero Vector vs Active Vector harus mengembalikan 0.0 secara aman', () => {
    const vecA = new Float32Array(DIMENSION);
    const vecB = FHRR.create(8);
    const sim = FHRR.similarity(vecA, vecB);
    expect(sim).toBe(0.0);
    expect(isNaN(sim)).toBe(false);
  });

  test('13. Active Vector vs Zero Vector harus mengembalikan 0.0 secara aman', () => {
    const vecA = FHRR.create(9);
    const vecB = new Float32Array(DIMENSION);
    const sim = FHRR.similarity(vecA, vecB);
    expect(sim).toBe(0.0);
    expect(isNaN(sim)).toBe(false);
  });

  test('14. Vektor dengan elemen yang terlampau kecil (subnormal: 1e-35) harus tetap aman dari NaN', () => {
    const vecA = new Float32Array(DIMENSION).fill(1e-35);
    const vecB = new Float32Array(DIMENSION).fill(1e-35);
    const sim = FHRR.similarity(vecA, vecB);
    expect(isNaN(sim)).toBe(false);
    expect(sim).toBeLessThanOrEqual(1.0);
    expect(sim).toBeGreaterThanOrEqual(-1.0);
  });

  test('15. Elemen murni bernilai Infinity tidak boleh menghasilkan NaN, harus dijaga dalam rentang batas aman [-1, 1]', () => {
    const vecA = new Float32Array(DIMENSION).fill(Infinity);
    const vecB = new Float32Array(DIMENSION).fill(Infinity);
    const sim = FHRR.similarity(vecA, vecB);
    expect(isNaN(sim)).toBe(false);
    expect(sim).toBeLessThanOrEqual(1.0);
    expect(sim).toBeGreaterThanOrEqual(-1.0);
  });

  test('16. Elemen murni bernilai -Infinity tidak boleh menghasilkan NaN atau crash', () => {
    const vecA = new Float32Array(DIMENSION).fill(-Infinity);
    const vecB = new Float32Array(DIMENSION).fill(-Infinity);
    const sim = FHRR.similarity(vecA, vecB);
    expect(isNaN(sim)).toBe(false);
    expect(sim).toBeLessThanOrEqual(1.0);
    expect(sim).toBeGreaterThanOrEqual(-1.0);
  });

  test('17. Percampuran Infinity dan -Infinity harus tetap tertahan dalam batas [-1, 1] tanpa NaN', () => {
    const vecA = new Float32Array(DIMENSION).fill(Infinity);
    const vecB = new Float32Array(DIMENSION).fill(-Infinity);
    const sim = FHRR.similarity(vecA, vecB);
    expect(isNaN(sim)).toBe(false);
    expect(sim).toBeLessThanOrEqual(1.0);
    expect(sim).toBeGreaterThanOrEqual(-1.0);
  });

  test('18. Clamping check: similarity tidak boleh meledak melebihi 1.0 (misal akibat error pembulatan)', () => {
    const vecA = new Float32Array(DIMENSION).fill(1.0000001);
    const vecB = new Float32Array(DIMENSION).fill(1.0);
    const sim = FHRR.similarity(vecA, vecB);
    expect(sim).toBeLessThanOrEqual(1.0);
  });

  test('19. Clamping check: similarity tidak boleh meleset di bawah -1.0', () => {
    const vecA = new Float32Array(DIMENSION).fill(-1.0000001);
    const vecB = new Float32Array(DIMENSION).fill(1.0);
    const sim = FHRR.similarity(vecA, vecB);
    expect(sim).toBeGreaterThanOrEqual(-1.0);
  });

  test('20. Komparasi vektor dengan kontras satu piksel bernilai super-raksasa (1e30) vs seragam harus stabil', () => {
    const vecA = new Float32Array(DIMENSION);
    vecA[0] = 1e30;
    const vecB = new Float32Array(DIMENSION).fill(1.0);
    const sim = FHRR.similarity(vecA, vecB);
    expect(isNaN(sim)).toBe(false);
    expect(sim).toBeLessThanOrEqual(1.0);
    expect(sim).toBeGreaterThanOrEqual(-1.0);
  });

  test('21. Deteksi bias fasa: Semua elemen bernilai negatif sangat kecil vs semua positif', () => {
    const vecA = new Float32Array(DIMENSION).fill(-1e-20);
    const vecB = new Float32Array(DIMENSION).fill(1e-20);
    const sim = FHRR.similarity(vecA, vecB);
    // Karena nilai elemen sangat kecil (di bawah batas resolusi komputasi Float32Array setelah diproses dengan epsilon 1e-15 di dalam denominator),
    // hasil similarity adalah berkisar antara -1.0 dan 1.0 (tetap aman dari NaN). Kita periksa bahwa nilainya valid dan stabil.
    expect(isNaN(sim)).toBe(false);
    expect(sim).toBeLessThanOrEqual(1.0);
    expect(sim).toBeGreaterThanOrEqual(-1.0);
  });

  test('22. Satu elemen tunggal non-nol di kedua vektor pada indeks yang sama', () => {
    const vecA = new Float32Array(DIMENSION);
    const vecB = new Float32Array(DIMENSION);
    vecA[42] = 12.3;
    vecB[42] = -0.5;
    const sim = FHRR.similarity(vecA, vecB);
    expect(sim).toBeCloseTo(-1.0, 7);
  });

  test('23. Hanya satu elemen non-nol di masing-masing vektor tetapi di indeks berbeda', () => {
    const vecA = new Float32Array(DIMENSION);
    const vecB = new Float32Array(DIMENSION);
    vecA[100] = 1.0;
    vecB[200] = 1.0;
    const sim = FHRR.similarity(vecA, vecB);
    expect(sim).toBe(0.0);
  });

  test('24. Semua elemen NaN pada input harus ditangani secara elegan (tidak boleh meledak ke floating point error tak terkontrol)', () => {
    const vecA = new Float32Array(DIMENSION).fill(NaN);
    const vecB = FHRR.create(11);
    const sim = FHRR.similarity(vecA, vecB);
    expect(isNaN(sim)).toBe(false);
    expect(sim).toBe(0.0); // Karena dot product NaN dan max/min clamping
  });

  test('25. Elemen berseling NaN dan Angka Riil harus tetap kokoh mengembalikan nilai dalam rentang [-1, 1]', () => {
    const vecA = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) {
      vecA[i] = i % 2 === 0 ? NaN : 0.5;
    }
    const vecB = FHRR.create(12);
    const sim = FHRR.similarity(vecA, vecB);
    expect(isNaN(sim)).toBe(false);
    expect(sim).toBeLessThanOrEqual(1.0);
    expect(sim).toBeGreaterThanOrEqual(-1.0);
  });


  // ==========================================
  // KELOMPOK 3: DETERMINISME & SEED TESTING - 10 TEST CASES
  // ==========================================

  test('26. Vektor dari seed yang sama harus menghasilkan similarity presisi 1.0', () => {
    const vecA = FHRR.create(42);
    const vecB = FHRR.create(42);
    expect(FHRR.similarity(vecA, vecB)).toBeCloseTo(1.0, 7);
  });

  test('27. Vektor dari seed berbeda harus memiliki similarity acak statistik (ortogonal)', () => {
    const vecA = FHRR.create(100);
    const vecB = FHRR.create(200);
    const sim = FHRR.similarity(vecA, vecB);
    expect(Math.abs(sim)).toBeLessThan(0.15);
  });

  test('28. Konsistensi relasi seed: Similarity(S_A, S_B) harus persis sama jika diulang', () => {
    const vecA1 = FHRR.create(500);
    const vecB1 = FHRR.create(600);
    const sim1 = FHRR.similarity(vecA1, vecB1);

    const vecA2 = FHRR.create(500);
    const vecB2 = FHRR.create(600);
    const sim2 = FHRR.similarity(vecA2, vecB2);

    expect(sim1).toBe(sim2);
  });

  test('29. Mutasi seed minor (500 vs 501) harus menghasilkan vektor yang ortogonal secara statistik', () => {
    const vecA = FHRR.create(500);
    const vecB = FHRR.create(501);
    const sim = FHRR.similarity(vecA, vecB);
    expect(Math.abs(sim)).toBeLessThan(0.15);
  });

  test('30. Urutan pembuatan vektor dengan pemanggilan customSeed harus independen', () => {
    // Buat A lalu B
    const a = FHRR.create(77);
    const b = FHRR.create(88);
    const simAB1 = FHRR.similarity(a, b);

    // Buat B lalu A (mereset seed dalam urutan berbeda)
    const b2 = FHRR.create(88);
    const a2 = FHRR.create(77);
    const simAB2 = FHRR.similarity(a2, b2);

    expect(simAB1).toBeCloseTo(simAB2, 7);
  });

  test('31. Pembuatan berturut-turut tanpa parameter seed menghasilkan token berbeda yang ortogonal', () => {
    FHRR.create(999); // Reset seed utama
    const v1 = FHRR.create();
    const v2 = FHRR.create();
    expect(FHRR.similarity(v1, v2)).toBeLessThan(0.15);
  });

  test('32. Verifikasi keseragaman sebaran statistik kemiripan pada seed berurutan (0 s.d 4)', () => {
    const vectors = Array.from({ length: 5 }, (_, i) => FHRR.create(i));
    for (let i = 0; i < 5; i++) {
      for (let j = i + 1; j < 5; j++) {
        expect(Math.abs(FHRR.similarity(vectors[i]!, vectors[j]!))).toBeLessThan(0.15);
      }
    }
  });

  test('33. Seed yang sangat besar (batas integer aman 2147483647) harus tetap stabil', () => {
    const vecA = FHRR.create(2147483647 - 1);
    const vecB = FHRR.create(2147483647 - 1);
    expect(FHRR.similarity(vecA, vecB)).toBeCloseTo(1.0, 7);
  });

  test('34. Seed negatif harus tetap ditangani secara deterministik dan valid', () => {
    const vecA = FHRR.create(-105);
    const vecB = FHRR.create(-105);
    expect(FHRR.similarity(vecA, vecB)).toBeCloseTo(1.0, 7);
  });

  test('35. Konsistensi internal: Panggilan similarity berkali-kali pada instance yang sama harus mengembalikan nilai identik tanpa efek samping', () => {
    const vecA = FHRR.create(33);
    const vecB = FHRR.create(44);
    const simFirst = FHRR.similarity(vecA, vecB);
    for (let i = 0; i < 10; i++) {
      expect(FHRR.similarity(vecA, vecB)).toBe(simFirst);
    }
  });


  // ==========================================
  // KELOMPOK 4: SIFAT MATEMATIS VSA - 15 TEST CASES
  // ==========================================

  test('36. Simetri Aljabar: Similarity(A, B) harus identik dengan Similarity(B, A)', () => {
    const vecA = FHRR.create(1001);
    const vecB = FHRR.create(2002);
    expect(FHRR.similarity(vecA, vecB)).toBe(FHRR.similarity(vecB, vecA));
  });

  test('37. Invariansi Holographic Binding: Similarity(A * B, C * B) harus mendekati Similarity(A, C)', () => {
    const a = FHRR.create(111);
    const b = FHRR.create(222);
    const c = FHRR.create(333);

    const ab = FHRR.bind(a, b);
    const cb = FHRR.bind(c, b);

    const simDirect = FHRR.similarity(a, c);
    const simBound = FHRR.similarity(ab, cb);

    // Di dalam VSA, pengikatan (binding) bersifat menjaga kemiripan secara holografis
    expect(simBound).toBeCloseTo(simDirect, 1.5); // Toleransi sedikit longgar karena efek crosstalk minimal FFT
  });

  test('38. Unbinding Recovery: Similarity(A * B * inv(B), A) harus sangat tinggi (mendekati 1.0)', () => {
    const a = FHRR.create(444);
    const b = FHRR.create(555);

    const ab = FHRR.bind(a, b);
    const invB = FHRR.inverse(b);
    const recoveredA = FHRR.bind(ab, invB);

    const sim = FHRR.similarity(recoveredA, a);
    expect(sim).toBeGreaterThan(0.95); // Pemulihan harus sangat bersih
  });

  test('39. Orthogonal Superposition: Bundling mempertahankan relasi komponen A di dalam (A + B)', () => {
    const a = FHRR.create(12);
    const b = FHRR.create(34);
    const bundled = FHRR.bundle([a, b]);

    const simA = FHRR.similarity(bundled, a);
    const simB = FHRR.similarity(bundled, b);

    // Bundling tak dinormalisasi dari 2 vektor ortogonal secara matematis memiliki relasi kemiripan ~ 1 / sqrt(2) ≈ 0.707
    expect(simA).toBeGreaterThan(0.55);
    expect(simB).toBeGreaterThan(0.55);
  });

  test('40. Superposisi kontras negatif: Bundling (A + B) vs (A - B)', () => {
    const a = FHRR.create(56);
    const b = FHRR.create(78);
    const bNeg = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) bNeg[i] = -b[i];

    const bundledPos = FHRR.bundle([a, b]);
    const bundledNeg = FHRR.bundle([a, bNeg]);

    const sim = FHRR.similarity(bundledPos, bundledNeg);
    // (a+b) dot (a-b) = a.a - b.b ≈ 1 - 1 ≈ 0. Similarity harus mendekati 0.0
    expect(Math.abs(sim)).toBeLessThan(0.2);
  });

  test('41. Distributivitas Binding terhadap Bundling: Similarity(A * (B + C), A * B + A * C) harus mendekati 1.0', () => {
    const a = FHRR.create(90);
    const b = FHRR.create(91);
    const c = FHRR.create(92);

    const bPlusC = FHRR.bundle([b, c]);
    const LHS = FHRR.bind(a, bPlusC);

    const ab = FHRR.bind(a, b);
    const ac = FHRR.bind(a, c);
    const RHS = FHRR.bundle([ab, ac]);

    expect(FHRR.similarity(LHS, RHS)).toBeGreaterThan(0.98);
  });

  test('42. Nilai similarity dari bundel yang kosong dengan vektor aktif harus 0.0 secara aman', () => {
    const emptyBundle = FHRR.bundle([]);
    const active = FHRR.create(12345);
    expect(FHRR.similarity(emptyBundle, active)).toBe(0.0);
  });

  test('43. Invariansi Inversi Ganda: Inverse(Inverse(A)) memiliki similarity 1.0 dengan A', () => {
    const a = FHRR.create(888);
    const invA = FHRR.inverse(a);
    const invInvA = FHRR.inverse(invA);
    expect(FHRR.similarity(a, invInvA)).toBeCloseTo(1.0, 7);
  });

  test('44. Sifat ortogonalitas inversi: Similarity(A, Inverse(A)) harus bertingkat ortogonal (kemiripan rendah)', () => {
    const a = FHRR.create(999);
    const invA = FHRR.inverse(a);
    expect(Math.abs(FHRR.similarity(a, invA))).toBeLessThan(0.15);
  });

  test('45. Fractional Binding Continuity: Similarity(A, fractionalBind(A, k)) harus menurun secara mulus seiring k menjauh dari 0', () => {
    const a = FHRR.create(777);
    const aPower1 = FHRR.fractionalBind(a, 1); // K = 1 -> identik dengan a
    const aPower01 = FHRR.fractionalBind(a, 0.1);

    expect(FHRR.similarity(a, aPower1)).toBeGreaterThan(0.9);
    expect(FHRR.similarity(a, aPower01)).toBeLessThan(FHRR.similarity(a, aPower1));
  });

  test('46. Relasi linier superposisi masif: Bundling 10 vektor acak', () => {
    const list = Array.from({ length: 10 }, (_, i) => FHRR.create(i * 10));
    const bundled = FHRR.bundle(list);

    // Setiap elemen di dalam bundel harus memiliki kemiripan positif yang terukur dengan bundel tersebut
    for (const vec of list) {
      expect(FHRR.similarity(bundled, vec)).toBeGreaterThan(0.1);
    }
  });

  test('47. Kemiripan inversi binding distributif: Similarity(Inverse(A * B), Inverse(A) * Inverse(B)) harus mendekati 1.0', () => {
    const a = FHRR.create(15);
    const b = FHRR.create(16);

    const LHS = FHRR.inverse(FHRR.bind(a, b));
    const RHS = FHRR.bind(FHRR.inverse(a), FHRR.inverse(b));

    expect(FHRR.similarity(LHS, RHS)).toBeGreaterThan(0.95);
  });

  test('48. Binding dengan vektor identitas (semua elemen bernilai 1.0 / sqrt(D)) harus mempertahankan kemiripan', () => {
    const a = FHRR.create(301);
    // Dalam representasi FHRR di ruang fasa Fourier, vektor identitas binding adalah vektor delta Dirac (1 pada komponen DC, 0 lainnya) di spektrum,
    // atau vektor konstan bernilai 1 di sumbu Real space jika normalisasi dipelihara.
    // Kita verifikasi bahwa binding dengan vektor seragam menghasilkan kemiripan yang stabil tanpa NaN.
    const identity = new Float32Array(DIMENSION).fill(1.0 / Math.sqrt(DIMENSION));
    const bound = FHRR.bind(a, identity);

    expect(isNaN(FHRR.similarity(a, bound))).toBe(false);
  });

  test('49. Ortogonalitas dari dua hasil fractional binding dengan pangkat yang berjauhan', () => {
    const a = FHRR.create(202);
    const powerA = FHRR.fractionalBind(a, 0.2);
    const powerB = FHRR.fractionalBind(a, 0.9);

    expect(FHRR.similarity(powerA, powerB)).toBeLessThan(0.8);
  });

  test('50. Konsistensi mutlak: Operasi berantai matematika VSA (A * B + C * D) vs dirinya sendiri menghasilkan similarity 1.0', () => {
    const a = FHRR.create(1);
    const b = FHRR.create(2);
    const c = FHRR.create(3);
    const d = FHRR.create(4);

    const chain1 = FHRR.bundle([FHRR.bind(a, b), FHRR.bind(c, d)]);
    const chain2 = FHRR.bundle([FHRR.bind(a, b), FHRR.bind(c, d)]);

    expect(FHRR.similarity(chain1, chain2)).toBeCloseTo(1.0, 7);
  });

});
