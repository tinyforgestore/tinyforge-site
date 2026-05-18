---
title: "JavaScript Arrays Are Eager. Here's What That Costs You."
description: "Why JavaScript array methods do more work than they should — and what generators or lazy.js give you back."
pubDate: 2026-05-18
tags: [typescript, javascript, performance, iterators, lazy-evaluation]
category: dev
---

> This is part 2 of a series on lazy iterators.
> Part 1: [Rust's Iterators Are Lazy — Proven With Logs](/blog/rust-iterator-lazy/)

> **Update (2026-05-18)**: Added Section 4 on Iterator Helpers (ES2025). The original framing — that lazy iteration in JS requires generators or a library — is outdated for modern runtimes. `[...].values().filter(...).map(...).take(...).toArray()` is now lazy natively. Section 5 (formerly Section 4) reframes `lazy.js` as a pre-2025 fallback. Thanks to [juner](https://zenn.dev/juners) for flagging this in the Zenn comments.

---

In the [previous post](/blog/rust-iterator-lazy/) we proved that Rust's iterators are lazy — they process one element at a time through the entire pipeline, and stop the moment they have what they need.

JavaScript arrays work differently. And the difference has a real cost.

---

## 1. The Default: Eager Evaluation

In JavaScript, every array method creates a new array and processes all elements immediately.

```ts
const data = Array.from({ length: 10 }, (_, i) => i + 1);

const result = data
  .filter(x => {
    console.log(`  filter: ${x}`);
    return x % 2 === 0;
  })
  .map(x => {
    console.log(`  map: ${x}`);
    return x * 10;
  })
  .slice(0, 3);

console.log('\nresult:', result);
```

### Output

```
  filter: 1
  filter: 2
  filter: 3
  filter: 4
  filter: 5
  filter: 6
  filter: 7
  filter: 8
  filter: 9
  filter: 10
  map: 2
  map: 4
  map: 6
  map: 8
  map: 10

result: [20, 40, 60]
```

Notice what happened:

- `filter` ran on all 10 elements
- `map` ran on all 5 results from filter
- `slice(0, 3)` then discarded 2 of them

15 operations to produce 3 results. Compare this to the Rust equivalent — 6 operations total, stopping as soon as 3 items were collected.

This is eager evaluation: each method completes in full before the next one starts. The intermediate arrays (`[2, 4, 6, 8, 10]` after filter) are allocated and then discarded.

For small arrays this doesn't matter. For large datasets — logs, search results, data processing — it does.

---

## 2. Can You Do Better With a Plain Loop?

Yes. A hand-written loop is lazy by default because you control when to stop:

```ts
const data = Array.from({ length: 10 }, (_, i) => i + 1);
const result: number[] = [];

for (const x of data) {
  console.log(`  checking: ${x}`);
  if (x % 2 === 0) {
    const mapped = x * 10;
    result.push(mapped);
    if (result.length === 3) break;
  }
}

console.log('\nresult:', result);
```

### Output

```
  checking: 1
  checking: 2
  checking: 3
  checking: 4
  checking: 5
  checking: 6

result: [20, 40, 60]
```

6 iterations — same as Rust. The loop stops as soon as 3 items are collected, and never touches elements 7–10.

The problem is readability. Chained `.filter().map().slice()` is expressive and easy to follow. A manual loop with a break condition is imperative and harder to compose. As the logic gets more complex, the loop gets harder to read and maintain.

---

## 3. Lazy Evaluation in TypeScript — Generator-Based

JavaScript has a native mechanism for lazy sequences: **generators**. A generator function produces values one at a time on demand, without allocating intermediate arrays.

```ts
function* lazyFilter<T>(
  iter: Iterable<T>,
  predicate: (x: T) => boolean
): Generator<T> {
  for (const x of iter) {
    console.log(`  filter: ${x}`);
    if (predicate(x)) yield x;
  }
}

function* lazyMap<T, U>(
  iter: Iterable<T>,
  fn: (x: T) => U
): Generator<U> {
  for (const x of iter) {
    console.log(`  map: ${x}`);
    yield fn(x);
  }
}

function take<T>(iter: Iterable<T>, n: number): T[] {
  const result: T[] = [];
  for (const x of iter) {
    result.push(x);
    if (result.length === n) break;
  }
  return result;
}

// Usage
const data = Array.from({ length: 10 }, (_, i) => i + 1);

const filtered = lazyFilter(data, x => x % 2 === 0);
const mapped = lazyMap(filtered, x => x * 10);
const result = take(mapped, 3);

console.log('\nresult:', result);
```

### Output

```
  filter: 1
  filter: 2
  map: 2
  filter: 3
  filter: 4
  map: 4
  filter: 5
  filter: 6
  map: 6

result: [20, 40, 60]
```

6 operations. Elements 7–10 are never touched. The behavior is identical to Rust — one element flows through the entire pipeline at a time, and the chain stops as soon as `take` has enough.

The generator functions are composable and readable, but the syntax for chaining them is awkward compared to the fluent `.filter().map()` style.

---

## 4. Modern JS: Iterator Helpers (ES2025)

The story above — that you need generators or a library for lazy chains in JavaScript — was true until recently. As of **ES2025**, the [Iterator Helpers proposal](https://github.com/tc39/proposal-iterator-helpers) reached Stage 4 and shipped. `Array.prototype.values()` returns a native [`Iterator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator) object, and `Iterator.prototype` now has lazy `.filter()`, `.map()`, `.take()`, `.drop()`, `.toArray()`, `.reduce()`, and more.

```ts
const data = Array.from({ length: 10 }, (_, i) => i + 1);

const result = data
  .values()
  .filter(x => {
    console.log(`  filter: ${x}`);
    return x % 2 === 0;
  })
  .map(x => {
    console.log(`  map: ${x}`);
    return x * 10;
  })
  .take(3)
  .toArray();

console.log('\nresult:', result);
```

### Output

```
  filter: 1
  filter: 2
  map: 2
  filter: 3
  filter: 4
  map: 4
  filter: 5
  filter: 6
  map: 6

result: [20, 40, 60]
```

Six operations, no intermediate arrays, behaviour identical to Rust. No library, no generator wrapper, no `LazySeq` class.

The critical character is `.values()`. Calling `.filter()` *directly on the Array* still hits `Array.prototype.filter` — eager, the Section 1 behaviour. Hopping to `.values()` hands you a native `Iterator`, and from that point everything in the chain is `Iterator.prototype` and lazy. One method call's worth of difference, opposite semantics.

**Runtime support**: Chrome 122+ (March 2024), Firefox 131+ (October 2024), Safari 18.4+ (March 2025), Node 22+. Solid on every actively-developed JavaScript engine.

This collapses the headline question of the post. JS still has eager array methods *by default*, but a single `.values()` call gets you Rust-like lazy iteration natively. The gap between "lazy by default" (Rust) and "lazy on demand" (JS) is now one method call wide.

---

## 5. Pre-ES2025: `lazy.js` as Fallback

[lazy.js](https://danieltao.com/lazy.js/) wraps the generator pattern in a fluent API that looks exactly like native array methods. It was the canonical answer before Iterator Helpers shipped, and it's still the right call if you need to support pre-2024 browsers or Node <22.

```ts
import Lazy from 'lazy.js';

const data = Array.from({ length: 10 }, (_, i) => i + 1);

const result = Lazy(data)
  .filter(x => x % 2 === 0)
  .map(x => x * 10)
  .take(3)
  .toArray();

console.log(result); // [20, 40, 60]
```

That's the whole thing. The chain reads identically to native array methods, but nothing is evaluated until `.toArray()` is called — and it stops as soon as `take(3)` is satisfied. Six operations, no intermediate arrays allocated.

**How it works under the hood** — if you're curious what the library is doing internally, it's essentially this pattern:

```ts
class LazySeq<T> {
  constructor(private source: Iterable<T>) {}

  filter(predicate: (x: T) => boolean): LazySeq<T> {
    const source = this.source;
    return new LazySeq(
      (function* () {
        for (const x of source) {
          if (predicate(x)) yield x;
        }
      })()
    );
  }

  map<U>(fn: (x: T) => U): LazySeq<U> {
    const source = this.source;
    return new LazySeq(
      (function* () {
        for (const x of source) {
          yield fn(x);
        }
      })()
    );
  }

  take(n: number): T[] {
    const result: T[] = [];
    for (const x of this.source) {
      result.push(x);
      if (result.length === n) break;
    }
    return result;
  }
}
```

Each adapter method returns a new `LazySeq` wrapping a generator — nothing runs yet. Only when `take()` iterates the chain does each element flow through the pipeline one at a time. You don't need to build this yourself — neither `lazy.js` nor the native Iterator Helpers — it's here to show what's happening inside both.

---

## 6. Summary: Eager vs Lazy in JS/TS

| Approach | Syntax | Lazy | No intermediate arrays | Available |
|---|---|---|---|---|
| Native array methods | ✓ fluent | ✗ | ✗ | always |
| Manual `for` loop | verbose | ✓ | ✓ | always |
| Generator functions | awkward chaining | ✓ | ✓ | always |
| **`.values()` + Iterator Helpers** | **✓ fluent** | **✓** | **✓** | **ES2025** |
| `lazy.js` | ✓ fluent | ✓ | ✓ | always (library) |

For small arrays, native eager array methods are fine — the overhead is negligible and the readability is excellent. For large datasets where you're filtering down to a small result set, prepend `.values()` to your chain and you're on the lazy Iterator path with no library or refactor cost. Reach for `lazy.js` only if you're stuck supporting pre-ES2025 runtimes.

---

## How This Compares to Rust

In Rust, laziness is the default. Every iterator adapter is lazy out of the box — you don't need a wrapper class, generators, or a `.values()` hop. The compiler also collapses the entire chain into a single loop at compile time, as we showed with `cargo-show-asm` in part 1.

In modern JavaScript, eagerness is the default *on arrays*, but laziness is a single method call away. `array.values()` returns a native `Iterator`, and from there the chain runs on `Iterator.prototype` — lazy, no intermediate arrays, behaviour identical to Rust. The gap that this post was originally written to describe — "JS has no native lazy iterators" — closed when Iterator Helpers shipped in ES2025.

Two real differences remain. First, JS still defaults to eager when you call `.filter()` directly on an Array; you opt into laziness with `.values()`. Rust never has that choice — it's iterators all the way down. Second, Rust's compiler can collapse the chain into a single loop with no allocation; JS engines still pay for the Iterator object per chain. The *semantic* gap is closed. The *cost-model* gap is narrower than it was, but not zero.

The practical takeaway: if you reach for `.filter().map().take()` on a large array in modern JS, prepend `.values()`. You'll thank yourself the first time the array has a million elements.

::callout{product="kurippa"}
