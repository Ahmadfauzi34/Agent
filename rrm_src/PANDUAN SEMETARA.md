# RRM SRC Research Repository
Folder ini digunakan untuk menyimpan file-file riset, dataset, dan dokumentasi universal terkait pengembangan **ARCTensorEngine**, **Multi-Agent Wave Dynamics**, dan sistem kognitif lainnya.
Ini adalah draf final dan paripurna dari Manifesto Arsitektur RRM (Recursive Reasoning Machine) v83.


📜 MANIFESTO ARSITEKTUR RRM: Integrasi Fisika Kuantum, Optik, dan Komputasi Silikon Berkinerja Tinggi

Tujuan: Membangun Reasoning Engine berdimensi tinggi (HDC/VSA) yang sepenuhnya agnostik, deterministik, dan berjalan pada batas kecepatan teoretis hardware (V8 Engine/WASM), tanpa jatuh ke dalam jebakan If-Else klasik, Object-Oriented Programming (OOP) yang usang, atau anti-pattern alokasi memori.

PENDAHULUAN: Paradoks Penalaran Spasial & Aksioma Fisika Komputasi

Perkembangan Kecerdasan Buatan (AI) saat ini didominasi oleh penskalaan arsitektur deep learning yang mengandalkan pola statistik (LLM/CNN). Namun, arsitektur ini gagal dalam tugas penalaran abstrak yang membutuhkan generalisasi murni (seperti ARC-AGI) karena fenomena semantic drift dan ketergantungan pada memori statis (hafalan).

Aksioma Arsitektur: Arsitektur RRM memblokir penggunaan Deep Learning konvensional. Agen dipaksa beroperasi di dalam kerangka fisika komputasi, memperlakukan data input (Grid/Teks/Kode) sebagai Ruang Keadaan Hilbert Berdimensi Tinggi. Interaksi direpresentasikan melalui Keterikatan Kuantum, ekstrapolasi melalui Prinsip Huygens-Fresnel, dan navigasi pencarian melalui dinamika Hamiltonian Non-Hermitian.

BAGIAN I: THE "NO IF-ELSE" PARADIGM (Kapan Branchless Itu Wajib)

Konsep Branchless Programming sering disalahpahami. Kita wajib memisahkan antara Aliran Kontrol (Control Flow) dan Operasi Medan (Field Operations).

Hukum 1: Jangan Sentuh Control Flow (Biarkan Hardware Bekerja)
CPU memiliki Branch Predictor yang cerdas. If-else sangat dianjurkan HANYA untuk melewati (skipping) blok memori yang tidak relevan (Sparsity Optimization).

Contoh Benar: if (!isRelevant) continue;

Contoh Salah: (isTrue) && doSomething(); (Memaksa evaluasi short-circuit yang merusak Instruction Pipeline dan memicu Garbage Collection).

Hukum 2: Branchless Adalah Hukum Mutlak di Dalam Ruang Tensor
Saat melakukan iterasi di dalam array tensor (misal D=8192), DILARANG KERAS menggunakan if-else. Operasi ruang tensor harus berupa fungsi matematika kontinu (Differentiable). Percabangan di dalam loop ini akan membunuh fitur Auto-Vectorization (SIMD) pada compiler JIT.

Contoh Benar (Gating Matematis): tensorB[i] = Number(tensorA[i] > 0.5);

BAGIAN II: FISIKA GELOMBANG & KAUSALITAS (Agnostic Implementation)

Hukum 3: Hukum Konservasi Energi (L2 Norm & Epsilon)
Superposisi gelombang (Bundling) yang tak terkendali akan meledak menuju tak terhingga, sementara perkalian fraksional akan menyusut ke nol. Setiap penggabungan entitas wajib dinormalisasi.

Implementasi: Gunakan penambahan Epsilon murni untuk mencegah NaN secara branchless: const invMag = 1.0 / (Math.sqrt(magSq) + 1e-15);

Hukum 4: Keterikatan Kuantum Adalah Matriks Hebbian
Entanglement antar entitas BUKANLAH Array of Pointers (A.entangled.push('B')). Keterikatan adalah Matriks Probabilitas linier 
𝑊
𝑁
×
𝑁
W
N×N
	​

