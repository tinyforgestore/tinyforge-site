---
title: "Rust's Iterators Are Lazy — Proven With Logs"
description: "Verifying Rust iterator laziness with println, criterion benchmarks, and cargo-show-asm."
pubDate: 2026-05-11
tags: [rust, performance, iterators]
---

Rust iterators are **lazily evaluated**.

You probably already know that. But the surest way to find out whether you really understand it is to drop a few `println!` calls in and watch what happens.

When you chain `.filter()` → `.map()` → `.take()`, how many times does each adapter actually run? For N elements, is it 3N? Some other number?

The answer is: only as many times as needed.

---

## 1. The Naïve Guess vs the Real Behaviour

Take a Vec of 10 elements and run this pipeline:

- keep only the evens (filter)
- multiply by 10 (map)
- take the first 3 (take)

**The naïve guess:**

```
filter × 10 → map × 5 (5 evens) → take × 3 = 18 calls total
```

The mental model: run all the filters, then move on to map. That's **not** what happens.

### Code

```rust
fn main() {
    let data = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    let result: Vec<i32> = data.iter()
        .filter(|&&x| {
            println!("  filter: {}", x);
            x % 2 == 0
        })
        .map(|&x| {
            println!("  map:    {}", x);
            x * 10
        })
        .take(3)
        .collect();

    println!("\nresult: {:?}", result);
}
```

### Output

```
  filter: 1
  filter: 2
  map:    2
  filter: 3
  filter: 4
  map:    4
  filter: 5
  filter: 6
  map:    6

result: [20, 40, 60]
```

---

### What's happening

filter and map are called **interleaved**. filter doesn't run 10 times before map starts.

One element at a time goes through the pipeline. The moment `take(3)` has its three items, **the remaining elements are never touched**.

- Elements processed: 1 through 6 (7–10 are never seen)
- filter calls: 6 (not 10)
- map calls: 3 (not 5)

That's lazy evaluation. Until `collect()` is called, the pipeline does **nothing**. It pulls one element at a time, processes only what's needed, and stops.

---

## 2. N vs 4N — chaining doesn't multiply the work

So if you chain four adapters instead of three, does the work go up 4×?

```rust
fn main() {
    let data: Vec<i32> = (1..=20).collect();

    let result: Vec<i32> = data.iter()
        .filter(|&&x| {
            println!("  filter:  {}", x);
            x % 2 == 0
        })
        .map(|&x| {
            println!("  map×10:  {}", x);
            x * 10
        })
        .filter(|&x| {
            println!("  filter2: {}", x);
            x > 50
        })
        .map(|x| {
            println!("  map+1:   {}", x);
            x + 1
        })
        .take(3)
        .collect();

    println!("\nresult: {:?}", result);
}
```

### Output

```
  filter:  1
  filter:  2
  map×10:  2
  filter2: 20
  filter:  3
  filter:  4
  map×10:  4
  filter2: 40
  filter:  5
  filter:  6
  map×10:  6
  filter2: 60
  map+1:   60
  filter:  7
  filter:  8
  map×10:  8
  filter2: 80
  map+1:   80
  filter:  9
  filter:  10
  map×10:  10
  filter2: 100
  map+1:   100

result: [61, 81, 101]
```

Four adapters, same shape: one element at a time, end-to-end through the pipeline. Not 4N = 80 calls across 20 elements — the loop just stops as soon as three items are collected.

This is one reason Rust iterators are called **zero-cost abstractions**. No matter how many adapters you chain, the runtime ends up with a single loop.

---

## 3. Proving it with a benchmark — criterion

The logs prove the behaviour. What about **performance**?

A fair suspicion: the chained iterator reads well, but maybe it runs slower than a hand-written `for` loop. Let's measure with `criterion`.

### Setup

Project layout:

```
benches/iterator_bench.rs
Cargo.toml
src/lib.rs        ← can be empty
```

```toml
# Cargo.toml
[package]
name = "rust-iter"
version = "0.1.0"
edition = "2021"

[dev-dependencies]
criterion = "0.5"

[[bench]]
name = "iterator_bench"
harness = false
```

