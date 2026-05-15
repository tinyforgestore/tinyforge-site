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

- [ ] **Part 3: `AsyncIterator` and `for await…of` with backpressure**
      — strongest part 3 candidate. Closes the lazy arc with the
      async side: file streams, network sources, how `take(n)` over an
      async generator avoids pulling more pages/lines than needed.
      Same "log the calls, count the operations" structure as parts
      1–2. *No fresh benchmark infra needed* — the post writes itself
      from logged generator behavior.
- [ ] **Part 4: lazy sequences in Python** — generators, `itertools`,
      and the equivalent `take` pattern.
- [ ] **Part 5: lazy in Kotlin/Swift** — sequences in Kotlin, `lazy`
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
- [ ] **Java records vs Kotlin data classes — and the "Kotlin envy"
      thread**. Two possible angles, both stronger than a bare syntax
      comparison:
      - *Angle A (pattern essay):* trace what Java has borrowed from
        Kotlin/Scala over the years — records (← data classes), sealed
        classes, pattern matching in switch, `var`, text blocks. One
        case study is generic; the recurring pattern is the story.
      - *Angle B (bytecode dive):* compile both, decompile the class
        files, show the real differences — `componentN()`, `copy()`,
        `@kotlin.Metadata` annotation on the Kotlin side;
        `ACC_RECORD` flag, synthetic accessors, equals/hashCode
        strategy on the Java side. Sits next to `cargo-show-asm` as a
        series-aesthetic match.
      - *Audience caveat:* JVM is a hard pivot from the blog's current
        Rust/Tauri/TS/macOS lane. Only worth writing if you can speak
        from real production JVM experience.

## Measurement-led posts (verify hypothesis first, then write)

These are framed as "you already did the work" by web-Claude, but each
needs a real benchmark before it earns the Tier-1 label. If the
measurement shows the expected delta, write the post. If not, kill it
or rewrite the hook.

- [ ] **Rayon `par_iter` is not free** — find the crossover where
      parallelism overhead is paid back. Kurippa's fuzzy-search across
      a large clipboard history is a real workload to benchmark. The
      post lives or dies on the threshold chart. *Verify first:* run
      a sequential vs `par_iter` bench across history sizes (100 /
      1k / 10k / 100k entries); look for the size at which `par_iter`
      starts winning.
- [ ] **IPC payload shape: `invoke` vs Tauri v2 channels** — for
      streaming workloads (clipboard history, generated-password
      history). Most blog posts only measure payload size, not the
      shape (one big invoke vs many small messages vs channel). *Verify
      first:* in Kurippa or Vaultz, write a bench that streams N
      clipboard items via (a) one invoke returning Vec, (b) N invokes
      one item each, (c) a v2 channel. Log round-trip latency and
      memory.
- [ ] **Tauri v2 capability scope: security boundary, not perf
      optimization** — *VERIFIED NEGATIVE (Vaultz, May 2026)*. Built
      with narrow vs permissive capabilities, 10×10 cold launches:
      median delta 28–47 ms in the *opposite* direction of the
      hypothesis, swamped by 137–163 ms within-variant noise. The
      capability JSON is enforced at command-dispatch time (O(1)
      lookups), not bundle-time tree-shaking — so narrowing doesn't
      shrink the bridge or reduce parse work. The post becomes a
      reframe piece: "I expected this benchmark to validate a perf
      claim. It killed it. That's the result." Then pivot to what
      capabilities actually do: blast-radius reduction. Strong Tier 1
      candidate now — the null result and the reframe are the post.
- [ ] **Lazy window creation in Tauri** — *VERIFIED POSITIVE
      (Kurippa, May 2026)*. Two pre-warmed hidden WebViews (settings
      + activation) compete with the main WebView for V8 init, IPC
      registration, layout pipeline. Removing them from the startup
      `windows` array: setup-done 244→185 ms median (−24%), React
      mount 469→344 ms (−27%), tail variance 913→500 ms max. The
      tradeoff: first time the user opens Settings (rare), they pay
      ~250-400 ms for lazy build — off the cold-launch critical path.
      Bench data on `bench/lazy-window` branch in kurippa repo. Ship
      the post AND merge the refactor; they're independent wins.

## Rust techniques (small, niche, planable)

- [ ] **`Cow<'_, T>` for maybe-owned returns** — when parsing or
      normalizing, you sometimes want to return the input unchanged.
      `Cow` avoids the eager copy. Real example from Vaultz's parsing
      paths if one exists. Short post.

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
- [ ] **Why none of my keyboard shortcuts worked (after a rename)** —
      the `useKeyboardNav → useDashboardKeys` refactor. Tests passed,
      code review found nothing. Root cause: user was running the
      packaged binary, not the dev build, so the renamed hook never
      reached the running app. Two lessons worth landing:
      - *Renames are uniquely dangerous* vs content changes. A content
        change leaves a visible behavior diff (smoking gun); a rename
        just makes the old symbol invisible until rebuild — the bug
        presents as "nothing happens" instead of "something different
        happens."
      - *Test-layer gap*: unit tests passed for the new hook name, but
        nothing ran the packaged binary end-to-end, so the regression
        slipped between layers. Add a smoke test on the shipped
        artifact.
- [ ] **Suppressing a warning that only fires on the platform you
      don't build for** — `write_secret_to_clipboard(text: String)`
      warned `unused_variable` on Windows because the entire macOS
      body sits behind `#[cfg(target_os = "macos")]`. Fix:
      `#[cfg_attr(not(target_os = "macos"), allow(unused_variables))]`
      on the function. Short post on `cfg_attr` as the
      "apply-this-attribute-conditionally" tool — under-documented
      enough that people reach for `_text` first and break the API.
      Either ship standalone (~300 words) or park and bundle with
      future cross-platform Rust gotchas as a "5 things I learned"
      omnibus.

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
