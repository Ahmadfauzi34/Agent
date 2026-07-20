import { describe, test, expect } from 'vitest';
import { seededRandom } from '../rrm_src/core/fhrr';

describe('seededRandom 50 Comprehensive Robustness Test Suite', () => {

  // ==========================================
  // KELOMPOK 1: DETERMINISM & SEED RESETTING (1-10)
  // ==========================================

  test('1. Menyetel seed yang sama harus menghasilkan output pertama yang persis identik', () => {
    const val1 = seededRandom(42);
    const val2 = seededRandom(42);
    expect(val1).toBe(val2);
  });

  test('2. Menyetel seed yang sama harus menghasilkan sequence 5 angka yang persis identik', () => {
    const seq1 = [seededRandom(100), seededRandom(), seededRandom(), seededRandom(), seededRandom()];
    const seq2 = [seededRandom(100), seededRandom(), seededRandom(), seededRandom(), seededRandom()];
    expect(seq1).toEqual(seq2);
  });

  test('3. sequence tanpa customSeed harus deterministik berlanjut dari state internal saat itu', () => {
    seededRandom(1234);
    const a = seededRandom();
    const b = seededRandom();
    const c = seededRandom();

    // Reset ke seed yang sama, sequence berikutnya harus sama
    seededRandom(1234);
    expect(seededRandom()).toBe(a);
    expect(seededRandom()).toBe(b);
    expect(seededRandom()).toBe(c);
  });

  test('4. Panggilan berturut-turut tanpa customSeed harus menghasilkan nilai yang berbeda (non-statis)', () => {
    seededRandom(99);
    const val1 = seededRandom();
    const val2 = seededRandom();
    const val3 = seededRandom();
    expect(val1).not.toBe(val2);
    expect(val2).not.toBe(val3);
  });

  test('5. Reset berulang-ulang pada loop dengan seed yang sama menghasilkan nilai awal yang identik', () => {
    const expected = seededRandom(777);
    for (let i = 0; i < 20; i++) {
      expect(seededRandom(777)).toBe(expected);
    }
  });

  test('6. sequence dari seed A tidak boleh sama dengan sequence dari seed B (independensi)', () => {
    const seqA = [seededRandom(5), seededRandom(), seededRandom()];
    const seqB = [seededRandom(6), seededRandom(), seededRandom()];
    expect(seqA).not.toEqual(seqB);
  });

  test('7. customSeed yang tidak diberikan (undefined) tidak boleh me-reset sequence jika sudah berjalan', () => {
    seededRandom(50);
    const first = seededRandom();
    const second = seededRandom(undefined); // Sesuai type signature, undefined diabaikan untuk reset seed
    const third = seededRandom();

    // Reset seed 50 dan jalankan tanpa interupsi undefined
    seededRandom(50);
    const firstRef = seededRandom();
    const secondRef = seededRandom();
    const thirdRef = seededRandom();

    expect(first).toBe(firstRef);
    expect(second).toBe(secondRef);
    expect(third).toBe(thirdRef);
  });

  test('8. sequence resetting pada seed besar (100000) dan kecil (1) berperilaku deterministik sempurna', () => {
    const seq1 = [seededRandom(100000), seededRandom()];
    const seq2 = [seededRandom(100000), seededRandom()];
    expect(seq1).toEqual(seq2);

    const seq3 = [seededRandom(1), seededRandom()];
    const seq4 = [seededRandom(1), seededRandom()];
    expect(seq3).toEqual(seq4);
  });

  test('9. determinisme sekuensial setelah disisipi pemanggilan seed lain di tengah jalan', () => {
    seededRandom(10);
    const a1 = seededRandom();
    seededRandom(20); // Interupsi seed lain
    seededRandom(10); // Kembalikan ke seed 10
    const a2 = seededRandom();
    expect(a1).toBe(a2);
  });

  test('10. sequence multi-iterasi (100 panggilan) harus identik saat direduplikasi', () => {
    seededRandom(55);
    const list1 = Array.from({ length: 100 }, () => seededRandom());

    seededRandom(55);
    const list2 = Array.from({ length: 100 }, () => seededRandom());

    expect(list1).toEqual(list2);
  });


  // ==========================================
  // KELOMPOK 2: BOUNDARY & EXTREME CUSTOM SEED VALUES (11-20)
  // ==========================================

  test('11. customSeed bernilai NaN harus ditangani dengan aman dan fallback ke seed 42', () => {
    // NaN fallback ke seed 42
    const nanVal = seededRandom(NaN);
    const refVal = seededRandom(42);
    expect(nanVal).toBe(refVal);
  });

  test('12. customSeed bernilai Infinity harus ditangani dengan aman dan fallback ke seed 42', () => {
    const infVal = seededRandom(Infinity);
    const refVal = seededRandom(42);
    expect(infVal).toBe(refVal);
  });

  test('13. customSeed bernilai -Infinity harus ditangani dengan aman dan fallback ke seed 42', () => {
    const negInfVal = seededRandom(-Infinity);
    const refVal = seededRandom(42);
    expect(negInfVal).toBe(refVal);
  });

  test('14. customSeed berupa float super besar (1e308) harus di-clamp / ditangani aman dengan modulo 32-bit tanpa overflow crash', () => {
    // 1e308 tidak terhingga bagi integer aman, tetapi IsFinite mengembalikannya true.
    // seed = Math.abs(Math.trunc(1e308)) % 2147483647
    const val = seededRandom(1e308);
    expect(typeof val).toBe('number');
    expect(Number.isFinite(val)).toBe(true);
    expect(isNaN(val)).toBe(false);
  });

  test('15. customSeed bernilai negatif harus ditangani secara aman dengan mengambil nilai absolutnya', () => {
    const valNeg = seededRandom(-100);
    const valPos = seededRandom(100);
    expect(valNeg).toBe(valPos);
  });

  test('16. customSeed berupa float pecahan (42.5) di-truncasi menjadi integer aman secara otomatis', () => {
    const valFloat = seededRandom(42.5);
    const valInt = seededRandom(42);
    expect(valFloat).toBe(valInt);
  });

  test('17. customSeed bernilai 0 (nol) harus menghasilkan angka acak deterministik yang valid', () => {
    const val1 = seededRandom(0);
    const val2 = seededRandom(0);
    expect(val1).toBe(val2);
    expect(typeof val1).toBe('number');
    expect(isNaN(val1)).toBe(false);
  });

  test('18. customSeed bernilai minus nol (-0.0) harus diperlakukan sama dengan 0', () => {
    const valMinusZero = seededRandom(-0.0);
    const valZero = seededRandom(0);
    expect(valMinusZero).toBe(valZero);
  });

  test('19. customSeed di atas batas integer aman 32-bit (2147483648) harus dimodulo secara aman', () => {
    const seedBig = 2147483648 + 5; // Luapan 32-bit modulo
    const valBig = seededRandom(seedBig);
    const valMod = seededRandom(seedBig % 2147483647);
    expect(valBig).toBe(valMod);
  });

  test('20. customSeed bernilai negatif di bawah batas safe integer JS (-9007199254740991) ditangani secara aman', () => {
    const val = seededRandom(-9007199254740991);
    expect(typeof val).toBe('number');
    expect(isNaN(val)).toBe(false);
  });


  // ==========================================
  // KELOMPOK 3: RANGE & DISTRIBUTION PROPERTIES (21-30)
  // ==========================================

  test('21. Semua output seededRandom harus strictly berada dalam rentang [0, 1)', () => {
    seededRandom(1);
    for (let i = 0; i < 1000; i++) {
      const val = seededRandom();
      expect(val).toBeGreaterThanOrEqual(0.0);
      expect(val).toBeLessThan(1.0);
    }
  });

  test('22. Output seededRandom tidak boleh bernilai persis 1.0 (mencegah out-of-bounds index)', () => {
    seededRandom(12345);
    for (let i = 0; i < 5000; i++) {
      expect(seededRandom()).not.toBe(1.0);
    }
  });

  test('23. Output seededRandom berupa float dengan presisi tinggi', () => {
    seededRandom(42);
    const val = seededRandom();
    // Harapannya bukan bilangan bulat kecuali jika kebetulan persis 0
    if (val !== 0) {
      expect(Number.isInteger(val)).toBe(false);
    }
  });

  test('24. Rata-rata (mean) dari 10.000 panggilan seededRandom mendekati 0.5 (distribusi seragam)', () => {
    seededRandom(101);
    let sum = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) {
      sum += seededRandom();
    }
    const mean = sum / N;
    // Toleransi distribusi seragam pada N=10000
    expect(mean).toBeCloseTo(0.5, 1);
  });

  test('25. Variansi dari 10.000 panggilan seededRandom mendekati 1/12 ≈ 0.0833', () => {
    seededRandom(202);
    const N = 10000;
    const vals = Array.from({ length: N }, () => seededRandom());
    const mean = vals.reduce((s, v) => s + v, 0) / N;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / N;

    // Variansi teoretis distribusi seragam adalah 1/12 ≈ 0.0833
    expect(variance).toBeCloseTo(0.0833, 1);
  });

  test('26. Flatness check: pembagian rata ke 4 interval [0, 0.25), [0.25, 0.5), [0.5, 0.75), [0.75, 1.0)', () => {
    seededRandom(303);
    const buckets = [0, 0, 0, 0];
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const val = seededRandom();
      const idx = Math.floor(val * 4);
      buckets[idx]++;
    }
    // Setiap bucket harus menampung sekitar ~1000 nilai dengan toleransi wajar
    for (const count of buckets) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });

  test('27. Nilai minimum teoretis (0.0) aman dan tidak menghasilkan luapan pembagian', () => {
    // Formula: (seed - 1) / 2147483646
    // Jika seed internal bernilai 1, maka output adalah 0.0.
    // Mari kita cek bahwa output dapat bernilai sangat dekat dengan 0 dan tetap aman.
    seededRandom(1);
    let minObserved = 1.0;
    for (let i = 0; i < 100; i++) {
      const val = seededRandom();
      if (val < minObserved) minObserved = val;
    }
    expect(minObserved).toBeGreaterThanOrEqual(0.0);
  });

  test('28. Perilaku seededRandom di bawah pembebanan 100.000 panggilan berturut-turut tanpa memicu NaN atau Infinity', () => {
    seededRandom(999);
    for (let i = 0; i < 100000; i++) {
      const val = seededRandom();
      expect(Number.isFinite(val)).toBe(true);
      expect(isNaN(val)).toBe(false);
    }
  });

  test('29. Menyetel seed dengan float yang sangat kecil (1e-35) menghasilkan sequence valid', () => {
    const val = seededRandom(1e-35); // Math.trunc(1e-35) adalah 0
    const valZero = seededRandom(0);
    expect(val).toBe(valZero);
  });

  test('30. sequence flat spectrum tidak mengandung pola periodik pendek di antara 20 panggilan awal', () => {
    seededRandom(12);
    const seq = Array.from({ length: 20 }, () => seededRandom());
    const unique = new Set(seq);
    expect(unique.size).toBe(20); // Semua 20 nilai harus unik
  });


  // ==========================================
  // KELOMPOK 4: COLLISION PREVENTION & PERIODICITY (31-40)
  // ==========================================

  test('31. Seed 42 vs Seed 43: sequence fasa harus berbeda sejak elemen pertama', () => {
    const v1 = seededRandom(42);
    const v2 = seededRandom(43);
    expect(v1).not.toBe(v2);
  });

  test('32. sequence fasa dari dua seed berturut-turut yang sangat besar (2147483640 vs 2147483641) harus berbeda', () => {
    const v1 = seededRandom(2147483640);
    const v2 = seededRandom(2147483641);
    expect(v1).not.toBe(v2);
  });

  test('33. Seed negatif berturut-turut (-100 vs -101) menghasilkan sequence unik', () => {
    const v1 = [seededRandom(-100), seededRandom()];
    const v2 = [seededRandom(-101), seededRandom()];
    expect(v1).not.toEqual(v2);
  });

  test('34. Periodisitas minimal: sequence tidak boleh berulang dalam 2000 panggilan pertama', () => {
    seededRandom(500);
    const seq = Array.from({ length: 2000 }, () => seededRandom());
    const unique = new Set(seq);
    expect(unique.size).toBe(2000); // Harus 100% unik tanpa repetisi nilai float presisi tinggi
  });

  test('35. Pencegahan tabrakan (Collision): 1000 seed acak berbeda menghasilkan nilai awal unik', () => {
    const initialVals = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      initialVals.add(seededRandom(i));
    }
    // Ada kemungkinan kecil tabrakan modulo, tapi bagi LCG 32-bit murni harus 100% unik untuk 1000 seed pertama
    expect(initialVals.size).toBe(1000);
  });

  test('36. State internal tidak terpengaruh oleh urutan pembuatan instansiasi seed eksternal', () => {
    const valA1 = seededRandom(88);
    const valB1 = seededRandom(99);

    const valB2 = seededRandom(99);
    const valA2 = seededRandom(88);

    expect(valA1).toBe(valA2);
    expect(valB1).toBe(valB2);
  });

  test('37. Menyetel seed string kosong / invalid type casting lewat bypass TS ke number', () => {
    // Kita simulasikan parameter undefined/NaN yang bertindak sebagai fallback
    const valInvalid = seededRandom(undefined);
    expect(typeof valInvalid).toBe('number');
  });

  test('38. consecutive seed generation: seed_n+1 = (seed_n * 16807) % 2147483647 tidak macet di angka 0', () => {
    seededRandom(1);
    for (let i = 0; i < 100; i++) {
      const val = seededRandom();
      expect(val).not.toBe(0.0); // Karena seed internal tidak akan pernah 1 lagi di langkah berikutnya (pasti bilangan besar % prime)
    }
  });

  test('39. output acak tidak memiliki kecenderungan naik atau turun yang konstan (non-monotonisitas)', () => {
    seededRandom(333);
    let inc = 0, dec = 0;
    let prev = seededRandom();
    for (let i = 0; i < 100; i++) {
      const curr = seededRandom();
      if (curr > prev) inc++;
      else dec++;
      prev = curr;
    }
    // Perubahan naik vs turun harus seimbang (tidak mungkin naik terus atau turun terus)
    expect(inc).toBeGreaterThan(30);
    expect(dec).toBeGreaterThan(30);
  });

  test('40. sequence dua seed simetris (x dan 2147483647 - x) menghasilkan sequence yang berbeda', () => {
    const x = 1234567;
    const seq1 = [seededRandom(x), seededRandom()];
    const seq2 = [seededRandom(2147483647 - x), seededRandom()];
    expect(seq1).not.toEqual(seq2);
  });


  // ==========================================
  // KELOMPOK 5: INTERNAL MATHEMATICAL STATE & TRUNCATION (41-50)
  // ==========================================

  test('41. Verifikasi rumus dasar LCG: seed 1 menghasilkan (1 * 16807) % 2147483647 = 16807 sebagai seed berikutnya', () => {
    // Formula output: (seed_next - 1) / 2147483646
    // Untuk seed awal = 1, seed_next = 16807.
    // Maka output = (16807 - 1) / 2147483646 = 16806 / 2147483646 ≈ 7.8259e-6
    const val = seededRandom(1);
    expect(val).toBeCloseTo(16806 / 2147483646, 12);
  });

  test('42. Verifikasi langkah kedua LCG: seed awal 1 menghasilkan langkah kedua (16807 * 16807) % 2147483647 = 282475249', () => {
    // seed_next_next = 282475249
    // output = (282475249 - 1) / 2147483646 = 282475248 / 2147483646 ≈ 0.131537
    seededRandom(1); // Melakukan seeding awal 1 dan langsung menghasilkan langkah pertama
    const valStep2 = seededRandom(); // Melakukan langkah kedua
    expect(valStep2).toBeCloseTo(282475248 / 2147483646, 12);
  });

  test('43. Math.trunc rounding behavior: customSeed 0.999999 menghasilkan truncasi 0', () => {
    const valFloat = seededRandom(0.999999);
    const valZero = seededRandom(0);
    expect(valFloat).toBe(valZero);
  });

  test('44. Math.trunc rounding behavior: customSeed -0.999999 menghasilkan truncasi 0', () => {
    const valFloat = seededRandom(-0.999999);
    const valZero = seededRandom(0);
    expect(valFloat).toBe(valZero);
  });

  test('45. customSeed bernilai kelipatan prima besar modulo 2147483647 menghasilkan sequence yang sesuai modulo', () => {
    const primeMult = 2147483647 * 3 + 12345;
    const valMult = seededRandom(primeMult);
    const valMod = seededRandom(12345);
    expect(valMult).toBe(valMod);
  });

  test('46. sequence LCG deterministik tidak pernah menghasilkan nilai NaN pada state internal mana pun', () => {
    seededRandom(0);
    for (let i = 0; i < 1000; i++) {
      expect(isNaN(seededRandom())).toBe(false);
    }
  });

  test('47. sequence LCG deterministik tidak pernah menghasilkan Infinity pada state internal mana pun', () => {
    seededRandom(1);
    for (let i = 0; i < 1000; i++) {
      expect(Number.isFinite(seededRandom())).toBe(true);
    }
  });

  test('48. customSeed berupa integer maksimal JavaScript (9007199254740991) menghasilkan nilai deterministik yang presisi', () => {
    const val1 = seededRandom(9007199254740991);
    const val2 = seededRandom(9007199254740991);
    expect(val1).toBe(val2);
  });

  test('49. customSeed berupa bilangan negatif minimal JavaScript (-9007199254740991) menghasilkan nilai deterministik yang presisi', () => {
    const val1 = seededRandom(-9007199254740991);
    const val2 = seededRandom(-9007199254740991);
    expect(val1).toBe(val2);
  });

  test('50. Konsistensi state internal setelah 1 juta iterasi tetap menghasilkan angka di dalam range [0, 1) murni', () => {
    seededRandom(42);
    // Jalankan 1.000.000 iterasi dengan sangat cepat (operasi LCG sederhana)
    for (let i = 0; i < 1000000; i++) {
      seededRandom();
    }
    const val = seededRandom();
    expect(val).toBeGreaterThanOrEqual(0.0);
    expect(val).toBeLessThan(1.0);
  });

});
