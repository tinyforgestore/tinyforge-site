---
title: "I Expected Tauri Capabilities to Be a Cold-Start Win. They're Not."
description: "Benchmarking narrow vs permissive Tauri v2 capabilities for cold-start time. The null result is more interesting than the win would have been."
pubDate: 2026-05-25
tags: [tauri, security, performance, benchmark]
category: dev
---

I had a hypothesis: narrowing Tauri v2 capabilities to the minimum surface area should reduce cold-start time. Less stuff in the injected `__TAURI__` bridge, less parsing, less init work, faster first paint.

It seemed obvious. I benchmarked it. It killed the claim.

This is the post about what I found instead.

---

## 1. The Hypothesis

Tauri v2 split capability declarations into per-window JSON files in `src-tauri/capabilities/`. The system lets you say things like "the main window can call `core:default` and `plugin:fs:default`; the overlay window can only call `core:default`" — minimum-privilege at the command level.

[Vaultz](/products/vaultz) already had a split setup: `default.json` for the main window, `overlay.json` for the password-overlay window with a deliberately narrowed permission set. Two capability variants, same app — the perfect setup to ask: does narrow capability scope translate to faster cold start?

The intuition: capabilities feed into the runtime authorization checks for Tauri commands. Narrow capabilities → smaller authorization table → less code paths to initialize → less injected JavaScript surface → faster first paint.

I wrote a benchmark. The intuition was wrong.

---

## 2. The Benchmark

Same app, same machine, two builds:

- **Variant A** — narrow capabilities (production setup, `default.json` + restricted `overlay.json`).
- **Variant B** — permissive capabilities (every `allow-*` for every currently-loaded plugin merged into a single permissive `default.json`).

Instrumentation in `src-tauri/src/lib.rs`:

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

            let window = app.get_webview_window("main").unwrap();
            let start_for_event = *start;
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(true) = event {
                    eprintln!("[boot] first render: {} ms", start_for_event.elapsed().as_millis());
                }
            });

            Ok(())
        })
        // ...
}
```

Three timestamps per launch: `setup done`, `js boot`, `first render`. Ten cold launches per variant (kill process, 2-second cool-down between each).

---

## 3. The Results

**Variant A — narrow capabilities** (median of 10 runs):

| metric        | median   | min | max | range |
|---------------|----------|-----|-----|-------|
| setup done    | 207.5 ms | 195 | 242 | 47    |
| js boot       | 406.5 ms | 331 | 468 | 137   |
| first render  | 414 ms   | 340 | 477 | 137   |

**Variant B — permissive capabilities** (median of 10 runs):

| metric        | median   | min | max | range |
|---------------|----------|-----|-----|-------|
| setup done    | 218 ms   | 191 | 277 | 86    |
| js boot       | 359.5 ms | 327 | 485 | 158   |
| first render  | 386 ms   | 334 | 497 | 163   |

**Deltas (B − A, at median):**

| metric        | Δ ms  | Δ %    | direction         |
|---------------|-------|--------|-------------------|
| setup done    | +10.5 | +5.1%  | narrow faster     |
| js boot       | −47   | −11.6% | permissive faster |
| first render  | −28   | −6.8%  | permissive faster |

Two things to notice.

**First**, the deltas point in *opposite* directions across the three metrics. Setup-done is faster with narrow caps; js-boot and first-render are faster with *permissive* caps. There's no consistent winner.

**Second**, and more damning: the within-variant range (137–163 ms across the 10 runs of a single variant) is **roughly 3× the largest between-variant delta** (47 ms). The "signal" is buried inside the noise floor of cold-launch jitter.

This is noise, not signal. Two builds with identical capabilities would show the same spread.

---

## 4. Why the Hypothesis Was Wrong

I went back and read what the capability system actually does at runtime.

Capabilities aren't bundle-time tree-shaking. They don't shrink the `__TAURI__` JavaScript bridge. They don't reduce the IPC handler count that gets registered at startup. The `tauri::Builder` registers all plugin handlers regardless of capability — the capability layer sits *above* that, gating individual command invocations.

When a JS-side `invoke("plugin:fs|read_text_file", ...)` lands in the Rust runtime, the dispatcher consults the capability table for the current window and either runs the handler or returns a permission error. That lookup is O(1). The cost is paid per-call, not per-startup. And it's microseconds.

So narrowing capabilities does basically nothing to cold start. The plugin registry is still the same size. The bridge is still the same size. The JS bundle still imports the same set of `@tauri-apps/plugin-*` modules.

What changes is **what the app is *allowed* to do at runtime** — which is a different axis entirely from how fast it starts.

---

## 5. What Capabilities Actually Buy You

It's a security boundary, not a startup optimization.

The win is **blast radius reduction**. If an attacker lands an XSS injection inside the overlay window — say, by pasting a malicious payload that ends up rendered as HTML somewhere — the capability table is what stops them from then calling `plugin:fs:write_text_file` and exfiltrating the vault. The overlay capability never granted that permission. The runtime denies the call.

Without per-window capabilities, every window gets the full plugin surface area, and an XSS in one window can reach every command. With them, each window is sandboxed at the IPC layer.

This isn't a startup story. It's an "after the user has been on your app for an hour and something goes wrong" story. Capabilities don't make your app faster; they reduce the worst case when something inside your app goes hostile.

Worth doing. Just for different reasons than I'd assumed.

---

## 6. Takeaway

> I expected this benchmark to validate a perf claim. It killed it. That's the result.

Two specific things I'd flag for anyone working with Tauri v2 capabilities:

- **Don't budget cold-start time around capability scope.** It won't move the needle. Optimize elsewhere — lazy window creation, dependency pruning, splash-screen sleight of hand.
- **Don't loosen capabilities for "performance reasons."** You're trading real security headroom for a delta that's lost in noise. The only legitimate reasons to broaden capabilities are functional (a command needs more access) or maintenance (the matrix becomes hard to reason about).

The broader meta-point: a one-paragraph confident claim about performance is worth less than a 30-line benchmark. The benchmark takes an afternoon.

::callout{product="kurippa"}
