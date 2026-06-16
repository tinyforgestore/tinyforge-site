---
title: "TauriのポップアップをmacOSのフルスクリーンアプリの上に表示する"
description: "フルスクリーンアプリに入った瞬間に消えてしまうホットキーポップアップは役に立たない。なぜ通常のTauriウィンドウはフルスクリーンSpaceに重ねられないのか、そしてNonactivating NSPanelへの変換でどう解決するか ── Spotlightのトリック。"
pubDate: 2026-06-22
tags: [tauri, macos, rust, kurippa]
category: dev
---

[以前の記事](/ja/blog/tauri-prewarm-performance/)では、ホットキーポップアップが一瞬で出るように[Kurippa](/products/kurippa)のウィンドウをpre-warmする話を書いた。あれは「ウィンドウがどれだけ速く出るか」を解決した。今回は、もっと二者択一な問題の話だ ── **そもそも出るのかどうか。**

フルスクリーンで動画を見ているとき、Keynoteでプレゼンしているとき、あるいは独立したmacOSのSpaceで最大化したエディタを使っているとき。そこでクリップボードマネージャーのホットキーを押してみてほしい。通常のTauriウィンドウだと、2つの悪いことのどちらかが起きる。何も出てこないか、表示するためにmacOSがフルスクリーンから引きずり出すか。SpotlightやRaycastはそうならない。いま何をしていようとその上にすっと現れ、キー入力を受け取り、下にあるSpaceをまったく乱さずに消える。

この違いは設定ではない。**ウィンドウの種類そのものが違う。**

---

## 1. 問題：フルスクリーンは独立したSpace

macOSでアプリをフルスクリーンにすると、単にリサイズされるのではなく、専用の**Space**に移る。SpaceはmacOSの仮想デスクトップで、フルスクリーンアプリはそれを丸ごと1つ占有する。

通常のウィンドウはどこかのSpaceに属している。それを表示するには、システムはそのウィンドウのあるSpaceに切り替える（=フルスクリーンアプリから蹴り出す）か、そもそも前面に出すのを拒否する。さらに悪いことに、通常のウィンドウを表示するということは**それを所有するアプリをアクティブにする**ということで、フルスクリーンSpaceの上でアプリをアクティブにすると、まさに避けたいSpace切り替えアニメーションが発動する。

作業の流れの途中で呼び出すユーティリティにとって、これは致命的だ。価値の本質は「いま、ここに、集中を切らさず一瞬で現れる」こと。呼び出すたびにやっていたことから引き剥がされるなら、使うのをやめてしまう。

---

## 2. うまくいかなかったこと：通常ウィンドウのチューニング

最初に思いつくのは、通常のTauri（tao/`NSWindow`）ウィンドウのまま、その**collection behaviour**（ウィンドウがSpaceやフルスクリーンとどう関わるかをウィンドウシステムに伝えるAppKitのビットマスク）を調整することだ。

これは3周やった。

- `NSWindowCollectionBehaviorCanJoinAllSpaces`を設定し、フルスクリーンを含むすべてのSpaceにウィンドウを描画させる。
- `NSWindowCollectionBehaviorFullScreenAuxiliary`を加え、フルスクリーンアプリと共存できるようにする。
- ウィンドウレベルを上げ、通常のアプリウィンドウより上に来るようにする。

これらはすべて、ウィンドウを正しい場所に*描画*させるところまではいく。だがどれも解決しないのが**キーフォーカス**だ。標準の`NSWindow`は、所有アプリがアクティブにならない限り、フルスクリーンSpace上でキーウィンドウになれない ── そしてそのアクティブ化こそがSpace切り替えを強制する。結果、見えているのに死んでいる（入力を受け取らない）ウィンドウか、フォーカスはできるがフルスクリーンから引き剥がさないと無理なウィンドウか、どちらかになる。

collection behaviourのつまみが制御するのは*ウィンドウがどこに描画されるか*だ。*アプリをアクティブにせずにウィンドウが何を許されるか*は変えられない。それはウィンドウのフラグではなく、**クラス**の性質だ。

---

## 3. なぜ`NSNonactivatingPanel`だけが効くのか

macOSで、**アプリをアクティブにせずに**キーフォーカスを取れるウィンドウクラスは厳密に1つだけある ── `NSWindowStyleMaskNonactivatingPanel`スタイルビットを立てた`NSPanel`だ。

```rust
// これを成立させるスタイルマスクのビット：1 << 7 = 128。
const NONACTIVATING_PANEL_MASK: ... = 1 << 7;

panel.set_style_mask(existing_mask | NONACTIVATING_PANEL_MASK);
```

