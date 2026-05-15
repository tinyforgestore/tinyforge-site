---
title: "JavaScriptの配列は「働き者」だ — その代償を測る"
description: "JavaScriptの配列メソッドはなぜ必要以上に動くのか — そしてジェネレータやlazy.jsで取り戻せるもの。"
pubDate: 2026-05-18
tags: [typescript, javascript, performance, iterators, lazy-evaluation]
category: dev
mirrors:
  zenn: https://zenn.dev/link/articles/a6213e7922e838
---

> 遅延イテレータシリーズのパート2。
> パート1：[Rustのイテレータは「怠け者」だ — ログで証明する](/ja/blog/rust-iterator-lazy/)

---

[前回の記事](/ja/blog/rust-iterator-lazy/)で、Rustのイテレータが遅延評価であることを証明した — 1要素ずつパイプラインを流れ、必要な分だけ処理して止まる。

JavaScriptの配列はそうは動かない。そしてその差には、実際のコストがある。

---

## 1. デフォルト：積極評価（Eager Evaluation）

JavaScriptでは、配列メソッドはすべて新しい配列を作り、全要素を即座に処理する。

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

### 実行結果

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

何が起きたか：

- `filter` は10要素すべてに走った
- `map` はfilterの結果5件すべてに走った
- `slice(0, 3)` でそのうち2件を捨てた

3件の結果を得るために15回の操作。Rustの同等コードと比べてほしい — 6回で済み、3件が揃った時点で止まった。

これが積極評価だ：各メソッドが完全に終わってから次に進む。中間配列（filter後の`[2, 4, 6, 8, 10]`）が確保され、すぐに捨てられる。

小さな配列なら気にならない。だがログ、検索結果、データ処理など、大きなデータセットではコストになる。

---

## 2. 手書きループならマシか？

マシだ。手書きループは、自分で「いつ止めるか」を制御できるぶん、デフォルトで遅延的に動く：

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

### 実行結果

```
  checking: 1
  checking: 2
  checking: 3
  checking: 4
  checking: 5
  checking: 6

result: [20, 40, 60]
```

6回 — Rustと同じだ。3件揃った時点でループは止まり、7〜10の要素には一切触れない。

問題は可読性だ。`.filter().map().slice()` のチェーンは表現力があり、追いやすい。手書きループとbreak条件は手続き的で、組み合わせにくい。ロジックが複雑になればなるほど、ループは読みづらく、保守しにくくなる。

---

## 3. TypeScriptで遅延評価する — ジェネレータベース

JavaScriptには遅延シーケンスのためのネイティブな仕組みがある：**ジェネレータ**だ。ジェネレータ関数は値を一つずつ、必要なときだけ生成する。中間配列は確保しない。

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

// 使い方
const data = Array.from({ length: 10 }, (_, i) => i + 1);

const filtered = lazyFilter(data, x => x % 2 === 0);
const mapped = lazyMap(filtered, x => x * 10);
const result = take(mapped, 3);

console.log('\nresult:', result);
```

### 実行結果

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

6回の操作。要素7〜10には触れていない。挙動はRustと同じだ — 1要素がパイプラインを通り抜け、`take` が必要数を満たした時点でチェーンは止まる。

ジェネレータ関数は組み合わせやすく読みやすいが、`.filter().map()` のような流暢なチェーン構文と比べると、繋ぐ書き方は少し不格好だ。

---

## 4. Lazy.js — 流暢な遅延評価

[lazy.js](https://danieltao.com/lazy.js/) はジェネレータパターンを、ネイティブの配列メソッドそっくりに見える流暢なAPIでラップしている。ジェネレータは自分で書かない — ライブラリが内部で処理してくれる。

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

これだけだ。ネイティブ配列メソッドと同じ書き味でチェーンしているが、`.toArray()` が呼ばれるまで何も評価されない — そして `take(3)` が満たされた時点で止まる。6回の操作、中間配列の確保なし。

**内部の仕組み** — ライブラリが内部で何をしているか興味があれば、本質的にはこのパターンだ：

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

各アダプタメソッドは、ジェネレータをラップした新しい `LazySeq` を返す — まだ何も動いていない。`take()` がチェーンをイテレートしたときに初めて、各要素がパイプラインを一つずつ流れる。これを自分で書く必要はない。ライブラリがこう動く理由を示すためのスケッチだ。

---

## 5. まとめ：JS/TSにおける積極 vs 遅延

| アプローチ | 構文 | 遅延 | 中間配列なし |
|---|---|---|---|
| ネイティブ配列メソッド | ✓ 流暢 | ✗ | ✗ |
| 手書きforループ | 冗長 | ✓ | ✓ |
| ジェネレータ関数 | チェーンが不格好 | ✓ | ✓ |
| lazy.js | ✓ 流暢 | ✓ | ✓ |

小さな配列ならネイティブメソッドで十分だ — オーバーヘッドは無視できる範囲で、可読性はむしろ優れている。大きなデータセットを絞り込んで小さな結果を取り出す場合は、遅延アプローチで中間配列の確保と破棄を避けられる。

---

## Rustとの違い

Rustでは遅延がデフォルトだ。すべてのイテレータアダプタは最初から遅延 — ラッパークラスもジェネレータも要らない。さらにコンパイラがチェーン全体をコンパイル時に1本のループに畳み込む — パート1の `cargo-show-asm` で見たとおりだ。

JavaScript/TypeScriptでは、積極評価がデフォルトで、遅延は明示的なオプトインが必要だ — 手書きループ、ジェネレータ、あるいは上の `LazySeq` クラスのようなラッパー。

どちらが間違いというわけではない — 設計の優先順位が違うだけだ。違いを知っていれば、必要なときに適切な道具を選べる。

::callout{product="kurippa"}
