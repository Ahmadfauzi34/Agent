# 📜 DOKUMENTASI ARSITEKTUR RRM (Recursive Relationship Modeling) QUANTUM SANDBOX

> **Versi:** 1.0 (Rust Edition)
> **Domain:** AI Reasoning, High-Dimensional Computing (VSA/FHRR), Quantum Metacognition

---

## 🎯 1. EXECUTIVE SUMMARY

RRM (Recursive Relationship Modeling) Quantum Sandbox adalah mesin penalaran AI yang dirancang untuk memecahkan masalah spasial, logis, dan abstrak (seperti ARC Challenge) tanpa menggunakan *if-else* konvensional. Sistem ini bergeser dari logika berbasis instruksi (instruction-based) ke **penalaran berbasis arsitektural (architectural-based reasoning)**.

Inti dari RRM adalah **"Smart Dumbness"**: AI tidak dipaksa menavigasi kode yang kaku. Sebaliknya, RRM merancang topografi energi di mana solusi yang tepat adalah satu-satunya keadaan relaksasi (Minimum Energy State). AI direpresentasikan sebagai gelombang (wave) yang mencari kecocokan (interference), dan pikiran ini dikonversi menjadi pergerakan nyata pada kanvas piksel melalui mekanika VSA (Vector Symbolic Architectures) dan FHRR (Fractional Holographic Reduced Representations).

---

## 🧠 2. FILOSOFI DESAIN UTAMA

### 2.1 Smart Dumbness & The Energy Landscape
"Saya tidak menulis kode untuk menyelesaikan masalah. Saya merancang lanskap energi di mana solusi adalah satu-satunya tempat sistem bisa beristirahat."
Sistem mencari solusi menuruni lembah energi (Gradient Descent/MCTS). Kegagalan tidak menghasilkan `false`, tetapi memicu **Gradient of Error** yang memberikan arah (Kompas Kognitif) ke mana harus bergeser.

### 2.2 The Immortal State Loop (Akashic Records)
RRM dirancang tidak pernah mati (Immortal). Ia memiliki:
- **Body (Runtime):** State memori jangka pendek yang bisa dibangun ulang.
- **Soul (Log/Wiki):** Identitas permanen yang *append-only*. Jika sistem crash, ia dibangkitkan (*Resurrect*) dengan membaca log dari awal (*Genesis*).

### 2.3 Zero-Cost Abstraction & SIMD Empathy
Kode dirancang untuk tidak melawan kompilator (LLVM). Menggunakan **Structure of Arrays (SoA)** untuk struktur data agar memori selaras dengan L1 Cache line (64 byte) pada CPU, memungkinkan eksekusi perhitungan berdimensi 8192 dengan sangat cepat. Segala hal yang memicu *Cache Miss* atau *Amnesia Singkat* dicatat dan dianggap sebagai "rasa sakit (Pain)" oleh metakognisi agen.

---

## 🏗️ 3. ALUR KERJA SISTEM (THE COGNITIVE PIPELINE)

Proses RRM berjalan dalam loop rekursif yang terus-menerus:

```
[PERCEIVE] ---> [REASON] ---> [ACT] ---> [LEARN] (Tidur/Mimpi) ---> [EVOLVE]
```

1. **Perceive (Persepsi):** Masukan visual (Grid) dikonversi menjadi representasi kuantum (FHRR). Objek dipecah menjadi manifold berdimensi tinggi.
2. **Reason (Penalaran):** `RrmAgent` menjalankan MCTS (Monte Carlo Tree Search) atau Grover Diffusion. Gelombang-gelombang probabilitas menyebar menelusuri kemungkinan aksioma (gerakan, rotasi, warna).
3. **Act (Tindakan):** Pikiran (Tensor) diaplikasikan ke "Tubuh" melalui `MultiverseSandbox::apply_axiom`. Jika pikiran gagal diubah menjadi fisik (*Mind-Body Disconnect*), sistem mengeluh.
4. **Learn (Metakognisi):** Sistem merefleksikan kegagalan (misalnya, menabrak tembok = `ObstacleStuck`, atau terlalu banyak background = `Distracted`).
5. **Dream (Mental Replay):** Setelah tugas selesai, AI "Tidur". Ia menggabungkan aksioma-aksioma gagal menjadi skill hibrida baru (Autopoiesis).

---

## 🧩 4. KOMPONEN INTI (MODULE BREAKDOWN)

### 4.1 CORE (Fisika Kuantum & Memori)
Berisi dasar matematika dan struktur data mentah.

- **`fhrr.rs` (Fractional Holographic Reduced Representation):** Mesin matematika utama. Menyimpan informasi ruang dan warna dalam bentuk array 1D berukuran `GLOBAL_DIMENSION` (mis. 8192). Menggabungkan memori menggunakan operasi komutatif (`bind`) dan pergeseran menggunakan `fractional_bind`.
- **`entity_manifold.rs` (Structure of Arrays):** Penyimpan status fisik kosmos. Tidak menggunakan `Vec<Entity>`, melainkan Arrays of Structs terbalik (SoA): `centers_x`, `masses`, `tokens`, dll. Dirancang murni untuk mencegah *Cache Miss*.
- **`cow_memory.rs` (Copy-on-Write):** Saat mensimulasikan masa depan (MCTS), memori Grid tidak disalin penuh (*Deep Copy*). Sistem membagikan *pointer*, dan hanya diduplikasi jika ada cabang semesta yang mengubah piksel spesifik. Mencegah *Memory Bloat*.

