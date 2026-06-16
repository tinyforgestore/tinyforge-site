---
title: "Making a Tauri Popup Appear Over macOS Fullscreen Apps"
description: "A hotkey popup that vanishes the moment you're in a fullscreen app is useless. Here's why a normal Tauri window can't overlay fullscreen Spaces, and how converting it to a non-activating NSPanel fixes it — the Spotlight trick."
pubDate: 2026-06-22
tags: [tauri, macos, rust, kurippa]
category: dev
---

In an [earlier post](/blog/tauri-prewarm-performance/) I wrote about pre-warming [Kurippa](/products/kurippa)'s window so the hotkey popup feels instant. That solved *how fast* the window appears. This post is about a problem that's more binary: **whether it appears at all.**

Watch a fullscreen video, present a Keynote deck, or work in a maximized editor on its own macOS Space, then hit your clipboard-manager hotkey. With a plain Tauri window, one of two bad things happens: nothing shows up, or macOS yanks you out of fullscreen to display it. Spotlight and Raycast don't do that — they slide in over whatever you're doing, take your keystrokes, and disappear without ever disturbing the Space underneath.

That difference isn't a setting. It's a different *kind of window*.

---

## 1. The Problem: Fullscreen Is Its Own Space

When you fullscreen an app on macOS, it doesn't just resize — it moves into a dedicated **Space**. Spaces are macOS's virtual desktops, and a fullscreen app gets one all to itself.

An ordinary window belongs to a Space. To show it, the system either switches to the Space it lives on (kicking you out of your fullscreen app) or refuses to bring it forward at all. Worse, showing a normal window means **activating the app that owns it** — and activating an app over a fullscreen Space triggers exactly the Space-switch animation you're trying to avoid.

For a utility you summon mid-flow, that's fatal. The whole value proposition is "appear instantly, right here, without breaking my focus." If summoning it tears you out of the thing you were doing, you stop using it.

---

## 2. What Didn't Work: Tuning a Normal Window

The obvious first move is to keep the regular Tauri (tao/`NSWindow`) window and adjust its **collection behaviour** — the AppKit bitmask that tells the window system how a window relates to Spaces and fullscreen.

I went three rounds on this:

- Setting `NSWindowCollectionBehaviorCanJoinAllSpaces` so the window renders on every Space, including fullscreen ones.
- Adding `NSWindowCollectionBehaviorFullScreenAuxiliary` so it's allowed to coexist with a fullscreen app.
- Bumping the window level so it sits above ordinary app windows.

All of that gets the window to *draw* in the right place. What none of it fixes is **key focus**. A standard `NSWindow` cannot become the key window on a fullscreen Space without its owning app being activated — and that activation is what forces the Space switch. So you end up with a window that's visible but dead (it won't take your typing), or one that's focusable but only by ripping you out of fullscreen.

The collection-behaviour knobs control *where a window is drawn*. They don't change *what a window is allowed to do without app activation*. That's a property of the window's class, not its flags.

---

## 3. Why Only `NSNonactivatingPanel` Works

There is exactly one window class on macOS that can take key focus **without activating its application**: an `NSPanel` with the `NSWindowStyleMaskNonactivatingPanel` style bit set.

```rust
// The style-mask bit that makes this work: 1 << 7 = 128.
const NONACTIVATING_PANEL_MASK: ... = 1 << 7;

panel.set_style_mask(existing_mask | NONACTIVATING_PANEL_MASK);
```

That single bit is the whole trick Spotlight and Raycast use. A non-activating panel can become key on the current Space — *including a fullscreen Space* — and accept keyboard input, while the app it belongs to stays in the background. No activation means no Space switch. The panel simply appears over whatever is in front of you.

So the real fix isn't a flag on the window. It's converting the window into a different class entirely.

---

## 4. The Conversion: `tauri-nspanel`

Tauri doesn't expose `NSPanel` directly, but the [`tauri-nspanel`](https://github.com/ahkohd/tauri-nspanel) crate does — it converts an existing Tauri `WebviewWindow` into a panel in place, so you keep your whole web UI and just swap the native shell underneath it.

Register the plugin (macOS only):

```rust
let builder = tauri::Builder::default()
    // ...other plugins...
    .plugin(tauri_plugin_store::Builder::new().build());

#[cfg(target_os = "macos")]
let builder = builder.plugin(tauri_nspanel::init());
```

Then, in `setup`, convert the pre-warmed main window once and install the dismiss observer:

```rust
if let Some(main_win) = app.get_webview_window("main") {
    window::convert_main_to_panel(&main_win);
    window::observe_active_space_changes(app.handle());
    // ...existing move/position wiring...
}
```

The conversion itself sets the style mask, an elevated level so it floats above ordinary windows, and — crucially — keeps the panel alive for the whole process (this is still the pre-warm pattern; we never destroy and recreate it):

```rust
// Elevated level so it sits above ordinary app windows.
panel.set_level(NS_POPUP_MENU_WINDOW_LEVEL);

// We reuse this single panel for the app's lifetime (pre-warm pattern) —
// do not let AppKit release it when closed/hidden.
panel.set_released_when_closed(false);
```

