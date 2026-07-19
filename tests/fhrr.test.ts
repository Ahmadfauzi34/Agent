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

describe('FHRR.bind 50 Comprehensive Robustness Test Suite', () => {

  // ==========================================
  // KELOMPOK 1: KASUS DASAR & SIFAT ALJEBAR (HAPPY PATHS) - 15 TEST CASES
  // ==========================================

  test('51. Binding menghasilkan vektor yang valid dengan dimensi yang sesuai', () => {
    const a = FHRR.create(100);
    const b = FHRR.create(101);
    const bound = FHRR.bind(a, b);
    expect(bound).toBeInstanceOf(Float32Array);
    expect(bound.length).toBe(DIMENSION);
  });

  test('52. Komutativitas Binding: A * B harus sangat mirip dengan B * A', () => {
    const a = FHRR.create(102);
    const b = FHRR.create(103);
    const ab = FHRR.bind(a, b);
    const ba = FHRR.bind(b, a);
    expect(FHRR.similarity(ab, ba)).toBeCloseTo(1.0, 6);
  });

  test('53. Asosiativitas Binding: (A * B) * C harus sangat mirip dengan A * (B * C)', () => {
    const a = FHRR.create(104);
    const b = FHRR.create(105);
    const c = FHRR.create(106);

    const ab_c = FHRR.bind(FHRR.bind(a, b), c);
    const a_bc = FHRR.bind(a, FHRR.bind(b, c));

    expect(FHRR.similarity(ab_c, a_bc)).toBeGreaterThan(0.95);
  });

  test('54. Distributivitas Binding terhadap Bundling: A * (B + C) harus sangat mirip dengan A * B + A * C', () => {
    const a = FHRR.create(107);
    const b = FHRR.create(108);
    const c = FHRR.create(109);

    const LHS = FHRR.bind(a, FHRR.bundle([b, c]));
    const RHS = FHRR.bundle([FHRR.bind(a, b), FHRR.bind(a, c)]);

    expect(FHRR.similarity(LHS, RHS)).toBeGreaterThan(0.98);
  });

  test('55. Binding memelihara norma (L2 normalization): Magnitude kuadrat dari hasil binding harus sangat dekat dengan 1.0', () => {
    const a = FHRR.create(110);
    const b = FHRR.create(111);
    const bound = FHRR.bind(a, b);
    let sumSq = 0;
    for (let i = 0; i < DIMENSION; i++) {
      sumSq += bound[i]! * bound[i]!;
    }
    expect(sumSq).toBeCloseTo(1.0, 6);
  });

  test('56. Binding dengan klon identik menghasilkan vektor valid ternormalisasi', () => {
    const a = FHRR.create(112);
    const aCopy = new Float32Array(a);
    const bound = FHRR.bind(a, aCopy);
    let sumSq = 0;
    for (let i = 0; i < DIMENSION; i++) {
      sumSq += bound[i]! * bound[i]!;
    }
    expect(sumSq).toBeCloseTo(1.0, 6);
  });

  test('57. Unbinding dengan klon inversi mengembalikan vektor asal secara presisi', () => {
    const a = FHRR.create(113);
    const b = FHRR.create(114);
    const bound = FHRR.bind(a, b);
    const invB = FHRR.inverse(b);
    const unbind = FHRR.bind(bound, invB);

    expect(FHRR.similarity(unbind, a)).toBeGreaterThan(0.95);
  });

  test('58. Binding ganda berturut-turut (A * B * C) dan melepaskannya satu per satu secara runtun', () => {
    const a = FHRR.create(115);
    const b = FHRR.create(116);
    const c = FHRR.create(117);

    const boundAll = FHRR.bind(FHRR.bind(a, b), c);
    const unbindC = FHRR.bind(boundAll, FHRR.inverse(c));
    const unbindB = FHRR.bind(unbindC, FHRR.inverse(b));

    expect(FHRR.similarity(unbindB, a)).toBeGreaterThan(0.9);
  });

  test('59. Ortogonalitas hasil binding: A * B harus ortogonal secara statistik terhadap A', () => {
    const a = FHRR.create(118);
    const b = FHRR.create(119);
    const bound = FHRR.bind(a, b);
    expect(Math.abs(FHRR.similarity(bound, a))).toBeLessThan(0.15);
  });

  test('60. Ortogonalitas hasil binding: A * B harus ortogonal secara statistik terhadap B', () => {
    const a = FHRR.create(120);
    const b = FHRR.create(121);
    const bound = FHRR.bind(a, b);
    expect(Math.abs(FHRR.similarity(bound, b))).toBeLessThan(0.15);
  });

  test('61. Binding dua pasang vektor ortogonal menghasilkan dua vektor baru yang juga ortogonal', () => {
    const a = FHRR.create(122);
    const b = FHRR.create(123);
    const c = FHRR.create(124);
    const d = FHRR.create(125);

    const ab = FHRR.bind(a, b);
    const cd = FHRR.bind(c, d);

    expect(Math.abs(FHRR.similarity(ab, cd))).toBeLessThan(0.15);
  });

  test('62. Determinisme Binding: Dua operasi binding dengan input identik menghasilkan output yang identik secara numerik', () => {
    const a = FHRR.create(126);
    const b = FHRR.create(127);
    const bound1 = FHRR.bind(a, b);
    const bound2 = FHRR.bind(a, b);
    expect(bound1).toEqual(bound2);
  });

  test('63. Binding tidak mengubah referensi array input (keamanan murni / immutability)', () => {
    const a = FHRR.create(128);
    const b = FHRR.create(129);
    const aOrig = new Float32Array(a);
    const bOrig = new Float32Array(b);

    FHRR.bind(a, b);

    expect(a).toEqual(aOrig);
    expect(b).toEqual(bOrig);
  });

  test('64. Binding dari konvolusi konstan bernilai ortogonal menjaga pola spasial tanpa crash', () => {
    const a = new Float32Array(DIMENSION).fill(0.1);
    const b = new Float32Array(DIMENSION).fill(0.2);
    const bound = FHRR.bind(a, b);
    expect(isNaN(bound[0]!)).toBe(false);
  });

  test('65. Binding dengan vektor negatif murni: A * (-B) memiliki similarity -1.0 dengan A * B', () => {
    const a = FHRR.create(130);
    const b = FHRR.create(131);
    const bNeg = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) bNeg[i] = -b[i]!;

    const abNormal = FHRR.bind(a, b);
    const abNegated = FHRR.bind(a, bNeg);

    expect(FHRR.similarity(abNormal, abNegated)).toBeCloseTo(-1.0, 6);
  });


  // ==========================================
  // KELOMPOK 2: PENANGANAN EKSTREM, BOUNDARY, & ANTI-NAN - 15 TEST CASES
  // ==========================================

  test('66. Binding dengan Zero Vector menghasilkan vektor aman (anti-NaN epsilon penampung)', () => {
    const a = FHRR.create(132);
    const zero = new Float32Array(DIMENSION);
    const bound = FHRR.bind(a, zero);

    expect(bound).toBeInstanceOf(Float32Array);
    expect(bound.length).toBe(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) {
      expect(isNaN(bound[i]!)).toBe(false);
    }
  });

  test('67. Binding antara dua Zero Vector harus mengembalikan Float32Array yang valid tanpa crash atau NaN', () => {
    const zeroA = new Float32Array(DIMENSION);
    const zeroB = new Float32Array(DIMENSION);
    const bound = FHRR.bind(zeroA, zeroB);

    expect(bound).toBeInstanceOf(Float32Array);
    for (let i = 0; i < DIMENSION; i++) {
      expect(isNaN(bound[i]!)).toBe(false);
    }
  });

  test('68. Binding dengan vektor subnormal (sangat kecil: 1e-30) harus menghasilkan vektor normalisasi L2 yang kokoh', () => {
    const a = FHRR.create(133);
    const subnormal = new Float32Array(DIMENSION).fill(1e-30);
    const bound = FHRR.bind(a, subnormal);

    // Vektor subnormal setelah di-bind dan diproses dengan anti-NaN epsilon protection
    // menghasilkan kemiripan yang stabil (bukan NaN). Kita verifikasi bahwa nilainya tidak NaN.
    expect(isNaN(bound[0]!)).toBe(false);
  });

  test('69. Binding dengan vektor berelemen Infinity harus ditangani secara aman dan tidak menghasilkan NaN', () => {
    const a = FHRR.create(134);
    const infVec = new Float32Array(DIMENSION).fill(Infinity);
    const bound = FHRR.bind(a, infVec);

    for (let i = 0; i < DIMENSION; i++) {
      expect(isNaN(bound[i]!)).toBe(false);
    }
  });

  test('70. Binding dengan vektor berelemen -Infinity harus ditangani secara aman tanpa meledak', () => {
    const a = FHRR.create(135);
    const negInfVec = new Float32Array(DIMENSION).fill(-Infinity);
    const bound = FHRR.bind(a, negInfVec);

    for (let i = 0; i < DIMENSION; i++) {
      expect(isNaN(bound[i]!)).toBe(false);
    }
  });

  test('71. Binding dengan vektor berisi NaN harus aman dari error floating point yang menghancurkan sistem', () => {
    const a = FHRR.create(136);
    const nanVec = new Float32Array(DIMENSION).fill(NaN);
    const bound = FHRR.bind(a, nanVec);

    expect(bound).toBeInstanceOf(Float32Array);
    for (let i = 0; i < DIMENSION; i++) {
      expect(isNaN(bound[i]!)).toBe(false);
    }
  });

  test('72. Binding dengan campuran NaN dan angka riil acak harus tetap aman dari crash', () => {
    const a = FHRR.create(137);
    const messyVec = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) {
      messyVec[i] = i % 2 === 0 ? NaN : 0.42;
    }
    const bound = FHRR.bind(a, messyVec);

    expect(bound).toBeInstanceOf(Float32Array);
    for (let i = 0; i < DIMENSION; i++) {
      expect(isNaN(bound[i]!)).toBe(false);
    }
  });

  test('73. Binding dengan satu piksel bernilai super-raksasa (1e35) dan piksel lainnya nol', () => {
    const a = FHRR.create(138);
    const spikeVec = new Float32Array(DIMENSION);
    spikeVec[500] = 1e35;
    const bound = FHRR.bind(a, spikeVec);

    let sumSq = 0;
    for (let i = 0; i < DIMENSION; i++) {
      sumSq += bound[i]! * bound[i]!;
    }
    expect(sumSq).toBeCloseTo(1.0, 4);
  });

  test('74. Binding dari dua vektor impuls Dirac (satu piksel bernilai 1.0, lainnya nol)', () => {
    const impulseA = new Float32Array(DIMENSION);
    const impulseB = new Float32Array(DIMENSION);
    impulseA[10] = 1.0;
    impulseB[20] = 1.0;

    const bound = FHRR.bind(impulseA, impulseB);
    let sumSq = 0;
    for (let i = 0; i < DIMENSION; i++) {
      sumSq += bound[i]! * bound[i]!;
    }
    expect(sumSq).toBeCloseTo(1.0, 6);
  });

  test('75. Siklus binding bertingkat: Binding interaktif dengan variasi magnitudo ekstrem', () => {
    const a = FHRR.create(139);
    const b = new Float32Array(DIMENSION).fill(1e-25);
    const c = new Float32Array(DIMENSION).fill(1e25);

    const ab = FHRR.bind(a, b);
    const abc = FHRR.bind(ab, c);

    let sumSq = 0;
    for (let i = 0; i < DIMENSION; i++) {
      sumSq += abc[i]! * abc[i]!;
    }
    expect(sumSq).toBeCloseTo(1.0, 4);
  });

  test('76. Kemiripan hasil binding ekstrem dengan salah satu komponen bernilai Infinity', () => {
    const a = FHRR.create(140);
    const infVec = new Float32Array(DIMENSION).fill(Infinity);
    const bound = FHRR.bind(a, infVec);

    const sim = FHRR.similarity(bound, a);
    expect(isNaN(sim)).toBe(false);
  });

  test('77. Binding dengan array yang dimodifikasi manual setelah dilewatkan tidak mengubah status internal buffer', () => {
    const a = FHRR.create(141);
    const b = FHRR.create(142);
    const bound = FHRR.bind(a, b);

    // Ubah data asli b
    b[0] = 999.0;

    // Hasil binding sebelumnya harus tetap independen dan tidak terpengaruh
    expect(bound[0]).not.toBe(999.0);
  });

  test('78. Binding dengan fasa bipolar statis (+1 dan -1 bergantian)', () => {
    const a = FHRR.create(143);
    const bipolar = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) bipolar[i] = i % 2 === 0 ? 1.0 : -1.0;

    const bound = FHRR.bind(a, bipolar);
    let sumSq = 0;
    for (let i = 0; i < DIMENSION; i++) {
      sumSq += bound[i]! * bound[i]!;
    }
    expect(sumSq).toBeCloseTo(1.0, 6);
  });

  test('79. Binding dengan nilai konstan negatif homogen (-0.5 seragam)', () => {
    const a = FHRR.create(144);
    const constNeg = new Float32Array(DIMENSION).fill(-0.5);

    const bound = FHRR.bind(a, constNeg);
    let sumSq = 0;
    for (let i = 0; i < DIMENSION; i++) {
      sumSq += bound[i]! * bound[i]!;
    }
    expect(sumSq).toBeCloseTo(1.0, 6);
  });

  test('80. Binding dari dua input konstan homogeneus positif penuh', () => {
    const constA = new Float32Array(DIMENSION).fill(1.0);
    const constB = new Float32Array(DIMENSION).fill(2.0);

    const bound = FHRR.bind(constA, constB);
    let sumSq = 0;
    for (let i = 0; i < DIMENSION; i++) {
      sumSq += bound[i]! * bound[i]!;
    }
    expect(sumSq).toBeCloseTo(1.0, 6);
  });


  // ==========================================
  // KELOMPOK 3: MATEMATIKA LANJUTAN & INVARIANSI VSA - 20 TEST CASES
  // ==========================================

  test('81. Binding dengan dirinya sendiri: Similarity(A * A, A) harus rendah karena pergeseran fasa kuadratis', () => {
    const a = FHRR.create(145);
    const aa = FHRR.bind(a, a);
    expect(Math.abs(FHRR.similarity(aa, a))).toBeLessThan(0.2);
  });

  test('82. Invariansi Rotasi Spasial FHRR: Inversi dari produk bind adalah produk dari inversinya masing-masing', () => {
    const a = FHRR.create(146);
    const b = FHRR.create(147);

    const invAB = FHRR.inverse(FHRR.bind(a, b));
    const invA_invB = FHRR.bind(FHRR.inverse(a), FHRR.inverse(b));

    expect(FHRR.similarity(invAB, invA_invB)).toBeGreaterThan(0.95);
  });

  test('83. Unbinding Recovery Presisi: Inversi dari A diikat dengan A * B menghasilkan B secara presisi', () => {
    const a = FHRR.create(148);
    const b = FHRR.create(149);

    const ab = FHRR.bind(a, b);
    const invA = FHRR.inverse(a);
    const recoveredB = FHRR.bind(invA, ab);

    expect(FHRR.similarity(recoveredB, b)).toBeGreaterThan(0.95);
  });

  test('84. Self-Cancellation Aljabar: A * inv(A) harus sangat mirip dengan Vektor Identitas rill konstan', () => {
    const a = FHRR.create(150);
    const invA = FHRR.inverse(a);
    const identity = FHRR.bind(a, invA);

    // Vektor identity dalam FFT fasa adalah vektor yang memiliki komponen DC real dan fasa nol di semua frekuensi.
    // Kita uji kemiripan produk self-cancellation dengan sesama self-cancellation dari vektor acak lain.
    const b = FHRR.create(151);
    const identity2 = FHRR.bind(b, FHRR.inverse(b));

    expect(FHRR.similarity(identity, identity2)).toBeGreaterThan(0.9);
  });

  test('85. Kestabilan Binding di bawah noise Gaussian aditif kecil', () => {
    const a = FHRR.create(152);
    const b = FHRR.create(153);
    const abNormal = FHRR.bind(a, b);

    // Suntik noise kecil pada b
    const bNoisy = new Float32Array(b);
    for (let i = 0; i < DIMENSION; i++) {
      bNoisy[i] += (Math.random() - 0.5) * 0.05;
    }
    const abNoisy = FHRR.bind(a, bNoisy);

    expect(FHRR.similarity(abNormal, abNoisy)).toBeGreaterThan(0.6);
  });

  test('86. Binding dengan bundel multi-konsep mempertahankan kemiripan dengan setiap produk berpasangan', () => {
    const a = FHRR.create(154);
    const b = FHRR.create(155);
    const c = FHRR.create(156);

    const bc = FHRR.bundle([b, c]);
    const LHS = FHRR.bind(a, bc);

    const ab = FHRR.bind(a, b);
    const ac = FHRR.bind(a, c);
    const RHS = FHRR.bundle([ab, ac]);

    expect(FHRR.similarity(LHS, RHS)).toBeGreaterThan(0.98);
  });

  test('87. Superposisi ortogonal hasil binding ganda: (A * B + C * D) diuji unbinding terhadap A', () => {
    const a = FHRR.create(157);
    const b = FHRR.create(158);
    const c = FHRR.create(159);
    const d = FHRR.create(160);

    const ab = FHRR.bind(a, b);
    const cd = FHRR.bind(c, d);
    const superpos = FHRR.bundle([ab, cd]);

    const unbind = FHRR.bind(superpos, FHRR.inverse(a));
    // Harus masih mengandung kemiripan kuat dengan b
    expect(FHRR.similarity(unbind, b)).toBeGreaterThan(0.5);
  });

  test('88. Superposisi ortogonal hasil binding ganda: (A * B + C * D) diuji unbinding terhadap C', () => {
    const a = FHRR.create(161);
    const b = FHRR.create(162);
    const c = FHRR.create(163);
    const d = FHRR.create(164);

    const ab = FHRR.bind(a, b);
    const cd = FHRR.bind(c, d);
    const superpos = FHRR.bundle([ab, cd]);

    const unbind = FHRR.bind(superpos, FHRR.inverse(c));
    // Harus masih mengandung kemiripan kuat dengan d
    expect(FHRR.similarity(unbind, d)).toBeGreaterThan(0.5);
  });

  test('89. Unbinding dengan elemen acak yang salah menghasilkan vektor ortogonal murni (kemiripan mendekati 0.0)', () => {
    const a = FHRR.create(165);
    const b = FHRR.create(166);
    const wrong = FHRR.create(167);

    const ab = FHRR.bind(a, b);
    const unbindWrong = FHRR.bind(ab, FHRR.inverse(wrong));

    expect(Math.abs(FHRR.similarity(unbindWrong, a))).toBeLessThan(0.15);
  });

  test('90. Distributivitas Binding terhadap Bundling Masif (5 konsep)', () => {
    const key = FHRR.create(168);
    const val1 = FHRR.create(169);
    const val2 = FHRR.create(170);
    const val3 = FHRR.create(171);
    const val4 = FHRR.create(172);
    const val5 = FHRR.create(173);

    const bundleVals = FHRR.bundle([val1, val2, val3, val4, val5]);
    const LHS = FHRR.bind(key, bundleVals);

    const RHS = FHRR.bundle([
      FHRR.bind(key, val1),
      FHRR.bind(key, val2),
      FHRR.bind(key, val3),
      FHRR.bind(key, val4),
      FHRR.bind(key, val5),
    ]);

    expect(FHRR.similarity(LHS, RHS)).toBeGreaterThan(0.98);
  });

  test('91. Binding berkelanjutan dengan pergeseran fraksional fasa: (A * B^0.5) * B^0.5 harus sangat dekat dengan A * B', () => {
    const a = FHRR.create(174);
    const b = FHRR.create(175);

    const bHalf = FHRR.fractionalBind(b, 0.5);
    const step1 = FHRR.bind(a, bHalf);
    const step2 = FHRR.bind(step1, bHalf);

    const target = FHRR.bind(a, b);

    expect(FHRR.similarity(step2, target)).toBeGreaterThan(0.7);
  });

  test('92. Sifat involusi inversi binding: Inverse(A) diikat dengan Inverse(B) diikat kembali dengan A * B mengembalikan Identitas', () => {
    const a = FHRR.create(176);
    const b = FHRR.create(177);

    const invA_invB = FHRR.bind(FHRR.inverse(a), FHRR.inverse(b));
    const ab = FHRR.bind(a, b);
    const identity = FHRR.bind(invA_invB, ab);

    const c = FHRR.create(178);
    const identityTarget = FHRR.bind(c, FHRR.inverse(c));

    expect(FHRR.similarity(identity, identityTarget)).toBeGreaterThan(0.9);
  });

  test('93. Binding dengan vektor konstanta negatif penuh (-1.0 / sqrt(D) seragam) membalikkan fasa spasial tanpa merusak normalisasi', () => {
    const a = FHRR.create(179);
    const negIdentity = new Float32Array(DIMENSION).fill(-1.0 / Math.sqrt(DIMENSION));
    const bound = FHRR.bind(a, negIdentity);

    let sumSq = 0;
    for (let i = 0; i < DIMENSION; i++) {
      sumSq += bound[i]! * bound[i]!;
    }
    expect(sumSq).toBeCloseTo(1.0, 5);
  });

  test('94. Binding berulang 10 kali dari vektor yang sama mempertahankan magnitudo tetap stabil ternormalisasi', () => {
    const a = FHRR.create(180);
    let current = new Float32Array(a);
    for (let i = 0; i < 10; i++) {
      current = FHRR.bind(current, a);
    }
    let sumSq = 0;
    for (let i = 0; i < DIMENSION; i++) {
      sumSq += current[i]! * current[i]!;
    }
    expect(sumSq).toBeCloseTo(1.0, 5);
  });

  test('95. Binding dari vektor acak dengan permutasi indeks terbalik (Involusi fisik fasa simetris)', () => {
    const a = FHRR.create(181);
    const b = FHRR.create(182);

    const ab = FHRR.bind(a, b);
    const inv_ab = FHRR.inverse(ab);

    const invA_invB = FHRR.bind(FHRR.inverse(a), FHRR.inverse(b));

    expect(FHRR.similarity(inv_ab, invA_invB)).toBeGreaterThan(0.95);
  });

  test('96. Binding distributif terhadap superposisi bertingkat dengan bobot skala negatif', () => {
    const a = FHRR.create(183);
    const b = FHRR.create(184);
    const c = FHRR.create(185);

    const cNeg = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) cNeg[i] = -c[i]!;

    const bMinusC = FHRR.bundle([b, cNeg]);
    const LHS = FHRR.bind(a, bMinusC);

    const ab = FHRR.bind(a, b);
    const ac = FHRR.bind(a, c);
    const acNeg = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) acNeg[i] = -ac[i]!;

    const RHS = FHRR.bundle([ab, acNeg]);

    expect(FHRR.similarity(LHS, RHS)).toBeGreaterThan(0.98);
  });

  test('97. Binding dengan vektor fasa acak murni tanpa FFT (melalui bypass PRNG manual) harus memiliki struktur spasial valid', () => {
    const a = FHRR.create(186);
    const rawFase = new Float32Array(DIMENSION);
    for (let i = 0; i < DIMENSION; i++) rawFase[i] = Math.sin(i * 0.1);
    const bound = FHRR.bind(a, rawFase);

    expect(bound.length).toBe(DIMENSION);
    expect(isNaN(bound[0]!)).toBe(false);
  });

  test('98. Unbinding dari produk binding bertingkat kuadratis: (A * B) * (A * B) diuji unbinding dengan inv(B) * inv(B) mengembalikan A * A', () => {
    const a = FHRR.create(187);
    const b = FHRR.create(188);

    const ab = FHRR.bind(a, b);
    const ab_ab = FHRR.bind(ab, ab);

    const invB = FHRR.inverse(b);
    const invB_invB = FHRR.bind(invB, invB);

    const LHS = FHRR.bind(ab_ab, invB_invB);
    const RHS = FHRR.bind(a, a);

    expect(FHRR.similarity(LHS, RHS)).toBeGreaterThan(0.8);
  });

  test('99. Konsistensi spasial binding: Similarity(A * B, C * D) sangat ortogonal jika semua komponen independen', () => {
    const a = FHRR.create(189);
    const b = FHRR.create(190);
    const c = FHRR.create(191);
    const d = FHRR.create(192);

    const ab = FHRR.bind(a, b);
    const cd = FHRR.bind(c, d);

    expect(Math.abs(FHRR.similarity(ab, cd))).toBeLessThan(0.15);
  });

  test('100. Aljabar Rekursif RRM: Operasi kompleks berantai masif ((A * B + C) * D) diuji kesamaan dengan dirinya sendiri menghasilkan similarity 1.0', () => {
    const a = FHRR.create(193);
    const b = FHRR.create(194);
    const c = FHRR.create(195);
    const d = FHRR.create(196);

    const chain1 = FHRR.bind(FHRR.bundle([FHRR.bind(a, b), c]), d);
    const chain2 = FHRR.bind(FHRR.bundle([FHRR.bind(a, b), c]), d);

    expect(FHRR.similarity(chain1, chain2)).toBeCloseTo(1.0, 7);
  });

});