このたった1ビットが、SpotlightやRaycastが使っているトリックのすべてだ。non-activating panelは、現在のSpace ── *フルスクリーンSpaceを含む* ── でキーウィンドウになり、キーボード入力を受け取れる。その間、所有アプリはバックグラウンドのまま。アクティブ化がない=Space切り替えもない。パネルは、目の前にあるものの上にただ現れる。

つまり本当の解決策はウィンドウのフラグではない。ウィンドウをまるごと別のクラスに変換することだ。

---

## 4. 変換：`tauri-nspanel`

Tauriは`NSPanel`を直接公開していないが、[`tauri-nspanel`](https://github.com/ahkohd/tauri-nspanel)クレートがそれをやってくれる ── 既存のTauri `WebviewWindow`をその場でパネルに変換するので、Web UIはまるごと保ったまま、下にあるネイティブの殻だけを差し替えられる。

プラグインを登録する（macOSのみ）。

```rust
let builder = tauri::Builder::default()
    // ...他のプラグイン...
    .plugin(tauri_plugin_store::Builder::new().build());

#[cfg(target_os = "macos")]
let builder = builder.plugin(tauri_nspanel::init());
```

そして`setup`内で、pre-warm済みのメインウィンドウを一度だけ変換し、dismiss用のobserverを設置する。

```rust
if let Some(main_win) = app.get_webview_window("main") {
    window::convert_main_to_panel(&main_win);
    window::observe_active_space_changes(app.handle());
    // ...既存のmove/position配線...
}
```

変換自体は、スタイルマスク、通常ウィンドウより上に浮くための高めのレベル、そして ── ここが肝心 ── プロセスの全寿命にわたってパネルを生かし続ける設定を行う（これは依然としてpre-warmパターンで、破棄して作り直すことは決してしない）。

```rust
// 通常のアプリウィンドウより上に来るよう、レベルを上げる。
panel.set_level(NS_POPUP_MENU_WINDOW_LEVEL);

// この単一パネルをアプリの全寿命にわたって再利用する（pre-warmパターン） ──
// 閉じる/隠すときにAppKitに解放させない。
panel.set_released_when_closed(false);
```

表示と非表示は、`window.show()/hide()`ではなくパネル経由になる。

```rust
// panel.show() は現在のSpace（フルスクリーン含む）で前面に出し、
// パネルをキーにする ── この変換の目的そのもの。
panel.show();

// パネル経由で隠し、AppKitがキーウィンドウ状態をきれいに片付けるようにする。
panel.order_out(None);
```

非自明なCargo配線が1つ。後述の`panel_delegate!`マクロは、古い`objc`クレートの`sel_impl!`を展開し、レガシーな`#[cfg(feature = "cargo-clippy")]`を吐く。現代のRustではこれが`unexpected_cfgs`リントに引っかかるので、そのcfgを「想定済み」と宣言しておく。

```toml
[lints.rust]
unexpected_cfgs = { level = "warn", check-cfg = ['cfg(feature, values("cargo-clippy"))'] }
```

---

## 5. Collection Behaviour：`CanJoinAllSpaces`ではなく`MoveToActiveSpace`

パネルにも依然としてcollection behaviourが必要で、一番ありそうな選択肢 ── `CanJoinAllSpaces` ── は間違いだ。

`CanJoinAllSpaces`はパネルを*すべての*Spaceに同時に描画する。実際には、Spaceを切り替えたとき、パネルはすでに切り替え先に描画されている。だから1〜2フレームのあいだ、dismissロジックが追いついて隠すより前に、新しいSpaceにパネルがちらつくのが見える。見栄えが悪い。

解決策は、パネルを単一のSpaceに置き、表示時にだけアクティブなSpaceへ*移動*させることだ。

```rust
panel.set_collection_behaviour(
    NSWindowCollectionBehavior::NSWindowCollectionBehaviorMoveToActiveSpace
        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary,
);
```

- **`MoveToActiveSpace`** ── パネルは表示時に（`order front regardless`で）アクティブなSpaceへ移る。遍在させない。Space切り替え時のちらつきがない。
- **`FullScreenAuxiliary`** ── そもそもフルスクリーンアプリの上に現れる権利を与えるビット。この機能全体にとって譲れない。

`FullScreenAuxiliary`はフルスクリーン重ね表示を*許可する*もの。`MoveToActiveSpace`はそれを*きれいに保つ*ものだ。

---

## 6. パネルのdismiss：2つのネイティブ経路

ここが一番時間を食った落とし穴だ。`tauri-nspanel`はパネルの挙動を移植するために**`NSWindow`クラスをswizzleする**。このswizzleがTauriの`onFocusChanged`イベントを壊す ── フロントエンドがまさに「ウィンドウがフォーカスを失ったので自分をdismissすべき」と知るために通常頼っているものだ。

そのためmacOSでは、dismissをネイティブで駆動するしかない。しかも**2つ**のobserverが要る。捕まえるものが違うからだ。

**(a) resign-keyデリゲート** ── パネルがキーフォーカスを失ったときに発火する。外側をクリックした、あるいは別のアプリに切り替えた場合だ。

```rust
let delegate = panel_delegate!(KurippaPanelDelegate {
    window_did_resign_key
});
delegate.set_listener(Box::new(move |name: String| {
    if name == "window_did_resign_key" {
        if let Ok(panel) = app_handle.get_webview_panel("main") {
            panel.order_out(None);
        }
        let _ = app_handle.emit(crate::events::PANEL_DISMISSED, ());
    }
}));
panel.set_delegate(delegate);
```

**(b) active-space observer** ── ユーザーがSpaceを切り替えたときに発火する。Space切り替えは必ずしもパネルにキーを失わせないので、デリゲートだけでは捕まえられない。`NSWorkspace`の通知なら捕まる。

```rust
let block = RcBlock::new(move |_notification: NonNull<NSNotification>| {
    let Some(window) = app_handle.get_webview_window("main") else { return; };
    // 可視性ガード：隠れているときのSpace切り替えはno-opでなければならない。
    if !window.is_visible().unwrap_or(false) { return; }
    if let Ok(panel) = app_handle.get_webview_panel("main") {
        panel.order_out(None);
    }
    let _ = app_handle.emit(crate::events::PANEL_DISMISSED, ());
});

let workspace = NSWorkspace::sharedWorkspace();
let center = workspace.notificationCenter();
let observer = center.addObserverForName_object_queue_usingBlock(
    Some(NSWorkspaceActiveSpaceDidChangeNotification), None, None, &block,
);
// パネルはプロセス全体で厳密に1つ。observerはこの関数より長生きしないと
// 発火しなくなる。block と token は意図的にリークさせる。
std::mem::forget(block);
std::mem::forget(observer);
```

両経路とも、やることは同じ2つだ。パネルを`order_out`し、`PANEL_DISMISSED`イベントをemitする。フロントエンドはそのイベントを購読し、transientなUI状態をリセットする ── 検索クエリとプレビュー状態のクリア ── 旧来のフォーカス喪失経路がやっていたのと同じリセットだ。

```ts
// macOSのみ：tauri-nspanelがNSWindowをswizzleし、onFocusChangedを壊す。
// ネイティブのresign-keyデリゲートがPANEL_DISMISSEDをemit ── 同じリセットを走らせる。
useEffect(() => {
  let unlisten: (() => void) | undefined;
  listen(PANEL_DISMISSED, () => dismiss()).then((fn) => { unlisten = fn; });
  return () => unlisten?.();
}, [dismiss]);
```

`onFocusChanged`リスナーは同じフックの中に残っている ── ただし今はWindowsとLinuxでだけdismissを駆動する。そこではswizzleが効かず、イベントが通常どおり動くからだ。

---

## 7. まとめ

フルスクリーンアプリの上に現れることは、ウィンドウの*設定*のように見える。違う ── ウィンドウの*クラス*の問題だ。collection behaviourをどれだけチューニングしても、通常の`NSWindow`に肝心のものは与えられない。アプリをアクティブにせずにフルスクリーンSpaceでキーフォーカスを取ること。それができるのは`NSNonactivatingPanel`だけだ。

解決策のかたち：

- pre-warm済みウィンドウを`tauri-nspanel`でパネルに変換する（スタイルマスク`NonactivatingPanel`、高めのレベル、解放しない）。
- collection behaviourは`MoveToActiveSpace | FullScreenAuxiliary` ── 前者がSpace切り替えをちらつきなく保ち、後者がフルスクリーン重ね表示を許可する。
- dismissはネイティブで駆動する（resign-keyデリゲート**と**active-space observer）。パネルのswizzleが`onFocusChanged`を壊すからだ。

そして、必要なところにだけスコープを絞る。

```rust
#[cfg(not(target_os = "macos"))]
pub fn convert_main_to_panel(_window: &WebviewWindow) {
    // 非macOS：ウィンドウはデフォルトでフルスクリーンアプリの上に現れる。no-op。
}
```

WindowsとLinuxは最初からフルスクリーンに重なる。この一連の踊りは、macOSが望むやり方でそれをやるための代償だ ── そして一度払ってしまえば、ポップアップはSpotlightとまったく同じ場所に現れる。

::callout{product="kurippa"}
