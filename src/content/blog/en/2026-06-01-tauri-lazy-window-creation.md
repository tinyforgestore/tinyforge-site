---
title: "Pre-Warming Hidden Tauri WebViews Costs ~125 ms Every Cold Launch"
description: "Kurippa pre-warmed three Tauri WebViews at startup. Lazy-creating two of them cut React mount time by 27% and halved tail latency."
pubDate: 2026-06-01
tags: [tauri, performance, kurippa, benchmark]
category: dev
---

A few weeks ago I [wrote about pre-warming Tauri windows](/blog/tauri-prewarm-performance/) to make hotkey-invoked popups feel instant. The technique works: don't destroy a window when the user dismisses it — hide it. Keep the WebView alive in memory. Showing it again is a microsecond-level operation.

That's the right move for **warm invocations**.

It's the wrong move for **cold launch** — at least when you do it for multiple windows.

This post is about measuring how badly.

---

## 1. The Setup

[Kurippa](/products/kurippa) has three Tauri windows declared in `tauri.conf.json`:

- `main` — the main clipboard popup
- `settings` — preferences
- `activation` — license activation flow

All three were created at startup, all three pre-warmed (visible: false, ready to show on demand). The rationale was reasonable: any of them might be the first window the user interacts with after launch, and we wanted that interaction to be instant.

The problem is what "pre-warming three windows" actually means in Tauri's startup pipeline.

Each window spins up its own WebKit WebContent process. Each runs its own V8 initialization. Each registers its own IPC handlers. Each kicks off its own React mount (Kurippa's frontend is React-on-Tauri). And all of this happens on or contends with the main thread before the user sees anything.

The hypothesis: removing the two ancillary windows from the startup `windows` array — creating them lazily on first use instead — should reduce cold-launch time for the main window.

I benchmarked it.

---

## 2. The Benchmark

Same instrumentation as the [capabilities benchmark](/blog/tauri-capabilities-not-perf/):

```rust
use std::sync::OnceLock;
use std::time::Instant;

static BOOT_START: OnceLock<Instant> = OnceLock::new();

pub fn run() {
    let _ = BOOT_START.set(Instant::now());

    tauri::Builder::default()
        .setup(|app| {
            let start = BOOT_START.get().unwrap();
            eprintln!("[boot] setup done: {} ms", start.elapsed().as_millis());
            // ... event handlers logging "[boot] main visible" on first focus
            Ok(())
        })
        // ...
}
```

Two builds:
- **Baseline** — current production setup, all three windows pre-warmed.
- **Lazy** — only `main` in the startup array; `settings` and `activation` created on-demand from a Rust helper triggered by their existing tray/menu actions.

Ten cold launches per variant. Process killed and 2-second cool-down between each.

The lazy helper is straightforward:

```rust
fn ensure_window(app: &tauri::AppHandle, label: &str) -> tauri::Result<tauri::WebviewWindow> {
    if let Some(w) = app.get_webview_window(label) {
        return Ok(w);
    }
    tauri::WebviewWindowBuilder::new(
        app,
        label,
        tauri::WebviewUrl::App("/".into()),
    )
    .visible(false)
    .build()
}
```

Existing commands that needed the settings window — `open_settings`, the tray menu's "Settings…" item — call `ensure_window(&app, "settings")` before showing it. First call builds, subsequent calls hit the cache.

---

## 3. The Results

| metric        | baseline (median) | lazy (median) | Δ ms  | Δ %    |
|---------------|-------------------|---------------|-------|--------|
| setup done    | 244 ms            | 185 ms        | −59   | −24%   |
| React mount   | 469 ms            | 344 ms        | −125  | −27%   |
| max (tail)    | 913 ms            | 500 ms        | −413  | −45%   |

The median wins are real and consistent (both setup-done and React-mount move in the same direction). But the tail-latency result is the most interesting one.

Baseline cold launches had a worst-case of 913 ms. Some unlucky combination of GPU contention, file-system jitter, and three WebViews fighting for the main thread occasionally produced launches nearly twice as slow as the median. Lazy cold launches capped out at 500 ms. Same machine, same conditions, just fewer WebViews in the critical path.

The variance collapse matters more than the median delta. A 125 ms median saving is nice. A 413 ms tail-latency collapse means the *worst* user experience got dramatically better — which is usually the experience that gets remembered.

---

## 4. Why It Works

The mental model that justified pre-warming three windows was that each window's setup happens "in parallel" — WebKit spawns a separate WebContent process per window, so they shouldn't block each other.

That's half-true and half-false.

True: each WebView gets its own WebContent process. True: V8 initialization inside each process runs on that process's main thread, isolated from the others.

False: the Tauri *Rust* side, where windows are wired up and IPC handlers are registered, is single-threaded inside the `setup` closure. False: the macOS window-server and main-thread layout pipeline aren't parallel — every `NSWindow` creation, every initial paint pass, every event-loop bootstrap step competes for the same main thread.

So three pre-warmed windows means three `WebviewWindowBuilder::new(...).build()` calls running serially in Rust setup, three rounds of `NSWindow` creation hitting the macOS window server, three initial layout passes. The main window's first paint sits at the end of that queue.

Removing two of them removes two-thirds of that startup queue. The main window's first paint moves up.

---

## 5. The Tradeoff

The cost of lazy creation: the first time the user opens Settings, they wait ~250–400 ms while the WebView is built from scratch. Subsequent opens are instant (the window is cached).

This is the right tradeoff for Kurippa because **most users never open Settings**, and the ones who do open it rarely — once during initial setup, occasionally to tweak a preference. The hotkey-driven main interaction happens dozens of times a day. Trading "first-time Settings open is slower" for "every cold launch is faster" is a clear win.

It's the wrong tradeoff if the user is expected to bounce between several windows frequently after launch. In that case, pre-warming makes sense and the cold-start cost is the price of admission.

The shape of the win is application-specific. The mechanism — pre-warmed hidden WebViews contend with the main window's startup — is general.

---

## 6. Two Sides of the Same Coin

The earlier pre-warm post argued for keeping a window alive across hide/show cycles. This one argues against creating multiple windows at startup. They look like contradictions; they're not.

- **Warm invocation** (hotkey → existing-and-hidden window → show): pre-warming is essential. Without it you pay full cold-launch cost on every hotkey press.
- **Cold start** (process launch → first paint): pre-warming multiple windows is a tax. Each pre-warmed window adds setup contention before the main window can paint.

The rule that reconciles them: **pre-warm exactly one window — the one the user is most likely to see first.** Build everything else on demand. Once any auxiliary window is built once, it stays warm for the rest of the process lifetime (via hide-on-close, same as the main window).

For Kurippa, that's the main clipboard popup. For your app, it depends on the dominant interaction.

---

## 7. Takeaway

`tauri.conf.json` lets you declare every window your app might ever need, and that's a trap. Each pre-warmed window contends with the others — and with the main window — during cold start. The performance you save on warm invocations is paid back, with interest, the first time the user launches the app.

Three numbers worth pinning:

- −24% setup-done
- −27% React mount
- −45% tail latency

For one afternoon of work and a small refactor to a `ensure_window` helper.

::callout{product="kurippa"}
