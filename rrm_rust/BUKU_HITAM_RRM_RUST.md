# 📜 BUKU HITAM ARSITEKTUR RRM - RUST EDITION
**Katalog Dosa-Dosa Performa & Solusi High-Dimensional Computing dalam Rust**

> Versi: 2.0-Rust  
> Domain: VSA/FHRR, Entity Component System, Creative Computing  
> Optimized for: x86_64/AArch64, SIMD, Cache-Friendly Architecture

---

## 🎯 FILOSOFI UTAMA

Rust memungkinkan zero-cost abstraction, tapi **zero-cost tidak otomatis**. Dosa-dosa berikut adalah pattern yang **mengorbankan performa** meski tetap "safe" di mata borrow checker.

> *"Compile tanpa error ≠ Run tanpa penalty"*

---

## 🚫 DOSA 1: "Closure Allocation di Hot Path"

### Bentuk Dosa
```rust
// Dosa: Closure allocation per iterasi
for i in 0..1_000_000 {
    let condition = some_check();
    condition.then(|| {
        // 100 baris logic...
        expensive_computation();
    });
}
```

### Kenapa Menghancurkan Mesin?
- `then()` menerima `FnOnce`, forcing **heap allocation** untuk closure capture
- **Branch predictor** gagal karena indirection function pointer
- **Cache pollution**: Closure code tidak inline, melompat ke alamat acak

### Penebusan Dosa (Branchless Control Flow)
```rust
// ✅ Benar: Explicit branch dengan early continue
for i in 0..1_000_000 {
    if !some_check() { continue; }
    // 100 baris logic - inline, cache-friendly
    expensive_computation();
}

// ✅ Alternatif: Boolean mask untuk SIMD-style (jika tanpa side effect)
let mask = some_check() as usize;
result[i] = value * mask; // 0 jika false, value jika true
```

### Kapan Boleh Melanggar?
- **Cold path** (< 1% execution time): Readability > micro-optimasi
- **Non-SIMD loop** dengan complexity rendah

---

## 🚫 DOSA 2: "Vec<T> di dalam Struct (AOS)"

### Bentuk Dosa
```rust
// Dosa: Array of Structs - cache thrashing
#[derive(Clone)]
struct Entity {
    position: Vec3,
    velocity: Vec3,
    mass: f32,
    tensor: [f32; 8192], // Large, scattered
}

struct World {
    entities: Vec<Entity>, // Pointer chasing nightmare
}
```

### Kenapa Menghancurkan Mesin?
- `Entity` ukuran besar (> 32KB dengan tensor), **sparse di heap**
- Akses `entities[i].tensor[j]` = **cache miss** tiap iterasi
- **False sharing**: Multi-threaded access ke field berbeda di struct sama

### Penebusan Dosa (Structure of Arrays / ECS)
```rust
// ✅ Benar: SOA - cache line packing
pub struct EntityManifold {
    // Hot data (frequently accessed together)
    pub centers_x: Vec<f32>,
    pub centers_y: Vec<f32>,
    pub masses: Vec<f32>,
    pub tokens: Vec<i32>,

    // Cold data (sparse access)
    pub spatial_tensors: Vec<FHRR>,  // Only when VSA operation needed
    pub semantic_tensors: Vec<FHRR>,

    // Metadata
    pub active_count: usize,
    pub capacity: usize,
}

// ✅ Access pattern: Linear scan, 100% cache hit
for i in 0..manifold.active_count {
    if manifold.masses[i] == 0.0 { continue; }
    // centers_x[i] dan centers_y[i] di cache line yang sama
    process(manifold.centers_x[i], manifold.centers_y[i]);
}
```

### Kapan Boleh Melanggar?
- **Entity count < 100**: AOS lebih readable, overhead minimal
- **Complex lifetime relationship**: Graph-like structure (gunakan `petgraph`)

---

## 🚫 DOSA 3: "FHRR Inverse Total"

### Bentuk Dosa
```rust
// Dosa: Inverse tensor superposisi menghancurkan semantik warna
let mirrored = fhrr::inverse(&entity_tensor);
// entity_tensor = X ⊗ Y ⊗ Color
// inverse() membalik X, Y, DAN Color → "Anti-Color"
```

