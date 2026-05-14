---
title: "Tauri Cold Launch Was ~1s. Here's How I Got It to Feel Instant."
description: "How pre-warming the Tauri webview drops hotkey-popup latency from ~1s cold-launch to ~15µs — without rewriting the UI in SwiftUI."
pubDate: 2026-04-28
tags: [tauri, macos, performance, kurippa]
category: dev
mirrors:
  devto: https://dev.to/tinyforge/tauri-cold-launch-was-1s-heres-how-i-got-it-to-feel-instant-32lh
---

When I started building [Kurippa](/products/kurippa) — a keyboard-first clipboard manager for macOS — I ran into something that bothered me more than any bug.

The app worked. The UI looked exactly how I wanted. But every time I summoned it with a hotkey, there was a noticeable pause before the window appeared. Not a crash. Not an error. Just... a moment of nothing.

For a clipboard manager, that pause kills the whole point. You're mid-flow, you hit the shortcut, and instead of instant access you're waiting. The friction is small but constant.

This post is about understanding why that happens, what the alternative looks like, and how I solved it without abandoning the web UI stack I'd already built.

---

## 1. The Tradeoff: Web UI vs Native UI

Tauri lets you build desktop apps with a web frontend — HTML, CSS, React, whatever you like — rendered inside a native WebKit webview. The upside is enormous: you get the full expressiveness of the web platform. Animations, complex layouts, design systems, component libraries — all of it works.

The cost is that a webview is not a lightweight thing. When your app window opens, Tauri needs to:

1. Spawn the WebKit XPC helper processes
2. Load your HTML/JS bundle
3. Execute your React (or equivalent) code
4. Paint the first frame

On macOS, a cold Tauri launch takes roughly **~1 second** to reach a fully painted window. For a menu-bar or hotkey-triggered utility that should feel *instant*, this is a real problem.

Native UI frameworks don't have this cost. A SwiftUI window renders directly with system primitives — no webview, no JS runtime, no bundle parsing. The tradeoff is that you're working with a more constrained toolkit.

Let's make that concrete with numbers.

---

## 2. Baseline: Tauri vs SwiftUI

To isolate the startup cost, I built the same minimal app in both: a floating window with a search field and a list of 10 static items. Nothing fancy — just enough UI to be representative.

### SwiftUI — minimal list window

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
            TextField("Search...", text: $query)
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

### Tauri + React — equivalent minimal list window

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
        placeholder="Search..."
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

### Results

| Metric | SwiftUI (native) | Tauri (Rust + WebKit) |
|---|---|---|
| Cold launch (binary → window visible) | ~1 s | ~1 s |
| Idle RSS — main process | 63 MB | 81 MB |
| Idle RSS — incl. WebKit XPC helpers | 63 MB | ~159 MB across 4 processes |
| Binary size | ~50 KB Mach-O | 8.1 MB |
| `.app` bundle | n/a (raw binary) | 8.2 MB |
| DMG | n/a | 2.9 MB |

Cold launch times look similar at this resolution. But memory tells a different story: Tauri spins up **4 separate processes** — main + GPU + WebContent + Networking — totalling ~159 MB at idle, versus SwiftUI's single 63 MB process. For a utility that stays resident in the background all day, this gap matters.

More importantly, cold launch isn't the real bottleneck for a hotkey app. The next section is.

---

## 3. Why the Warm Show Is Still Slow

For a clipboard manager, the app is always running — you invoke it dozens of times a day with a hotkey. What matters isn't cold launch, it's how fast the window appears on each invocation.

The naive approach is to destroy the window on dismiss and recreate it on each hotkey press. This triggers the full webview spin-up every time: WebKit process init, React mount, first paint. The cold path costs ~225 ms just to reach setup, plus React mount and first paint — roughly **~1 s to fully painted**, and **50,000× slower** in raw API time than what's possible.

For something that should feel like flipping a switch, this is the problem to solve.

---

## 4. The Pre-Warm Technique

The fix is to **never destroy the window**. Instead of tearing down the webview on dismiss, intercept the close event, cancel it, and call `hide()`. The webview process stays alive. The React tree stays mounted. The DOM is preserved in memory.

When the hotkey fires, `show()` + `set_focus()` is all you need — the window server just makes the existing `NSWindow` visible again. No rebuild, no React remount, no WebKit spin-up.

```rust
// src-tauri/src/lib.rs
use tauri::{Manager, WindowEvent};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    // Intercept close — hide instead of destroy
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

This is exactly what Kurippa does. When the user clicks the red traffic-light button, the window disappears — but the webview stays warm in the background, ready to reappear instantly.

---

## 5. Pre-Warm Results

| Path | API call duration | User-perceived delay |
|---|---|---|
| Cold launch (process start → first paint) | n/a | ~225 ms to setup, ~1 s fully painted |
| `window.hide()` | ~7 µs | instant |
| `window.show()` + `set_focus()` (prewarmed) | ~15–18 µs | instant |

The `show()` call returns in **microseconds** — it's just an IPC message to the macOS window server saying "unhide this `NSWindow`." The WebView, React tree, and DOM never tear down; they're paused in memory and resume immediately.

The remaining user-perceived delay on a prewarmed show is dominated by the macOS window fade animation — a few tens of milliseconds, not Tauri or React at all. For a hotkey popup, this is well under a single frame at 60 Hz.

To put the before/after in perspective: the cold path is roughly **50,000× slower** in raw API time than a prewarmed show. In user-perceived terms it's closer to 10–50×, but either way — the difference is the difference between "instant" and "noticeable."

::callout{product="kurippa"}

---

## 6. Tradeoffs

Pre-warming isn't free. Know what you're accepting:

**Memory cost is permanent.** The ~159 MB RSS stays resident even when the window is "closed." For a hotkey launcher that runs all day, this is acceptable. For a heavyweight app the user opens occasionally, it would be wasteful.

**No automatic state reset.** Closing no longer clears form input or scroll position — you'll need to handle that explicitly in your hide logic if your UX requires it.

**Background CPU.** A hidden WebView with active timers or animations still runs them. If your React tree has any `setInterval` or `requestAnimationFrame` loops, gate them on a visibility flag.

For reference, the SwiftUI equivalent is `NSWindow.orderOut(nil)` / `makeKeyAndOrderFront(nil)` — same idea, same microsecond-level API cost, but from a ~63 MB memory baseline instead of ~159 MB.

---

## Takeaway

Tauri's cold launch cost is real — ~1 s to a fully painted window, ~159 MB of resident processes. But for long-running hotkey utilities, cold launch is the wrong metric. Pre-warming the webview by intercepting close and calling `hide()` brings invocation latency down to ~15 µs in API time — effectively instant to the user, with the only cost being memory that stays warm in the background.
