---
title: "Tauriのコールド起動は約1秒かかった。それを「一瞬」に変えた方法。"
description: "Tauriのウェブビューをプリウォームすることで、ホットキーポップアップの遅延をコールド起動の約1秒からAPI時間で約15µsまで短縮した方法 — UIをSwiftUIに書き直さずに。"
pubDate: 2026-04-28
tags: [tauri, macos, performance, kurippa]
category: dev
---

[Kurippa](/products/kurippa) — macOS向けのキーボードファーストなクリップボードマネージャー — を作り始めたとき、バグよりも気になることがあった。

アプリは動いていた。UIも思い通りに仕上がっていた。でも、ホットキーで呼び出すたびに、ウィンドウが表示されるまでのわずかな間があった。クラッシュでも、エラーでもない。ただ……何も起きない瞬間。

クリップボードマネージャーにとって、この間は致命的だ。作業の流れの中でショートカットを押したのに、即座にアクセスできずに待たされる。小さな摩擦だが、それが毎回続く。

この記事では、なぜそうなるのか、代替手段としてどんな選択肢があるか、そしてすでに構築したWebUIスタックを捨てずにどう解決したかを説明する。

---

## 1. トレードオフ：Web UI vs ネイティブUI

TauriはWebフロントエンド — HTML、CSS、Reactなど — をネイティブのWebKitウェブビュー内でレンダリングすることで、デスクトップアプリを構築できるフレームワークだ。メリットは大きい：Webプラットフォームの表現力をフルに使える。アニメーション、複雑なレイアウト、デザインシステム、コンポーネントライブラリ — すべてそのまま動く。

コストは、ウェブビューが軽量ではないという点だ。アプリのウィンドウが開くとき、Tauriは以下を実行する必要がある：

1. WebKit XPCヘルパープロセスの起動
2. HTML/JSバンドルの読み込み
3. React（または同等のもの）のコード実行
4. 最初のフレームの描画

macOSでは、Tauriのコールド起動からウィンドウが完全に描画されるまで、およそ **約1秒** かかる。「即座」に反応すべきメニューバーやホットキートリガーのユーティリティにとって、これは本物の問題だ。

ネイティブUIフレームワークにはこのコストがない。SwiftUIのウィンドウはシステムのプリミティブを使って直接レンダリングされる — ウェブビューも、JSランタイムも、バンドルのパースも不要だ。トレードオフは、より制約の多いツールキットで作業することになる点だ。

数値で具体的に見てみよう。

---

## 2. ベースライン：Tauri vs SwiftUI

起動コストを切り分けるために、両方で同じ最小限のアプリを作成した：検索フィールドと10件の静的アイテムのリストを持つフローティングウィンドウ。凝ったものではなく、代表的なUIとして十分な内容だ。

### SwiftUI — 最小限のリストウィンドウ

```swift
import SwiftUI

@main
struct NativeListApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    @State private var query = ""

    let items = (1...10).map { "Item \($0)" }

    var filtered: [String] {
        query.isEmpty ? items : items.filter { $0.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        VStack(spacing: 0) {
            TextField("検索...", text: $query)
                .textFieldStyle(.roundedBorder)
                .padding(10)

            List(filtered, id: \.self) { item in
                Text(item)
            }
        }
        .frame(width: 320, height: 400)
    }
}
```

### Tauri + React — 同等の最小限リストウィンドウ

```rust
// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```tsx
// src/App.tsx
import { useState } from "react";

const ITEMS = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);