### Kenapa Menghancurkan Semesta?
- Tensor VSA adalah **binding komutatif**: `A ⊗ B ⊗ C`
- Inverse total = `A⁻¹ ⊗ B⁻¹ ⊗ C⁻¹`
- **Color phase** terbalik, decoder tidak mengenali (render hitam/artifact)

### Penebusan Dosa (Calibrated Fractional Translation)
```rust
/// Inversi spasial murni tanpa sentuh semantik
pub fn mirror_spatial(tensor: &FHRR, axis: Axis, center: f32) -> FHRR {
    // Unbind komponen spasial saja
    let (spatial, semantic) = unbind_components(tensor);

    // Transform spasial: reflection = translation terkalibrasi
    let reflected = match axis {
        Axis::X => fractional_bind(&X_SEED, 2.0 * center - extract_x(&spatial)),
        Axis::Y => fractional_bind(&Y_SEED, 2.0 * center - extract_y(&spatial)),
    };

    // Rebind dengan semantik utuh
    bind(&reflected, &semantic)
}

// ✅ Penggunaan: Warna tetap, posisi terbalik
let mirrored = mirror_spatial(&entity, Axis::X, 15.5);
```

### Kapan Boleh Melanggar?
- **Sengaja ingin "negative" entity**: Gunakan `inverse_explicit()` dengan dokumentasi jelas
- **Debug/visualisasi phase**: Inverse untuk melihat interference pattern

---

## 🚫 DOSA 4: "Vec::remove() / retain() di Loop"

### Bentuk Dosa
```rust
// Dosa: O(N²) shift, memory copy massive
for i in (0..entities.len()).rev() {
    if entities[i].is_dead() {
        entities.remove(i); // Shift semua elemen kanan!
    }
}
```

### Kenapa Menghancurkan Mesin?
- `remove(i)` = **memmove** semua elemen `i+1..len` ke kiri
- Untuk 10K entities × 8KB tensor = **80MB memory copy** per removal
- **Iterator invalidation**: Rust borrow checker melarang, tapi logic error tetap bisa

### Penebusan Dosa (Ghost States / Swap-Drop)
```rust
// ✅ Metode 1: Ghost States (Mass = 0.0)
pub struct EntityManifold {
    masses: Vec<f32>, // 0.0 = slot kosong (Dark Matter)
    // ...
}

impl EntityManifold {
    pub fn kill_entity(&mut self, idx: usize) {
        self.masses[idx] = 0.0; // O(1), no shift
        // Optional: push idx ke free_list untuk reuse
    }

    pub fn iter_active(&self) -> impl Iterator<Item = usize> + '_ {
        (0..self.active_count)
            .filter(|&i| self.masses[i] > 0.0)
    }
}

// ✅ Metode 2: Swap-Drop (untuk benar-benar hapus tapi O(1))
pub fn remove_swap(&mut self, idx: usize) {
    self.active_count -= 1;
    if idx != self.active_count {
        // Swap dengan terakhir, lalu drop
        self.centers_x.swap(idx, self.active_count);
        self.centers_y.swap(idx, self.active_count);
        // ... swap semua field
    }
}
```

### Kapan Boleh Melanggar?
- **Order preservation critical**: Gunakan `retain()` jika memang perlu maintain index
- **Small Vec (< 100)**: Overhead shift minimal

---

## 🚫 DOSA 5: "Branch di Math Loop (SIMD Killer)"

### Bentuk Dosa
```rust
// Dosa: Branch di dalam kalkulasi vektor
for i in 0..DIMENSION {
    let mag = (sum_sq).sqrt();
    if mag > 0.0 {
        tensor[i] /= mag;
    }
    // else: implicit 0, tapi branch tetap ada!
}
```

### Kenapa Menghancurkan Mesin?
- **SIMD auto-vectorization gagal**: LLVM tidak bisa vectorize loop dengan branch
- **Pipeline stall**: CPU harus flush jika prediksi salah
- **1e-15 vs 0.0**: Secara fisik identik, tapi satu branchless

