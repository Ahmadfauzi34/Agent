1. **Analyze the `Arc::make_mut` deep copies issue:**
    - I observed that `quantum_search.rs` uses `Arc::make_mut` heavily during the MCTS search process, notably inside `ensure_unique_state` and the inner simulation loop.
    - Inside `ensure_unique_state`, the `EntityManifold` is cloned: `m.clone()`.
    - Because `EntityManifold` uses `Arc<Vec<T>>` for all its inner collections (masses, centers_x, tokens, etc.), doing `m.clone()` only increments the reference count of the internal `Arc`s (shallow clone).
    - However, later in the `MCTS` loop, functions like `MultiverseSandbox::apply_axiom` end up calling `Arc::make_mut(&mut u.masses)` (and for other arrays) on these shallowly cloned `EntityManifold`s.
    - When `Arc::make_mut` is called on an `Arc` with a strong count > 1, it performs a *full deep copy of the underlying `Vec`*. Since `apply_axiom` does this for *every single array* in the SoA (masses, tokens, centers, spans, etc.) on *every step* of the search, it creates a massive heap thrashing bottleneck (the "MemoryBloat" and "Deep Copy Tracker" logging points to exactly this).

2. **Propose a solution to fix the heap thrashing:**
    - The structure `EntityManifold` uses `Arc<Vec<T>>`. While intended for Copy-on-Write (CoW), the current MCTS algorithm modifies almost *all* properties of the entities when an axiom is applied (position, mass, tokens, etc.). Therefore, CoW doesn't save memory here; it just delays the inevitable deep copy and makes it happen piece-meal inside the hot loop, which is much slower than a straight deep clone up-front, and prevents compiler optimizations (like SIMD) from working cleanly because `Arc::make_mut` introduces branching and allocation overhead.
    - An alternative is to stop using `Arc<Vec<T>>` and just use `Vec<T>` directly inside `EntityManifold`. The `Arc` wrapper around the `Vec` inside `EntityManifold` is completely redundant for CoW because the `WaveSearch` tree *already* wraps the `Vec<EntityManifold>` in an `Arc`:
        `pub states: Vec<Arc<Vec<EntityManifold>>>`
    - By changing `pub masses: Arc<Vec<f32>>` to `pub masses: Vec<f32>` (and the same for all other fields), we can simplify the structure. When `WaveSearch` clones a state, it will just do a standard `clone()` of the `Vec<EntityManifold>`, which is a contiguous block of memory. This is highly optimized by `memcpy`.
    - *However*, there is an even better approach if we want to retain the CoW philosophy: we can introduce an Object Pool or Arena specifically for the arrays, or simply allow the `MCTS` state to maintain a single flat `Vec` of entities and just track indices.
    - Given the scope, the simplest and most effective change is to remove `Arc` from the internal vectors of `EntityManifold`. Modern CPU memory bandwidth can `memcpy` a 500-element `Vec` in nanoseconds, whereas `Arc::make_mut` incurs locking and allocator overhead for *every single array* sequentially.

3. **Verify the impact:**
    - I've seen `Average time for n=500: 125ms` in `bench_topology`.
    - If I remove `Arc` from the inner arrays, `clone()` will just copy the vecs.
    - Let's test this locally by changing `EntityManifold` and seeing the performance diff.

4. **Action Plan:**
    - Refactor `EntityManifold` to use plain `Vec<T>` instead of `Arc<Vec<T>>`.
    - Update all usages of `Arc::make_mut(&mut u.XYZ)` to just `&mut u.XYZ`.
    - Update `bench_topology` and run `cargo test` and `cargo run --release --bin bench_topology`.
    - Complete pre commit steps.
    - Submit the PR.