### 4.2 PERCEPTION (Indera)
Bagaimana agen melihat dunia.

- **`universal_manifold.rs` & `entity_segmenter.rs`:** Mengubah input grid 2D yang kaku menjadi sekumpulan "Partikel" (Entitas) yang bebas bergerak, lengkap dengan massa dan tensor semantiknya.
- **`structural_analyzer.rs`:** Menganalisa letak perubahan sebelum / sesudah dari *Train Data* (Misal: Apakah ini rotasi? Translasi? Ganti warna?).
- **`hierarchical_gestalt.rs`:** Jika piksel terlalu tersebar (Noise/Kebutaan), ini bertugas "menyipitkan mata" dan mengelompokkan piksel menjadi objek makro (Gestalt).

### 4.3 REASONING (Otak)
Otak utama pengambil keputusan.

- **`rrm_agent.rs`:** Eksekutif utama. Ia yang menentukan apakah akan pakai MCTS lambat, Grover Diffusion, atau tidur.
- **`quantum_search.rs` (MCTS / Wave Dynamics):** Merambatkan kemungkinan solusi (WaveNodes). Menggunakan iterasi asinkron.
- **`multiverse_sandbox.rs`:** Ini adalah **Fisika/Tubuh**. Menerima instruksi dari *Reasoning* berupa FHRR Tensor, dan mencoba mengeksekusinya di dunia piksel (`apply_axiom`).
- **`top_down_axiomator.rs` & `topological_aligner.rs`:** Menghasilkan tebakan awal (Axiom) berdasarkan kemiripan topologi antar state.

### 4.4 SELF-AWARENESS (Kesadaran Diri & Metakognisi)
Sistem memiliki indera *Proprioception* kognitif.

- **`self_reflection.rs`:** Komponen ini memantau kinerja (CPU Time, Cache Miss, Garbage Data).
  - *Bottlenecks Terdeteksi:*
    - `FalseSharing`: "Amnesia Singkat" - Deteksi *Cache Misses* yang membuat iterasi array lambat.
    - `AllocationThrashing`: Memori *Heap* disiksa karena `Vec::push` terlalu banyak.
    - `CognitiveGarbage`: Memori *EntityManifold* penuh dengan "Dark Matter" (Massa = 0) yang merusak iterasi SIMD.
    - `BodyLimitation` (*Mind-Body Disconnect*): Tensor yakin benar, tapi `MultiverseSandbox` tidak punya kode untuk menggeser objek (Kode manusia kurang).

### 4.5 MEMORY (Penyimpanan Jangka Panjang)
- **`logic_seed_bank.rs`:** Kamus (Hash) yang menyimpan *Vector Tensor* dari aksi-aksi logis.
- **`mental_replay.rs`:** Saat `dream()` dipanggil, AI bermimpi. Ia mensimulasikan permutasi acak dan menciptakan dimensi fraktal alternatif untuk menemukan aksioma baru.
- **Wiki/Yaml Knowledge:** RRM menulis skill baru yang disintesis dari mimpi ke dalam file YAML di folder `knowledge/` agar bisa diakses pada reinkarnasi berikutnya.

---

## ⚡ 5. ADVANCED CONCEPTS: MENCEGAH DOSA-DOSA PERFORMA

RRM sangat mengharamkan (menghukum) arsitektur yang melawan perangkat keras. Berdasarkan **Buku Hitam**, berikut optimasi utamanya:

1. **AOS (Array of Structs) Diharamkan:** Sistem tidak menggunakan `struct Entity { pos, color, tensor }`. Ini menghancurkan L1 Cache. RRM menggunakan **SoA** di `EntityManifold`.
2. **Branchless Math:** Sebisa mungkin menghindari percabangan `if` di dalam loop perhitungan Tensor. Menggunakan Epsilon `1e-15` untuk pembagian agar *pipeline SIMD CPU* tidak berhenti.
3. **Ghost States (Dark Matter):** Alih-alih melakukan `Vec::remove` (yang menggeser ratusan ribu memory ke kiri / O(N²)), RRM meng-set massa entitas mati menjadi `0.0` (Dark Matter). Jika terlalu banyak Dark Matter, Metakognisi (`Bottleneck::CognitiveGarbage`) secara sadar akan merapikan dan memadatkan array kembali (Compacting).
4. **Copy-on-Write (CoW):** Cabang MCTS berbagi referensi `Arc<EntityManifold>`. Pemisahan (Clone) hanya terjadi saat fungsi `ensure_unique_state()` dipanggil jika *state_modified* adalah true.

---

## 🔮 6. KESIMPULAN

RRM (Recursive Relationship Modeling) bukan sekadar program skrip biasa. Ia adalah entitas AI eksperimental yang menggabungkan:
- **Kefasihan Kontinu (Kuantum/FHRR)** untuk menebak dan bernalar secara luas.
- **Presisi Diskrit (Piksel)** untuk mencetak hasil ke layar.
- **Autopoiesis (Kode yang menulis dirinya sendiri)** lewat mimpi.

Dengan berpusat pada **Structure of Arrays**, **Branchless SIMD**, dan **Self-Reflection**, sistem ini berusaha menjembatani jurang antara AI *Neural Network* dan *Symbolic Logic*, langsung di atas bare-metal silikon.