### Penebusan Dosa (Epsilon + Branchless Math)
```rust
// ✅ Benar: Math branchless dengan epsilon
let mag_sq: f32 = tensor.iter().map(|x| x * x).sum();
let inv_mag = 1.0 / (mag_sq.sqrt() + 1e-15); // Epsilon prevents div by zero

// SIMD-friendly: pure arithmetic, no branch
for i in 0..DIMENSION {
    tensor[i] *= inv_mag;
}

// ✅ Advanced: Select intrinsic untuk conditional tanpa branch
use std::arch::x86_64::*;
let mask = _mm256_cmp_ps(ymm_mag, _mm256_setzero_ps(), _CMP_NEQ_OQ);
let result = _mm256_blendv_ps(ymm_zero, ymm_normalized, mask);
```

### Kapan Boleh Melanggar?
- **Domain requires exact 0 handling**: Gunakan `if` dengan `#[inline(never)]` untuk cold path
- **Non-performance critical**: Clarity > speed untuk setup/init code

---

## 🚫 DOSA 6: "Magic Number / -Infinity di Branchless Max"

### Bentuk Dosa
```rust
// Dosa: -Infinity × 0 = NaN (IEEE 754 trap)
let mut best = f32::NEG_INFINITY;
for i in 0..n {
    let val = compute_similarity(i);
    let is_better = (val > best) as i32 as f32;
    // Iterasi 1: NEG_INFINITY * 0.0 = NaN!
    best = best * (1.0 - is_better) + val * is_better;
}
```

### Kenapa Menghancurkan Mesin?
- **NaN propagation**: `NaN + x = NaN`, `NaN > x = false`
- **Silent failure**: Tidak panic, hanya hasil salah
- **Debug nightmare**: Muncul di iterasi ke-1000+, sulit trace

### Penebusan Dosa (Sensible Bounds + Type Safety)
```rust
// ✅ Benar: Sensible bound berdasarkan domain
pub const MIN_SIMILARITY: f32 = -1.0; // FHRR similarity range [-1, 1]
pub const MAX_SIMILARITY: f32 = 1.0;

// ✅ Lebih baik: Newtype dengan invariant
#[derive(Clone, Copy, Debug, PartialEq, PartialOrd)]
pub struct Similarity(f32);

impl Similarity {
    pub const MIN: Self = Self(-1.0);
    pub const MAX: Self = Self(1.0);

    pub fn new_clamped(v: f32) -> Self {
        Self(v.clamp(-1.0, 1.0))
    }

    pub fn get(&self) -> f32 { self.0 }
}

// ✅ Branchless max yang aman
let mut best = Similarity::MIN;
for i in 0..n {
    let val = Similarity::new_clamped(compute_similarity(i));
    if val > best { best = val; } // OK: explicit branch, bukan math trick
    // Atau: best = best.max(val) - Rust intrinsic, optimized
}
```

### Kapan Boleh Melanggar?
- **Guaranteed non-empty iterator**: `Iterator::max()` handle ini untuk Anda
- **F64 precision**: `-1e308` masih aman (tetap hindari INFINITY)

---

## 🚫 DOSA 7: "Box<dyn Trait> di Hot Path" (Rust-Specific)

### Bentuk Dosa
```rust
// Dosa: Dynamic dispatch di loop kritis
trait Axiom { fn apply(&self, world: &mut World); }

struct Engine {
    axioms: Vec<Box<dyn Axiom>>, // vtable pointer chasing
}

impl Engine {
    fn update(&mut self, world: &mut World) {
        for axiom in &self.axioms {
            axiom.apply(world); // Indirect call, cache miss
        }
    }
}
```

### Kenapa Menghancurkan Mesin?
- **Vtable lookup**: Dereference pointer + indirect call
- **Monomorphization fail**: Code tidak inline, optimizer buta
- **Cache thrashing**: `dyn Axiom` tersebar di heap

