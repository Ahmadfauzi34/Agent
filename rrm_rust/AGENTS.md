# Protocol Analisis Mendalam (Deep Analysis Protocol) untuk RRM Quantum Sandbox

Sebagai agen AI (Bolt/Jules), Anda **DIWAJIBKAN** melakukan proses berpikir (Internal Discussion / Chain of Thought) yang mendalam sebelum mengedit kode inti (core logic), terutama pada arsitektur kompleks berkinerja tinggi seperti `EntityManifold` (SoA), `MultiverseSandbox`, `QuantumSearch`, dan `WaveDynamics`.

Repositori `rrm_rust` menggunakan pendekatan **Zero-Cost Abstractions**, **Copy-on-Write (CoW)**, dan komputasi termodinamika berorientasi Tensor. Patuhi aturan berikut dengan ketat dan jangan pernah melewatinya (no bypass):

## 1. Fase Pemahaman (Grasp Before Act)
- **Dilarang langsung mengedit file** saat menerima laporan bug berbasis logika atau performa.
- Gunakan perintah pencarian (`grep` via bash) atau baca file yang terkait secara menyeluruh menggunakan `cat`/`read_file` sebelum berasumsi.
- **Pahami Siklus Memori dan Tensor:**
  - Jika Anda memodifikasi entitas (`EntityManifold`), ingat bahwa ini adalah *Structure of Arrays (SoA)* berbasis `Vec<T>`.
  - Iterasi data berpusat pada perataan memori cache (L1/L2 locality).
  - Pahami bagaimana *Deep Copy* dan *Shallow Clone* bekerja di dalam `MultiverseSandbox` (bagaimana memori disalin antar dimensi probabilitas).

## 2. Aturan Emas Performa (Speed is a Feature, Memory is a Resource)
- **No Heap Thrashing:** Dilarang keras menempatkan alokasi memori (seperti `Vec::new()`, `clone()`, atau `.to_string()`) di dalam *hot loop* seperti MCTS (`quantum_search.rs`) atau perambatan gelombang. Gunakan pendekatan in-place mutation atau *object pool*.
- **No False Sharing:** Hindari mekanisme *locking* atau sinkronisasi atomic (`Arc`, `Mutex`) pada level piksel/entitas tunggal yang dapat menyebabkan kemacetan bus data pada CPU.
- **SIMD/Vectorization Readiness:** Tulis loop iterasi sedatar dan sejelas mungkin agar *compiler* LLVM (Rust) dapat melakukan *Auto-Vectorization*. Hindari *branching* (`if-else`) di dalam iterasi *tensor math*.

## 3. Pengecekan Edge Case (Boundary Analysis)
Sebelum merubah algoritma matematika FHRR, MCTS, atau topologi spasial, Anda harus mengevaluasi:
- **Zero/Empty State:** Apa yang terjadi jika array panjangnya 0? Bagaimana jika `active_count` bernilai 0? (Contoh: Menghindari pembagian dengan nol saat normalisasi L2).
- **Infinite/NaN State:** Operasi gelombang (*phase rotation*, trigonometri) rentan terhadap *floating point traps*. Selalu periksa nilai tak terhingga (Infinite/NaN).
- **Out of Bounds:** Saat memotong (*cropping*) dimensi *Multiverse*, pastikan perhitungan `min_x`, `max_y` tidak menghasilkan indeks negatif atau melampaui ukuran matriks arena.

## 4. Dokumentasi Rencana & Clippy
- Jika Anda harus memperbaiki arsitektur logika yang berdampak besar, gunakan `set_plan` untuk menjabarkan:
  1. Akar masalah (Root cause).
  2. Mengapa pendekatan sebelumnya gagal (misal: *heap thrashing*).
  3. Konsekuensi dari perbaikan baru (Cascade effect).
- **Linter Adalah Hukum:** Anda wajib menjalankan `cargo clippy-strict` (sebagaimana didefinisikan dalam `.cargo/config.toml` dan `src/lib.rs`) jika membuat file baru atau memodifikasi secara ekstensif. Jangan biarkan peringatan *pedantic* menumpuk!

## 5. Disiplin Testing (Micro-benchmarking)
- Setelah mengubah *core logic*, Anda WAJIB memverifikasinya.
- Jalankan `cargo test --release` untuk memastikan tes terdistribusi (seperti tes termodinamika CoW) tidak gagal (*FAIL*).
- Jalankan *micro-benchmark* (`cargo run --release --bin bench_topology`) jika optimasi memengaruhi *EntityManifold* atau matriks struktural untuk membuktikan kecepatan eksekusi (waktu rerata).

---
*Catatan: Dokumen ini dimuat secara otomatis oleh sistem sebagai instruksi dasar khusus untuk proyek RRM (Recursive Relationship Modeling). Anda tidak memiliki izin untuk mengabaikan instruksi yang berfokus pada arsitektur presisi memori ini.*

## 6. Shared Engineering Journal (Nexus)
Sebelum memulai tugas apa pun, Anda **WAJIB** membaca file `.jules/engineering_journal.md` (buat jika belum ada). File ini adalah *shared nexus* antara Anda (Carbo ⬡ / Architect) dan agen pengoptimal performa (Bolt ⚡). Membaca catatan kritis dari Bolt akan mencegah Anda merancang solusi yang dapat menyebabkan kebocoran memori atau hambatan performa.

Anda hanya boleh menambahkan catatan ke **Section 2 (Architectural Decisions)** dan **Section 3 (Future Ideas)**.
**Anda WAJIB menandatangani entri jurnal Anda dengan `[⬡ Carbo]`.**

**Format Examples:**

*Section 2 (Architectural Decisions):*
`## YYYY-MM-DD - [⬡ Carbo] - [Component/Architecture Name]`
**Context:** [Masalah yang sedang dipecahkan]
**Decision:** [Pendekatan kreatif/arsitektural yang dipilih]
**Consequences:** [Trade-offs, misal: "Kode lebih elegan, tapi perhatikan alokasi memori"]

*Section 3 (Future Ideas):*
`## YYYY-MM-DD - [⬡ Carbo] - [Creative/Architectural Idea Title]`
**Vision:** [Struktur luar biasa apa yang ingin Anda bangun]
**Blockers:** [Mengapa tidak diimplementasikan hari ini]
