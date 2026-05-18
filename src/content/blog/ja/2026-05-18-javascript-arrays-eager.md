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

> **追記（2026-05-18）**：セクション4を追加。ES2025でIterator Helpersが入ったため、元の構成 — 「JSで遅延評価するにはジェネレータかライブラリが必要」 — はモダンランタイムでは既に古い。`[...].values().filter(...).map(...).take(...).toArray()`はネイティブで遅延評価される。セクション5（旧セクション4）はlazy.jsを「ES2025以前のフォールバック」として位置付け直した。Zennのコメントで指摘してくれた[juner](https://zenn.dev/juners)さんに感謝。

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

## 4. モダンJS：Iterator Helpers（ES2025）

ここまでの話 — JSで遅延チェーンを書くにはジェネレータかライブラリが必要 — は、つい最近まで本当だった。**ES2025**で[Iterator Helpersプロポーザル](https://github.com/tc39/proposal-iterator-helpers)がStage 4に到達し、仕様に取り込まれた。`Array.prototype.values()`はネイティブの[`Iterator`](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Iterator)オブジェクトを返し、`Iterator.prototype`に `.filter()`、`.map()`、`.take()`、`.drop()`、`.toArray()`、`.reduce()` などが遅延評価で備わった。

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

6回の操作、中間配列なし、挙動はRustと同じ。ライブラリも、ジェネレータラッパーも、`LazySeq`クラスも要らない。

決定的なのは`.values()`だ。Arrayに*直接*`.filter()`を呼び出すと`Array.prototype.filter`が走る — 積極評価、セクション1の挙動。`.values()`を経由するとネイティブの`Iterator`が返り、そこからチェーンは`Iterator.prototype`を辿って遅延評価になる。メソッド呼び出し1回分の差で、挙動はまったく逆だ。

**ランタイムサポート**：Chrome 122+（2024年3月）、Firefox 131+（2024年10月）、Safari 18.4+（2025年3月）、Node 22+。アクティブに開発されているJSエンジンならどれでも動く。

これでこの記事の冒頭の問いはほぼ閉じる。JSは*デフォルトでは*積極評価の配列メソッドを持つ。だが`.values()`を1回挟むだけで、Rustライクな遅延イテレーションがネイティブに手に入る。「デフォルトで遅延」（Rust）と「必要に応じて遅延」（JS）の差は、今やメソッド1個分の幅しかない。

---

## 5. ES2025以前：フォールバックとしての`lazy.js`

[lazy.js](https://danieltao.com/lazy.js/)はジェネレータパターンを、ネイティブの配列メソッドそっくりに見える流暢なAPIでラップしている。Iterator Helpersが出る前は定番の答えだったし、2024年以前のブラウザやNode 22未満を相手にする必要があるなら今でも正解だ。

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

各アダプタメソッドは、ジェネレータをラップした新しい`LazySeq`を返す — まだ何も動いていない。`take()`がチェーンをイテレートしたときに初めて、各要素がパイプラインを一つずつ流れる。これを自分で書く必要はない — `lazy.js`もネイティブのIterator Helpersも — 両者の内部で起きていることを示すためのスケッチだ。

---

## 6. まとめ：JS/TSにおける積極 vs 遅延

| アプローチ | 構文 | 遅延 | 中間配列なし | 利用可能 |
|---|---|---|---|---|
| ネイティブ配列メソッド | ✓ 流暢 | ✗ | ✗ | 常に |
| 手書きforループ | 冗長 | ✓ | ✓ | 常に |
| ジェネレータ関数 | チェーンが不格好 | ✓ | ✓ | 常に |
| **`.values()` + Iterator Helpers** | **✓ 流暢** | **✓** | **✓** | **ES2025** |
| `lazy.js` | ✓ 流暢 | ✓ | ✓ | 常に（ライブラリ） |

小さな配列ならネイティブの積極評価メソッドで十分だ — オーバーヘッドは無視できる範囲で、可読性はむしろ優れている。大きなデータセットを絞り込んで小さな結果を取り出す場合は、チェーンの先頭に`.values()`を付けるだけで、ライブラリもリファクタも不要なまま遅延評価のIteratorパスに乗れる。`lazy.js`に手を伸ばすのは、ES2025以前のランタイムを相手にせざるを得ないときだけだ。

---

## Rustとの違い

Rustでは遅延がデフォルトだ。すべてのイテレータアダプタは最初から遅延 — ラッパークラスも、ジェネレータも、`.values()`の経由も要らない。さらにコンパイラがチェーン全体をコンパイル時に1本のループに畳み込む — パート1の`cargo-show-asm`で見たとおりだ。

モダンなJavaScriptでは、*配列に対しては*積極評価がデフォルトだが、遅延評価はメソッド呼び出し1回分の距離にある。`array.values()`はネイティブの`Iterator`を返し、そこからチェーンは`Iterator.prototype`を辿る — 遅延、中間配列なし、Rustと同じ挙動。この記事が当初書こうとしていた話 — 「JSにはネイティブな遅延イテレータがない」 — はES2025でIterator Helpersが入ったことで閉じた。

実際の差は2つ残っている。1つ目、JSはArrayに直接`.filter()`を呼ぶとデフォルトで積極評価になる。遅延に切り替えるには`.values()`でオプトインする必要がある。Rustにはその選択肢が存在しない — 最初から最後までイテレータだ。2つ目、Rustのコンパイラはチェーンをアロケーションなしの1本のループに畳み込めるが、JSのエンジンはチェーンごとにIteratorオブジェクトの確保コストを払う。*意味論*のギャップは閉じた。*コストモデル*のギャップは以前より狭くなったが、ゼロではない。

実践的な結論：モダンJSで大きな配列に対して`.filter().map().take()`を書こうとしたら、先頭に`.values()`を付ける。配列が100万要素のときに、自分に感謝することになる。

::callout{product="kurippa"}
