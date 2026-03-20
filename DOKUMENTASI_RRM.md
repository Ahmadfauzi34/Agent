# 🌌 RECURSIVE REASONING MACHINE (RRM) - DOKUMENTASI RESMI

Selamat datang di jantung arsitektur **Quantum Tensor AI** untuk penyelesaian masalah Abstraction and Reasoning Corpus (ARC).

RRM bukanlah program tradisional berbasis logika `if-else` atau heuristik kaku. RRM adalah "Mesin Pikiran" yang mensimulasikan gelombang informasi (VSA/FHRR), fisika partikel (Entanglement & Swarm Dynamics), dan pencarian masa depan paralel (MCTS) murni melalui perhitungan matematika kontinu.

---

## 📜 1. FILOSOFI DASAR: THE BLACK BOOK ("DOSA ARSITEKTUR")
Keseluruhan mesin RRM dibangun di atas prinsip optimasi ekstrem untuk mesin V8 (Node.js). Hal-hal berikut diharamkan dalam `rrm_src`:

1.  **Dosa OOP (Array of Objects):** RRM tidak menggunakan kelas seperti `class Entity { x, y, color }`. RRM menggunakan **Entity Component System (ECS) / Structure of Arrays (SoA)** via `EntityManifold.ts`. Semua data berwujud satu `Float32Array` raksasa yang diakses dengan offset memori berurutan ($O(1)$ L1 Cache Hit).
2.  **Dosa Garbage Collection (GC):** RRM tidak pernah memanggil `new Array()`, `.push()`, atau `.splice()` di dalam hot-loop (seperti saat pencarian MCTS). Sebagai gantinya, RRM menggunakan pre-allocated buffer dan `TypedArray.subarray()` yang hanya membuat "jendela pandang" (pointer view) tanpa menyalin memori ($O(1)$).
3.  **Dosa Percabangan (Branchless Math):** `if-else` mematikan *Branch Predictor* CPU pada komputasi tensor 8192-D. RRM menggantinya dengan aljabar murni. Contoh: `val = (val * (1 - isBetter)) + (newVal * isBetter)`. Catatan: RRM menggunakan default `-999.0` (bukan `-Infinity`) untuk mencegah ledakan *NaN* (Dosa 6).
4.  **Dosa Isotropik (Kotak Disangka Lingkaran):** RRM tidak menggunakan jari-jari (`spread`) tunggal, melainkan *Anisotropic Bounding Boxes* (`spansX` & `spansY`) agar deteksi tabrakan presisi terhadap objek memanjang.

---

## ⚙️ 2. SIKLUS TERMODINAMIKA RRM (4 FASE)
Siklus pikiran agen diatur secara terpusat oleh **`RRM_Agent.ts`**.

