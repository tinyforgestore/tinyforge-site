---
title: "What's New: Bulk Actions for Multi-Select"
description: "Select a few clipboard items and Enter now opens a menu — merge them, pin them all, or move the whole set into a folder. Keyboard-first, like everything else in Kurippa."
pubDate: 2026-07-13
tags: [kurippa, macos, productivity, changelog]
category: dev
---

[Kurippa](/products/kurippa) has had multi-select for a while: enter multi-select mode, mark a few clipboard items, and act on them together. But "together" only ever meant one thing — merge. Selecting a handful of items and pressing Enter jumped you straight into the separator picker to combine them into a single paste.

Merge is useful, but it's rarely the *only* thing you want to do with a group of items. The latest build fixes that.

---

## Enter now opens an action menu

With **2 or more items selected**, pressing Enter opens a small menu instead of assuming you meant merge. It offers three actions:

- **Merge and paste** — the flow you already know: pick a separator, and the selected items combine into one paste.
- **Pin all** — pins every selected item at once, so a whole group jumps to the top and sticks around.
- **Move to folder** — sends the entire selection into a folder. Choose an existing folder, or pick **"New folder…"** to create one and move the whole set into it in a single step.

Selecting exactly **one** item is unchanged — Enter still pastes it immediately. The menu only appears once you have a real group to act on.

---

## Keyboard-first, of course

The menu is built to be driven without touching the mouse — the same feel as the pinned-header confirmation menu:

- **↑ ↓** — move between the three actions
- **Enter** — run the highlighted action
- **M** — merge · **P** — pin all · **F** — move to folder (direct mnemonics, no need to arrow over first)
- **Esc** — cancel and close

And if you do reach for the trackpad, hovering over an action highlights it, so the mouse and keyboard never disagree about what's selected.

---

## A note on tiers

**Pin all works on the free tier** — pinning has always been free in Kurippa, and that doesn't change for a group. **Merge and paste** and **Move to folder** are part of the paid version, same as their single-item counterparts.

---

It's a small menu, but it turns multi-select from a merge shortcut into a real bulk-management tool: gather the items once, then merge, pin, or file them away — whichever you actually meant.

::callout{product="kurippa"}