export default function App() {
  const [query, setQuery] = useState("");

  const filtered = query
    ? ITEMS.filter((item) =>
        item.toLowerCase().includes(query.toLowerCase())
      )
    : ITEMS;

  return (
    <div style={{ width: 320, height: 400, display: "flex", flexDirection: "column" }}>
      <input
        type="text"
        placeholder="検索..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ margin: 10, padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" }}
      />
      <ul style={{ flex: 1, overflowY: "auto", margin: 0, padding: 0, listStyle: "none" }}>
        {filtered.map((item) => (
          <li key={item} style={{ padding: "8px 16px", borderBottom: "1px solid #eee" }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 計測結果

| メトリクス | SwiftUI（ネイティブ） | Tauri（Rust + WebKit） |
|---|---|---|
| コールド起動（バイナリ → ウィンドウ表示） | 約1秒 | 約1秒 |
| アイドルRSS — メインプロセス | 63 MB | 81 MB |
| アイドルRSS — WebKit XPCヘルパー込み | 63 MB | 約159 MB（4プロセス） |
| バイナリサイズ | 約50 KB Mach-O | 8.1 MB |
| `.app`バンドル | なし（生バイナリ） | 8.2 MB |
| DMG | なし | 2.9 MB |

コールド起動時間はこのスケールでは似たように見える。だがメモリは別の話だ：Tauriは **4つの独立したプロセス** を起動する — メイン + GPU + WebContent + Networking — アイドル時に合計約159 MBを消費する。SwiftUIは63 MBの単一プロセスだ。一日中バックグラウンドで常駐するユーティリティにとって、この差は無視できない。

それよりも重要なのは、コールド起動はホットキーアプリの本当のボトルネックではないという点だ。次のセクションで説明する。

---

## 3. ウォームショーがまだ遅い理由

クリップボードマネージャーの場合、アプリは常に起動している — ホットキーで1日に何十回も呼び出す。重要なのはコールド起動時間ではなく、呼び出しのたびにウィンドウがどれだけ速く表示されるかだ。

素朴なアプローチは、ウィンドウを閉じるたびに破棄し、ホットキーが押されるたびに再作成することだ。これは毎回フルのウェブビュースピンアップを引き起こす：WebKitプロセスの初期化、Reactのマウント、最初の描画。コールドパスはセットアップだけで約225 ms、そこにReactのマウントと最初の描画が加わり — 完全な描画まで **約1秒** かかり、可能な限りに比べて **生のAPI時間で50,000倍遅い**。

スイッチを切り替えるように感じるべきものにとって、これが解決すべき問題だ。

---

## 4. プリウォームテクニック

解決策は **ウィンドウを破棄しない** ことだ。閉じるときにウェブビューを破棄する代わりに、クローズイベントをインターセプトしてキャンセルし、`hide()`を呼び出す。ウェブビュープロセスは生き続ける。Reactツリーはマウントされたまま。DOMはメモリに保持される。

ホットキーが発火したとき、必要なのは `show()` + `set_focus()` だけだ — ウィンドウサーバーは既存の `NSWindow` を可視状態にするだけでいい。再ビルドなし、Reactの再マウントなし、WebKitのスピンアップなし。

```rust
// src-tauri/src/lib.rs
use tauri::{Manager, WindowEvent};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    // クローズをインターセプト — 破棄の代わりに非表示にする
                    api.prevent_close();
                    window.hide().unwrap();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

これがまさにKurippaが行っていることだ。ユーザーが赤いトラフィックライトボタンをクリックすると、ウィンドウは消える — でもウェブビューはバックグラウンドでウォームな状態を保ち、即座に再表示できる準備ができている。

---

## 5. プリウォームの結果

| パス | API呼び出し時間 | ユーザーが知覚する遅延 |
|---|---|---|
| コールド起動（プロセス開始 → 最初の描画） | n/a | セットアップまで約225 ms、完全描画まで約1秒 |
| `window.hide()` | 約7 µs | 即座 |
| `window.show()` + `set_focus()`（プリウォーム済み） | 約15〜18 µs | 即座 |

`show()` の呼び出しは **マイクロ秒** で返る — macOSウィンドウサーバーに「この`NSWindow`を表示せよ」というIPCメッセージを送るだけだからだ。WebView、Reactツリー、DOMは一切破棄されない。メモリに一時停止した状態で保持され、即座に再開される。

プリウォーム済みのショーに残るユーザー知覚遅延は、macOSのウィンドウフェードアニメーション（数十ミリ秒）によるものであり、TauriやReactは関係ない。ホットキーポップアップとして、60 Hzでの1フレームをはるかに下回る。

前後を比較すると：コールドパスは生のAPI時間でプリウォームショーより **約50,000倍遅い**。ユーザー知覚時間では10〜50倍程度だが、いずれにせよ — この差が「即座」と「気になる遅延」の分かれ目だ。

::callout{product="kurippa"}

---

## 6. トレードオフ

プリウォームはタダではない。受け入れるものを把握しておこう：

**メモリコストは永続的だ。** 約159 MBのRSSはウィンドウが「閉じられて」いても常駐し続ける。一日中起動しているホットキーランチャーなら許容範囲だ。たまにしか開かない重量級アプリには無駄になる。

**状態の自動リセットがない。** クローズしてもフォームの入力やスクロール位置はクリアされない — UXとして必要なら、非表示ロジックの中で明示的に処理する必要がある。

**バックグラウンドCPU。** 非表示のWebViewに有効なタイマーやアニメーションがあれば、そのまま実行され続ける。Reactツリーに `setInterval` や `requestAnimationFrame` ループがある場合は、可視性フラグでゲートしよう。

参考として、SwiftUIの同等手法は `NSWindow.orderOut(nil)` / `makeKeyAndOrderFront(nil)` だ — 同じ発想、同じマイクロ秒レベルのAPIコスト、ただしメモリベースラインは約159 MBではなく約63 MBから始まる。

---

## まとめ

Tauriのコールド起動コストは現実だ — 完全な描画まで約1秒、常駐プロセスで約159 MB。しかしホットキーで常時起動するユーティリティにとって、コールド起動は間違ったメトリクスだ。クローズをインターセプトして `hide()` を呼び出すことでウェブビューをプリウォームすれば、呼び出し時のレイテンシはAPI時間で約15 µs まで下がる — ユーザーにとって事実上「即座」であり、コストはバックグラウンドでウォームに保持されたメモリだけだ。