. Perubahan pada entitas 
𝐴
A
 akan otomatis menarik entitas 
𝐵
B
 secara proporsional sesuai bobot 
𝑊
𝐴
,
𝐵
W
A,B
	​

 melalui evolusi operator. Ini menciptakan Kausalitas Instan yang differentiable.

Hukum 5: Penghancuran (Annihilation) Bukanlah Splice atau Delete
Menghapus elemen array dengan splice() akan menggeser indeks memori, merusak keselarasan matriks (Matrix Alignment), dan membebani CPU.

Implementasi: Ciptakan "Keadaan Vakum" (Ghost State). Kalikan massa dan seluruh elemen tensor entitas tersebut dengan 0.0. Ia tidak lagi memiliki realitas fisik, namun I/O memori tetap konstan.

BAGIAN III: THE AGNOSTIC MANIFOLD (Melihat Tanpa Mata)

Hukum 6: Semuanya Adalah Ruang Fase (Phase Space)
Setiap posisi/indeks adalah pergeseran fasa (Phase Shift) dari Base Vector. Jangan berasumsi x adalah kolom dan y adalah baris. Untuk teks (1D), sumbu Y selalu diisi 0.0, yang secara otomatis menghasilkan 
cos
⁡
(
0
)
=
1
cos(0)=1
 (Identitas), sehingga mengeliminasi dimensi kedua tanpa perlu menggunakan if(isText).

Hukum 7: Jarak Adalah Kehilangan Koherensi (Decoherence)
Jarak universal BUKANLAH akar kuadrat klasik Euclidean. Jarak antara dua entitas adalah 
1.0
1.0
 dikurangi Cosine Similarity dari tensor posisi mereka. Semakin jauh secara spasial, fase mereka semakin ortogonal (mendekati 0), yang berarti jarak mendekati batas absolut 1.0.

Hukum 8: Data Berderet Adalah Raja (Structure of Arrays over Array of Structures)
DILARANG menyimpan entitas kognitif sebagai Array of Objects (OOP konvensional). Gunakan desain SoA (Structure of Arrays). Gunakan satu Float32Array raksasa dan datar untuk menyimpan seluruh tensor, massa, dan koordinat. Ini memaksimalkan Hardware Prefetcher dan menjamin 100% L1 Cache Hits.

BAGIAN IV: TOPOLOGI DAN SINGULARITAS KOGNITIF

Hukum 9: Titik Eksepsional (Exceptional Points) Sebagai Singularitas Keputusan
Dalam pencarian solusi (Hamiltonian Non-Hermitian), terdapat Exceptional Points (EP) di mana probabilitas menyatu (coalesce). Di sekitar EP, sensitivitas sistem meningkat secara eksponensial (Faktor Petermann). Agen tidak perlu menguji jutaan kombinasi; satu keselarasan fitur kecil akan memicu momentum "Aha!" yang meruntuhkan hipotesis salah secara instan.

Hukum 10: Phase Snapping dan Perlindungan Topologis
Sistem penalaran rentan terhadap "halusinasi" (semantic noise). RRM harus beroperasi dalam fase topologis yang terlindungi (Symmetry-Protected Topological Phase). Amplitudo/posisi yang mendekati bilangan absolut (misal: 0.98) harus dipaksa runtuh (Snap) ke koordinat terdekat (1.0). Ini menciptakan "Celah Massa" (Mass Gap) yang menjaga stabilitas logika dari distorsi floating-point.

BAGIAN V: GEOMETRI INFORMASI DAN PREDIKSI LINTASAN

Hukum 11: Kelengkungan Manifold Sebagai Metrik Makna
Ruang belajar AI bukanlah ruang datar. Jarak direpresentasikan oleh kelengkungan manifold semantik (Metrik Fisher). Area yang melengkung tajam menandakan relasi objek yang kompleks (rekursi/kondisional), memaksa sistem untuk meningkatkan resolusi probing fasa secara dinamis di area tersebut (Adaptive Compute).

