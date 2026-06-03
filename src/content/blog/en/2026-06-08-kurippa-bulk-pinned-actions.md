---
title: "What's New: Bulk-Manage Pinned Items with Cmd+Delete"
description: "Pin a few things and the list collapses them under a single header. Now you can clear or unpin all of them at once — keyboard-first, with a recoverable escape hatch."
pubDate: 2026-06-08
tags: [kurippa, macos, productivity, changelog]
category: dev
---

If you pin items in [Kurippa](/products/kurippa), they stack up. Pinning is sticky by design — that's the point. But "sticky" eventually means "cluttered," and until now the only way to clean up was to unpin items one at a time.

The latest build fixes that with a single shortcut.

---

## Cmd+Delete on the pinned header

When **2 or more items are pinned**, the list collapses them under a single pinned-header. Highlight that header and press **Cmd+Delete** (or **Cmd+Backspace**) — a confirmation modal opens, asking what you want to do with the whole group.

Nothing changes for the 0- and 1-pin cases. There's no header, no new path, no new behavior to learn. The feature only appears once you actually have a pile of pins worth managing.

---

## Two terminal actions, one safe default

Bulk-deleting pinned items is irreversible, so the modal doesn't just give you one scary button and a Cancel. It gives you two ways out:

- **Delete all pinned** — removes every pinned item. Destructive, and it cannot be undone.
- **Unpin all instead** — clears the pinned flag on everything. The items survive and drop back into your regular history, so nothing is actually lost.

That second option is the escape hatch. If you reached for Cmd+Delete just to *tidy up* — not to destroy anything — "Unpin all instead" does exactly what you wanted without the risk.

---

## Keyboard-first, like the rest of Kurippa

The modal is built to be driven without ever touching the mouse:

- **↑ ↓** — move the highlight between the two actions
- **Enter** — activate the highlighted action
- **Y** — delete all (direct mnemonic, bypasses the highlight)
- **U** — unpin all (direct mnemonic, bypasses the highlight)
- **Esc** — cancel and close

The two mnemonics are there for when you already know what you want: hit `Y` or `U` and you're done, no arrow-key dance required. And if you do reach for the trackpad, hovering over either button syncs the highlight — so the mouse and keyboard never disagree about what's selected.

::callout{product="kurippa"}
