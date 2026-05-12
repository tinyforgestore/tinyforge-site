---
title: "Rustのイテレータは「怠け者」だ — ログで証明する"
description: "Rustのイテレータの遅延評価を、println、criterionベンチマーク、cargo-show-asmで実際に確かめる。"
pubDate: 2026-05-11
tags: [rust, performance, iterators]
category: dev
---

Rustのイテレータは **遅延評価（lazy evaluation）** だ。

「知ってる」と思ったかもしれない。でも本当に理解しているかを確かめるには、実際にログを仕込んで動かしてみるのが一番だ。

`.filter()` → `.map()` → `.take()` と3つのアダプタをチェーンしたとき、何回処理が走ると思うか？ 要素数をNとして、3N回？ それとも別の数？

答えは「必要な分だけ」だ。

---

## 1. 素朴な予想 vs 実際の動作

10要素のVecに対して次の処理をするとしよう：

- 偶数だけを残す（filter）
- 10倍にする（map）
- 最初の3件だけ取る（take）

**素朴な予想：**

```
filter × 10回 → map × 5回（偶数が5個）→ take × 3件 = 合計18回
```

全部のfilterが終わってから次に進む、というイメージ。実際には**そうならない**。

### コード

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

### 実行結果

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

### 何が起きているか

filterとmapが**交互に**呼ばれている。filterが10回走り終わってからmapが走るのではない。

1要素ずつ、パイプラインを通過する。`take(3)` が3件揃った時点で、**残りの要素には一切触れない**。

- 処理された要素数：1〜6（7〜10は触れられていない）
- filterの呼び出し回数：6回（10回ではない）
- mapの呼び出し回数：3回（5回ではない）

これが遅延評価だ。`collect()` が呼ばれるまで、パイプライン全体は**何もしない**。要素を一個ずつ引っ張りながら、必要な数だけ処理して止まる。

---

## 2. N回 vs 4N回 — チェーンしても増えない

では、アダプタを4つにしたら処理回数は4倍になるか？

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

### 実行結果

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

アダプタが4つになっても、処理は「1要素がパイプラインを通り抜ける」という単位で進む。20要素に対して4N回 = 80回走るのではなく、3件取れた時点で止まる。

これがRustのイテレータが**ゼロコスト抽象**と呼ばれる理由の一つだ。どれだけアダプタをチェーンしても、実行時のループは1本になる。

---

## 3. ベンチマークで確認する — criterion

ログで動作は分かった。では**パフォーマンスはどうか**。

チェーンしたイテレータは読みやすいが、手書きの `for` ループより遅いのでは？ というのが自然な疑問だ。`criterion` を使って確かめる。

### セットアップ

プロジェクト構成：

```
benches/iterator_bench.rs
Cargo.toml
src/lib.rs        ← 空でよい
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

`#[inline(never)]` を付ける理由：付けないとコンパイラがベンチマークハーネス側に関数をインライン展開し、境界をまたいだ最適化が走って測定値が信頼できなくなる。`black_box` が入力側の最適化を防ぎ、`#[inline(never)]` が関数単体の計測を保証する。

```bash
cargo bench
```

### 結果

```
chained_iterator  time: [17.628 ns 17.669 ns 17.716 ns]
manual_loop       time: [18.279 ns 18.347 ns 18.416 ns]
```

数値はほぼ同じだ。誤差の範囲内で、むしろイテレータの方がわずかに速い。

これは偶然ではない。LLVMはクリーンなイテレータチェーンに対して、手書きループよりも積極的な最適化を適用することがある。少なくとも「遅くなる」ことはない。

チェーンしたイテレータは、手書きループと**同等以上のパフォーマンス**になる。アダプタをいくつ重ねても、実行時のコストは増えない。

これがRustの「ゼロコスト抽象」の意味だ — 抽象化のための実行時コストがゼロ。

---

## 4. なぜ同じなのか — cargo-show-asm で確認する

criterionで数値が同じになった理由を、アセンブリで確かめる。

コンパイラはチェーンしたイテレータを、リリースビルドで**1本のループ**に畳み込む。アダプタごとの関数呼び出しは全てインライン展開され、中間アロケーションも発生しない。

### セットアップ

```bash
cargo install cargo-show-asm
```

関数はベンチファイルにあるため、`--bench` フラグで対象を指定する：

```bash
cargo show-asm --release --bench iterator_bench chained_iterator
cargo show-asm --release --bench iterator_bench manual_loop
```

### 結果

両方のASMを並べると、コンパイラが同じ構造のコードを生成していることがわかる。

**共通パターン（両方に存在）：**

- **`take(3)` のアンロール** — カウントループではなく、3回分のブロックが個別に展開されている（`LBB38_7/14/21` と `LBB39_1/6/10`）
- **ビットテストによる偶数チェック** — `x % 2 == 0` が `tbnz w8, #0` 1命令にコンパイルされている
- **乗算なしの `x * 10`** — `add w8, w8, w8, lsl #2` + `lsl w8, #1`（シフトと加算で代替）

**注目すべき差異：**

`chained_iterator` の方がASMが短い。`manual_loop` は例外処理のセットアップ（`.cfi_personality`、`Lexception` ブロック）と `grow_one` 呼び出しを持つが、`chained_iterator` はコンパイラがアロケーションパターンを最適化し、upfrontの `__rust_alloc` 1回に畳み込んでいる。

これがベンチマークでイテレータがわずかに速かった理由だ。抽象化のコストがゼロなだけでなく、LLVMがクリーンなイテレータチェーンに対してより積極的な最適化を適用できた結果、手書きループより少ないオーバーヘッドになった。

> **補足：** このASMはApple Silicon（ARM64/AArch64）上の結果。x86_64では命令セットは異なるが、同じ最適化パターンが適用される。

---

**まとめると：**

```
ログ    → 動作の証明（遅延評価、早期終了）
bench   → パフォーマンスの証明（同等以上）
ASM     → なぜ同等なのかの説明（同じ構造にコンパイルされる）
```

チェーンしたイテレータは読みやすく、手書きループと同等以上に速い。これがゼロコスト抽象だ。

::callout{product="kurippa"}
