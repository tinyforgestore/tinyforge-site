---
title: "What's New: Combine Images"
description: "Select a few image clipboard items and Kurippa can now composite them into one image and copy it straight to the clipboard, ready to paste. Keyboard-first, like everything else."
pubDate: 2026-09-14
tags: [kurippa, macos, productivity, changelog]
category: dev
---

[Kurippa](/products/kurippa) has had "Merge and paste" for text for a while — select a few text items, and they combine into one paste. Images never had an equivalent. Copy three screenshots and there was no way to turn them into one image; you pasted them one at a time.

The latest build fixes that.

---

## Combine images

Select up to **4 image clipboard items** and press Enter — alongside the existing merge action for text, you'll now see **Combine images**. Pick it, and Kurippa composites the selection into a single image and copies it to the clipboard. Paste it anywhere, immediately.

---

## Layout adapts to your images

You don't choose a layout — Kurippa figures out a sensible one from the images you selected:

- **Same width** → stacked vertically
- **Same height** → stacked horizontally
- **Anything else** → arranged in an even grid

Screenshots from the same app, a few icons, a handful of unrelated captures — whatever the shapes, the composite comes out looking intentional.

---

## Multi-select now knows what kind you're building

Images couldn't join a multi-select before — only text items could be selected at all. Now that they can, mixing images and text in one selection wouldn't make sense, so multi-select is **kind-aware**: whichever you select first — an image or a text item — locks in the kind for the rest of that selection. Non-matching items are dimmed and skipped, both when navigating with the keyboard and in the list itself, so you can't accidentally end up with a selection that doesn't mean anything.

---

## Keyboard-first, as always

No mouse required — select the items, press Enter, choose **Combine images**. Same flow you already use for everything else in Kurippa.

---

## A note on tier

**Combine images** is a paid-tier feature, same as text merge.

---

Copy a few screenshots, combine them, paste one image. That's the whole feature.

::callout{product="kurippa"}