```rust
// benches/iterator_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

#[inline(never)]
fn chained_iterator(data: &[i32]) -> Vec<i32> {
    data.iter()
        .filter(|&&x| x % 2 == 0)
        .map(|&x| x * 10)
        .filter(|&x| x > 50)
        .map(|x| x + 1)
        .take(3)
        .collect()
}

#[inline(never)]
fn manual_loop(data: &[i32]) -> Vec<i32> {
    let mut result = Vec::new();
    for &x in data {
        if x % 2 == 0 {
            let y = x * 10;
            if y > 50 {
                result.push(y + 1);
                if result.len() == 3 { break; }
            }
        }
    }
    result
}

fn bench(c: &mut Criterion) {
    let data: Vec<i32> = (1..=1000).collect();
    c.bench_function("chained_iterator", |b| b.iter(|| chained_iterator(black_box(&data))));
    c.bench_function("manual_loop",      |b| b.iter(|| manual_loop(black_box(&data))));
}

criterion_group!(benches, bench);
criterion_main!(benches);
```

Why `#[inline(never)]`: without it, the compiler inlines the function into the benchmark harness, optimisations leak across the call boundary, and the numbers stop being meaningful. `black_box` blocks input-side optimisation; `#[inline(never)]` ensures the function itself is measured in isolation.

```bash
cargo bench
```

### Results

```
chained_iterator  time: [17.628 ns 17.669 ns 17.716 ns]
manual_loop       time: [18.279 ns 18.347 ns 18.416 ns]
```

The numbers are essentially the same. Within noise — if anything, the iterator is *slightly* faster.

That's not a fluke. LLVM sometimes applies more aggressive optimisations to a clean iterator chain than to a hand-written loop. At worst, you don't pay anything for the abstraction.

Chained iterators run at **the same speed as — or faster than — a hand-written loop**. Stack as many adapters as you like; the runtime cost doesn't grow.

This is what "zero-cost abstraction" actually means in Rust — zero runtime cost for the abstraction.

---

## 4. Why they're the same — checking with cargo-show-asm

Criterion told us the numbers match. Now let's see *why* in the assembly.

In a release build, the compiler folds the chained iterator down to **a single loop**. Every adapter's function call is inlined; no intermediate allocations.

### Setup

```bash
cargo install cargo-show-asm
```

Because the functions live in the bench file, use `--bench` to target it:

```bash
cargo show-asm --release --bench iterator_bench chained_iterator
cargo show-asm --release --bench iterator_bench manual_loop
```

### Results

Diffing the two ASM outputs, you can see the compiler emits the same shape of code for both.

**Patterns present in both:**

- **`take(3)` unrolled** — not a counted loop; the three iterations are spelled out individually (`LBB38_7/14/21` and `LBB39_1/6/10`).
- **Bit-test for evenness** — `x % 2 == 0` compiles down to a single `tbnz w8, #0`.
- **No multiply for `x * 10`** — replaced with `add w8, w8, w8, lsl #2` + `lsl w8, #1` (shift-and-add).

**Notable difference:**

The `chained_iterator` ASM is shorter. `manual_loop` carries exception-handling setup (`.cfi_personality`, the `Lexception` block) and a `grow_one` call, whereas `chained_iterator` lets the compiler hoist the allocation pattern into a single up-front `__rust_alloc`.

That's why the iterator edged out the hand-written loop in the benchmark. The abstraction is free *and* LLVM has more room to optimise around a clean iterator chain, so you end up with slightly less overhead than the manual version.

> **Note:** This ASM is from Apple Silicon (ARM64 / AArch64). On x86_64 the instructions differ, but the same optimisation patterns apply.

---

**To summarise:**

```
logs    → proof of the behaviour (lazy evaluation, early termination)
bench   → proof of the performance (on par or better)
ASM     → explanation of why (they compile to the same shape)
```

Chained iterators read well and run as fast as — or faster than — a hand-written loop. That's a zero-cost abstraction.

::callout{product="kurippa"}