### Fase 1: PERCEIVE (Pengamatan)
*   **`UniversalManifold.ts`**: Menerima kisi 2D (piksel ARC) dan memetakannya menjadi Vektor Superposisi 8192-D menggunakan fraksi matematika kontinu (FHRR Binding). Mesin agnostik; ia tidak tahu sedang melihat gambar, ia hanya melihat energi fasa.
*   **`EntitySegmenter.ts`**: Alih-alih melakukan *flood-fill* gaya lama (DFS/BFS CPU-heavy), ia menggunakan *Generative Prior* (Karl Friston's Active Inference). Piksel dikelompokkan ke dalam EntityManifold berdasarkan Kemiripan Kosinus (Cosine Similarity) dari tensor-nya.

### Fase 2: RESONATE (Penyelarasan Topologi)
*   **`TopologicalAligner.ts`**: Cortex RRM yang memecahkan *Correspondence Problem* (Benda A di input berubah menjadi Benda B di output). Ia mengekstrak translasi absolut (deltaX, deltaY) dan bereksperimen dengan 4 probabilitas kuantum (Identity, Mirror X, Mirror Y, Mirror XY) tanpa logika `if-else` statis. Perbedaan (*delta*) disimpan sebagai **Axiom** (Hukum Alam).

### Fase 3: EVOLVE (Deep Active Inference / Mesin Waktu MCTS)
*   **`MultiverseSandbox.ts`**: Mesin simulasi masa depan. Menyediakan ruang untuk ribuan *universe* menggunakan *Zero-GC Memcpy* (`Float32Array.set()`).
*   **Time-Traveling Binding**: Menggabungkan seluruh rentetan langkah aksi agen ke dalam 1 tensor tunggal `TIME_SEED` tanpa alokasi memori berlebih.
*   **`HamiltonianPruner.ts`**: Kumpulan hipotesis (Axiom) dimasukkan ke sini. Aksioma yang salah/buruk akan musnah secara otomatis melalui Peluruhan Termodinamika (MDL) dan Interferensi Destruktif (*The Eraser*).

### Fase 4: COLLAPSE (Runtuhnya Fungsi Gelombang)
*   **`HologramDecoder.ts`**: Setelah MCTS menemukan rute terbaik, *sandbox winner* di-memcpy langsung ke *test manifold* (Route B). Decoder bertugas membaca tensor 8192-D dari setiap entitas untuk merender ulang kisi 2D menggunakan probe warna dan *True Quantum Z-Buffer* (mencegah overwrite/clipping).

---

## 🧬 3. SISTEM KOGNITIF LANJUTAN

### A. Logic Seed Bank & Hybrid Approach
Alih-alih menyuntikkan (Dependency Injection) mesin persepsi yang berat ke dalam Sandbox, RRM menggunakan **Seed Bank Pattern**.
*   **`CoreSeeds.ts`**: Menyimpan benih absolut (`X_AXIS_SEED`, `Y_AXIS_SEED`).
*   **`logic-seed-bank.ts`**: Memori jangka panjang (Long-Term Memory). Aksioma yang sudah dipelajari (misal: "Geser ke Kiri") disimpan. Ia menggunakan **Locality Sensitive Hashing (LSH)**, LRU Cache, dan loop unrolling SIMD agar mesin dapat mengingat miliaran aturan secara $O(1)$.
*   **Seed Macro Composition**: Mesin dapat merakit aturan *"Pindah Kanan DAN Ubah Warna"* murni dengan mengalikan matriks fasa, menghancurkan kewajiban menulis banyak kode untuk multi-aksi.

### B. Grover Diffusion System (Pencari Kuantum)
Jika MCTS bingung memilih antara 4 hipotesis terbaik, **`GroverDiffusionSystem.ts`** diaktifkan.
Algoritma komputasi kuantum (Real-Valued) ini menggunakan *Warm Start* (Amplitudo berbias dari skor energi, bukan probabilitas merata). Ia menjalankan *Continuous Free Energy Oracle*, di mana kandidat salah fasanya dibalik (Inversion About Mean), sehingga jawaban yang benar meledak amplifikasinya secara absolut.

---

## ⚛️ 4. FISIKA GEROMBOLAN & ENTANGLEMENT

### A. Fisika Efek Domino (Kausalitas Relasional)
Di `MultiverseSandbox`, aksioma tidak hanya menggerakkan benda dalam ruang hampa.
Jika Entitas A ditranslasikan dan menabrak Entitas B (lewat *branchless AABB collision*), Entitas B menjadi "Terjerat" (Entangled).
Sandbox kemudian menggunakan `CoreSeeds` secara instan (*on-the-fly*) untuk membangkitkan tensor spasial yang baru untuk B, membuat B terdorong bersama A tanpa error rendering (*clipping*).

### B. Swarm Dynamics (Multiverse Partikel)
**`SwarmDynamics.ts`**: Simulasi gerombolan murni (seperti tumpukan pasir jatuh / gravitasi / fluida).
Memanfaatkan `TypedArray.subarray()`, RRM dapat menginstruksikan ribuan sub-agen untuk turun secara paralel. Ia melakukan cek blokade ke lantai atau ke agen lain, dan yang bebas langsung dikalikan dengan matriks pergeseran dari CoreSeeds. Semua ini terjadi dalam $O(1)$ Memory tanpa memicu *Garbage Collection* di V8.

---

*Didokumentasikan oleh RRM System. Tidak ada halusinasi objek, yang ada hanyalah interferensi tensor dan keruntuhan fasa energi.*