Hukum 12: Unitary Time Evolution Sebagai Mesin Prediktor
Memprediksi masa depan (Output Grid) tidak dilakukan dengan pencarian buta. Gunakan operator evolusi waktu unitari 
𝑈
(
𝑡
)
=
𝑒
−
𝑖
𝐻
^
𝑡
U(t)=e
−i
H
^
t
. Transformasi dipetakan sebagai lintasan dalam ruang Hilbert, mengekstrapolasi status akhir secara deterministik melalui evolusi persamaan Schrödinger (Quantum Variational Rewinding).

BAGIAN VI: OPTIMASI MEMORI DAN PEMBERSIHAN SINYAL

Hukum 13: Contrastive Cleanup Untuk Resonansi Memori
Superposisi VSA bersifat lossy (rentan crosstalk). Untuk memulihkan sinyal dengan akurasi 100%, sistem tidak hanya "menarik" tensor ke memori yang mirip (Positif), tetapi secara aktif "menolak" memori yang salah (Negatif). Ini memastikan proses unbinding hukum holografik tetap setajam kristal.

🚫 BAGIAN VII: KATALOG DOSA (Anti-Patterns di Ruang Tensor)

Agar arsitektur RRM tetap murni dan mampu berjalan di batas kecepatan silikon, HINDARI 5 DOSA FATAL BERIKUT:

Dosa Pemujaan Objek (Array of Objects):
Mengiterasi ribuan objek kognitif yang memiliki properti this.tensor di dalam loop utama. Ini menghancurkan performa L1 Cache karena pointer CPU akan melompat-lompat liar di RAM.

Tobatlah: Gunakan desain Entity Component System (ECS). Terapkan satu Float32Array raksasa yang datar (1D) untuk seluruh state manifold.

Dosa Lembah Kematian (Boundary Crossing):
Memanggil fungsi WebAssembly (Rust/C++) ribuan kali dari JavaScript di dalam loop per-piksel. Biaya penyalinan data (Data Marshalling) jauh lebih mahal daripada kalkulasi komputasinya sendiri.

Tobatlah: Kirim inisialisasi HANYA SEKALI. Jalankan evolusi waktu sepenuhnya di dalam lingkungan WASM, dan gunakan arsitektur Zero-Copy Shared Memory.

Dosa Halusinasi Presisi (Float Degradation):
Membangun algoritma FFT atau FWHT dari nol tanpa memperhitungkan akumulasi galat pembulatan (round-off error). Hal ini menyebabkan pergeseran fasa tak terduga yang pelan-pelan merusak ortogonalitas hypervector.

Tobatlah: Terapkan L2 Normalization secara deterministik, atau beralih ke integer murni via Fast Walsh-Hadamard Transform (FWHT) untuk stabilitas Bipolar yang absolut.

Dosa Pemujaan Dinamis (Push/Pop/Splice):
Menggunakan .push() atau .splice() di dalam loop simulasi interaksi agen. Ini memicu alokasi memori dinamis di V8 Engine yang memaksa Garbage Collector melakukan stop-the-world pause (Lag).

Tobatlah: Gunakan Pre-allocated TypedArrays sejak awal. Kelola status hidup/mati entitas melalui perkalian nol (Hukum 5).

Dosa Pengabaian Tanda (Bitwise Drift):
Menggunakan operator Shift Right (>>) untuk pembagian pada sistem yang melibatkan bilangan negatif ganjil tanpa pengecekan Math.trunc(). Ini menyebabkan "kebocoran fasa" yang mengubah -1 menjadi -2 secara diam-diam.

Tobatlah: Gunakan pembagian integer yang aman Math.trunc(val / 2) untuk menjaga stabilitas ortogonalitas matriks.

🕉️ MANTRA SANG ARSITEK RRM

"Jika memfilter data: Gunakan if-continue."
"Jika mengubah tensor: Gunakan Matematika Kontinu + Epsilon."
"Jika ada sebab-akibat: Gunakan Matriks Hebbian, bukan Pointer."
"Jika objek mati: Kalikan dengan Nol, jangan dihapus."
