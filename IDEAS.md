# Blog ideas

Append-only notebook. One-liner → eventually promoted to a draft post in
`src/content/blog/{en,ja}/`. This file is never built or published.

---

## Ready-to-write (implementation already exists in repo)

- [ ] **A remark plugin for product callouts in Astro** — walk through
      `src/remark/callout-promo.ts`. Locale auto-detect from file path,
      HTML-escape, mutate the directive node in place. Show the BEM CSS
      and the styling tradeoffs (no buttons, low-contrast tint).
- [ ] **Baking rounded corners into screenshots at capture time** — the
      `scripts/gen-features/capture.ts` `sharp` pipeline. SVG mask +
      `dest-in` composite. Why CSS `border-radius` on `<img>` isn't
      enough when `object-fit: contain` letterboxes the image.
- [ ] **Scheduled publishing on a static Astro site** —
      `src/utils/blogFilter.ts` (pubDate gate) + GH Actions cron in
      `deploy.yml`. Why this beats a "draft toggle" workflow. GH cron
      60-day inactivity quirk.
- [ ] **Bilingual posts + per-post hreflang in Astro** — counterpart
      lookup in `BlogPost.astro`, locale derived from glob path, lang
      toggle that points at the same post in the other locale (falls
      back to home if no counterpart).
- [ ] **CSS `filter: drop-shadow` vs `box-shadow` on PNGs with
      transparent corners** — why we had to swap them on the product
      page feature screenshots. `box-shadow` follows the element box;
      `drop-shadow` follows alpha. With concrete diffs.

## Stacking-context / layout gotchas (real bugs we hit)

- [ ] **z-index inside a transformed parent is trapped** — the heroshot
      caption clipping bug. Why bumping caption z-index didn't work,
      why `display: contents` then back to flex-column-with-transform-
      on-child finally did.
- [ ] **align-items: center surprises on grid rows of unequal height**
      — same bug, different angle. Side captions ending up below the
      center frame because row alignment shifts the small items.

## Series: lazy iterators (continue the existing thread)

- [ ] **Part 3: lazy sequences in Python** — generators, `itertools`,
      and the equivalent `take` pattern.
- [ ] **Part 4: lazy in Kotlin/Swift** — sequences in Kotlin, `lazy`
      operations in Swift. Compare the syntax overhead.
- [ ] **Aside: where lazy hurts** — repeated iteration of a generator
      vs an array, surprising re-execution costs, when to materialize.

## Cross-language micro-benchmarks (lazy-iterators-style, planable)

- [ ] **String interning costs across Rust / JS / Python** — same
      benchmark, same plot, same "here's the asm/bytecode" wrap-up.
- [ ] **Hashmap iteration order: BTreeMap vs HashMap vs Object vs Map**
      — practical implications when serializing.
- [ ] **Regex backtracking pathologies in three languages** — show the
      pathological input, demonstrate timeout, show how each ecosystem
      mitigates it.

## Library spelunking (read source, explain it)

- [ ] **How Tauri pre-warms macOS windows under the hood** — read the
      tauri-runtime-wry source, trace the `NSWindow` lifecycle.
      Companion piece to the existing prewarm post.
- [ ] **How `cargo-show-asm` actually works** — invokes rustc with
      `--emit=asm`, parses, filters. Walk the crate.
- [ ] **How Astro's content collections build** — the glob loader,
      type generation, virtual `astro:content` module.
- [ ] **How sharp's resize algorithm works** — quick walk through
      libvips' bilinear/lanczos selection.

## Power-user / how-to (TIPS category)

- [ ] **macOS Accessibility & Input Monitoring permission prompts — when
      they actually fire, how to debug "Step 2 never appears"** —
      lessons from Kurippa's permission flow.
- [ ] **Cmd+Shift+L: setting up vault quick-search from anywhere on
      macOS** — Vaultz overlay walkthrough.

## Postmortems / fix-it stories (low planning cost, high engagement)

- [ ] **Why our universal binary updater JSON kept generating wrong** —
      the `ci: fix updater JSON for universal macOS build` commit pair.
- [ ] **The Windows clipboard API changed under us in `windows-rs`
      0.61** — what broke, how we found it, how the fix looked.
- [ ] **Cursor-relative window spawn on a multi-monitor mac** — the
      `LogicalPosition` vs `PhysicalPosition` bug.

## Park (write at the right moment, not now)

- [ ] **Year-one studio retrospective** — costs, revenue, conversion,
      what worked, what didn't.
- [ ] **Why I left the day job to do this** — only when there's a
      meaningful inflection point worth writing about.

---

## Workflow

1. Idea pops into head → add one-line bullet here in 10 seconds.
2. When ready to write → create `src/content/blog/{en,ja}/YYYY-MM-DD-slug.md`
   with frontmatter and either `draft: true` or a future `pubDate`.
3. Iterate locally with `npm run dev`.
4. Publish by setting `pubDate <= today` (or removing `draft: true`).
5. Move the IDEAS.md bullet to "shipped" (optional) or delete the line.