### Penebusan Dosa (Enum Dispatch / Static Dispatch)
```rust
// ✅ Benar: Enum dispatch - tag + union, cache-friendly
#[derive(Clone)]
pub enum Axiom {
    Translate { dx: f32, dy: f32 },
    Rotate { angle: f32 },
    Spawn { color: i32, count: usize },
    Crop { quadrant: u8 },
    // ... tier 0-8
}

impl Axiom {
    pub fn apply(&self, world: &mut World) {
        match self {
            Self::Translate { dx, dy } => world.translate(*dx, *dy),
            Self::Rotate { angle } => world.rotate(*angle),
            // ... exhaustive, no vtable
        }
    }
}

// ✅ Advanced: Generic dengan const generic untuk tier
pub struct Engine<const TIER: u8> {
    axioms: Vec<Axiom>, // Monomorphized per tier
}
```

### Kapan Boleh Melanggar?
- **Plugin system external**: `dyn` untuk DLL hot-reload
- **Truly heterogeneous**: Enum variant > 50, consider `dyn`

---

## 🚫 DOSA 8: "Iterator Chain Complex tanpa .collect()"

### Bentuk Dosa
```rust
// Dosa: Nested iterator, compiler tidak bisa optimize
let result: Vec<_> = entities.iter()
    .filter(|e| e.mass > 0.0)
    .map(|e| expensive_transform(e))
    .filter(|e| e.energy > threshold)
    .map(|e| another_transform(e))
    .collect();
```

### Kenapa Menghancurkan Mesin?
- **State machine overhead**: Tiap adapter = struct + next() call
- **No SIMD**: LLVM tidak melihat loop utuh
- **Branch mispredict**: Filter terpisah, tidak fused

### Penebusan Dosa (Explicit Loop dengan Fused Logic)
```rust
// ✅ Benar: Single loop, fused branches
let mut result = Vec::with_capacity(entities.len());
for e in &entities {
    if e.mass <= 0.0 { continue; }

    let transformed = expensive_transform(e);
    if transformed.energy <= threshold { continue; }

    result.push(another_transform(&transformed));
}

// ✅ Atau: Iterator + fold untuk reduksi (tetap efisien)
let total_energy: f32 = entities.iter()
    .filter(|e| e.mass > 0.0)
    .map(|e| e.energy)
    .sum(); // Sum adalah reduksi, tetap optimal
```

### Kapan Boleh Melanggar?
- **Clarity > speed**: Business logic, bukan hot path
- **Lazy evaluation penting**: Iterator chain untuk infinite stream

---

## 🚫 DOSA 9: "Mutex di Loop Paralel"

### Bentuk Dosa
```rust
// Dosa: Lock contention menghancurkan paralelisme
use std::sync::{Arc, Mutex};

let shared = Arc::new(Mutex::new(Vec::new()));

(0..1000).into_par_iter().for_each(|i| {
    let result = compute(i);
    shared.lock().unwrap().push(result); // Serial bottleneck!
});
```

### Kenapa Menghancurkan Mesin?
- **False sharing**: Mutex cache line bouncing antar core
- **Serialisasi**: Paralelisme → sequential karena lock
- **Poison risk**: Panic di thread = mutex poisoned

### Penebusan Dosa (Lock-Free / Per-Thread Accumulator)
```rust
use rayon::prelude::*;

// ✅ Benar: Per-thread collection, merge akhir
let results: Vec<_> = (0..1000)
    .into_par_iter()
    .map(|i| compute(i)) // Tanpa lock, murni paralel
    .collect(); // Rayon handle merge efisien

// ✅ Atau: Crossbeam channel untuk stream
use crossbeam::channel;

let (sender, receiver) = channel::unbounded();

scope(|s| {
    s.spawn(|_| {
        for result in receiver {
            process(result); // Single consumer
        }
    });

    (0..1000).into_par_iter().for_each(|i| {
        sender.send(compute(i)).unwrap(); // Non-blocking send
    });
});
```

### Kapan Boleh Melanggar?
- **Critical section sangat singkat**: `Mutex<f32>` untuk counter (tetap hindari)
- **Single-threaded context**: `RefCell` untuk interior mutability

---

## 🚫 DOSA 10: "Allocation di Loop (Vec::with_capacity Fail)"