Showing and hiding now go through the panel instead of `window.show()/hide()`:

```rust
// panel.show() orders front on the CURRENT Space (incl. fullscreen)
// and makes the panel key — the whole point of the conversion.
panel.show();

// Hide via the panel so AppKit tears down key-window state cleanly.
panel.order_out(None);
```

One non-obvious bit of Cargo plumbing: the `panel_delegate!` macro (below) expands the old `objc` crate's `sel_impl!`, which emits a legacy `#[cfg(feature = "cargo-clippy")]`. On modern Rust that trips the `unexpected_cfgs` lint, so you declare the cfg as expected:

```toml
[lints.rust]
unexpected_cfgs = { level = "warn", check-cfg = ['cfg(feature, values("cargo-clippy"))'] }
```

---

## 5. Collection Behaviour: `MoveToActiveSpace`, Not `CanJoinAllSpaces`

The panel still needs a collection behaviour, and the obvious choice — `CanJoinAllSpaces` — is the wrong one.

`CanJoinAllSpaces` draws the panel on *every* Space at once. In practice that means when you switch Spaces, the panel is already rendered on the destination, so for a frame or two you see it flicker onto the new Space before your dismiss logic catches up and hides it. Ugly.

The fix is to let the panel live on a single Space and *move* to the active one only when shown:

```rust
panel.set_collection_behaviour(
    NSWindowCollectionBehavior::NSWindowCollectionBehaviorMoveToActiveSpace
        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary,
);
```

- **`MoveToActiveSpace`** — the panel relocates to the active Space at show time (via `order front regardless`), instead of being omnipresent. No flicker on Space switches.
- **`FullScreenAuxiliary`** — the bit that grants the right to appear over a fullscreen app at all. This one is non-negotiable for the whole feature.

`FullScreenAuxiliary` is what *permits* fullscreen overlay; `MoveToActiveSpace` is what keeps it *clean*.

---

## 6. Dismissing the Panel: Two Native Paths

Here's the gotcha that cost the most time. `tauri-nspanel` **swizzles the `NSWindow` class** to graft panel behaviour onto it. That swizzle breaks Tauri's `onFocusChanged` event — the very thing the frontend normally relies on to know when the window lost focus and should dismiss itself.

So on macOS, dismiss has to be driven natively. And it takes **two** observers, because they catch different things.

**(a) Resign-key delegate** — fires when the panel loses key focus: the user clicked outside it, or switched to another app.

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

**(b) Active-space observer** — fires when the user switches Spaces. A Space switch doesn't necessarily make the panel resign key, so the delegate alone can't catch it. An `NSWorkspace` notification does:

```rust
let block = RcBlock::new(move |_notification: NonNull<NSNotification>| {
    let Some(window) = app_handle.get_webview_window("main") else { return; };
    // Visibility guard: switching Spaces while hidden must be a no-op.
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
// There is exactly one panel for the whole process; the observer must outlive
// this function or it stops firing. Leak the block and token deliberately.
std::mem::forget(block);
std::mem::forget(observer);
```

Both paths do the same two things: `order_out` the panel and emit a `PANEL_DISMISSED` event. The frontend listens for that event and resets transient UI state — clearing the search query and any preview state — the same reset the old focus-loss path used to do:

```ts
// macOS only: tauri-nspanel swizzles NSWindow, breaking onFocusChanged.
// The native resign-key delegate emits PANEL_DISMISSED — run the same reset.
useEffect(() => {
  let unlisten: (() => void) | undefined;
  listen(PANEL_DISMISSED, () => dismiss()).then((fn) => { unlisten = fn; });
  return () => unlisten?.();
}, [dismiss]);
```

The `onFocusChanged` listener still lives in the same hook — it just only drives dismiss on Windows and Linux now, where the swizzle doesn't apply and the event works normally.

---

## 7. Takeaway

Appearing over fullscreen apps looks like a window *setting*. It isn't — it's a window *class*. No amount of collection-behaviour tuning gives a normal `NSWindow` the one thing that matters: taking key focus on a fullscreen Space without activating its app. Only `NSNonactivatingPanel` does that.

The shape of the fix:

- Convert the pre-warmed window to a panel with `tauri-nspanel` (style mask `NonactivatingPanel`, elevated level, never released).
- Collection behaviour `MoveToActiveSpace | FullScreenAuxiliary` — the first keeps Space switches flicker-free, the second is what grants fullscreen overlay.
- Drive dismiss natively (resign-key delegate **and** active-space observer), because the panel swizzle breaks `onFocusChanged`.

And keep it scoped to where it's needed:

```rust
#[cfg(not(target_os = "macos"))]
pub fn convert_main_to_panel(_window: &WebviewWindow) {
    // Non-macOS: windows already appear over fullscreen apps by default. No-op.
}
```

Windows and Linux overlay fullscreen out of the box. This whole dance is the price of doing it the way macOS wants — and once it's paid, the popup shows up exactly where Spotlight does.

::callout{product="kurippa"}