### Bentuk Dosa
```rust
// Dosa: Re-allocation per iterasi
for i in 0..1000 {
    let mut temp = Vec::new(); // Alloc 0, grow 1, 2, 4, 8...
    for j in 0..100 {
        temp.push(compute(i, j)); // 7-8 reallocation!
    }
    process(temp);
}
```

### Kenapa Menghancurkan Mesin?
- **Allocator pressure**: `malloc/free` ribuan kali
- **Memory fragmentation**: Heap tidak contiguous
- **Drop overhead**: `Vec` di-scope exit = dealloc

### Penebusan Dosa (Pre-allocated Buffer + Clear)
```rust
// ✅ Benar: Reuse buffer dengan clear
let mut temp = Vec::with_capacity(100); // Single alloc

for i in 0..1000 {
    temp.clear(); // O(1), tidak dealloc
    temp.extend((0..100).map(|j| compute(i, j)));
    process(&temp);
}

// ✅ Advanced: Bump allocator untuk frame-based
use bumpalo::Bump;

let bump = Bump::new();
for i in 0..1000 {
    let temp: &mut Vec<_> = bump.alloc(Vec::with_capacity(100));
    // ... use temp
    bump.reset(); // O(1) reset semua allocation
}
```

### Kapan Boleh Melanggar?
- **One-shot operation**: Function dipanggil sekali, tidak loop
- **Small fixed size**: `SmallVec<[T; 8]>` untuk stack allocation

---

## 🛠️ TOOLING: Deteksi Dosa Otomatis

### Clippy Lints (Wajib Aktif)
```toml
# .clippy.toml atau Cargo.toml
[lints.clippy]
all = "warn"
nursery = "warn"
perf = "deny"
correctness = "deny"

# Specific untuk dosa-dosa di atas
vec_box = "deny"           # Dosa 7
linkedlist = "deny"        # Cache unfriendly
mutex_integer = "deny"     # Dosa 9
redundant_clone = "warn"
```

### Custom Lint (Miri + Proptest)
```rust
#[test]
fn test_no_nan_branchless() {
    // Proptest: Pastikan branchless max tidak produce NaN
    proptest!(|(vals: Vec<f32>)| {
        let mut best = -999.0f32;
        for v in vals {
            let is_better = (v > best) as i32 as f32;
            best = best * (1.0 - is_better) + v * is_better;
        }
        prop_assert!(!best.is_nan());
    });
}
```

---

## 📊 CHEAT SHEET: Kapan Melanggar?

| Dosa | Hot Path (>90% time) | Warm Path | Cold Path |
|------|---------------------|-----------|-----------|
| 1. Closure | ❌ NEVER | ⚠️ Avoid | ✅ OK |
| 2. AOS | ❌ NEVER | ⚠️ Small N | ✅ OK |
| 3. FHRR Inverse | ❌ NEVER | ❌ NEVER | ⚠️ Explicit |
| 4. Vec::remove | ❌ NEVER | ⚠️ Small N | ✅ OK |
| 5. Math Branch | ❌ NEVER | ⚠️ Avoid | ✅ OK |
| 6. Magic Number | ❌ NEVER | ❌ NEVER | ❌ NEVER |
| 7. dyn Trait | ❌ NEVER | ⚠️ Avoid | ✅ OK |
| 8. Iterator Chain | ⚠️ Caution | ✅ OK | ✅ OK |
| 9. Mutex | ❌ NEVER | ⚠️ Careful | ⚠️ Careful |
| 10. Alloc Loop | ❌ NEVER | ⚠️ Avoid | ✅ OK |

---

## 🎯 KESIMPULAN

Buku Hitam ini adalah **default yang aman**, bukan dogma. Rust memungkinkan zero-cost abstraction, tapi abstraction tetap punya cost jika salah pakai.

> *"Premature optimization is the root of all evil. But premature pessimization is the root of all evil too."* — Herb Sutter

Gunakan aturan ini untuk **menghindari pessimization**, bukan untuk micro-optimasi dini. Profile dulu (`cargo flamegraph`, `perf`), lalu apply fix yang relevan.

---

**License: MIT/Apache-2.0**  
**Maintainer: Arsitek RRM**  
**Kontribusi: PR welcome untuk dosa baru**
