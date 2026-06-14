# Spec — Intro Scroll, About Per-Word Blur, K0/K1 Bleed-Through Fix

**Date:** 2026-05-25
**Target file (primary):** `src/sections/CinematicIntro.tsx`
**New primitive (likely):** `src/components/BlurWords.tsx`
**Status:** Builds on the curtain/zoom work from `2026-05-24-curtain-zoom-layout-spec.md`. Hero layout from that spec stays — these are three targeted fixes on top of the current behavior.

---

## Context — what exists today

`CinematicIntro.tsx` currently renders:

- A sticky 180vh region containing the K0 background image, the K1 person foreground (with mouse parallax), and the intro text block (Hi there + name + "Building bridges between" + RotatingWords) all together inside the sticky container.
- A separate `<section id="about">` below the sticky region with paragraph-staggered `Reveal` entrances (delays 0.08 / 0.16 / 0.24 / 0.32).
- `imageScale = 1 + activeProgress * 0.25`, `imageOpacity = 1 - activeProgress` (person fades as you scroll).
- `overlayOpacity = 1 - Math.min(activeProgress / 0.3, 1)` (intro text fades with scroll).
- Mobile / reduced-motion fallback already in place via `useFallback`.

Three issues to fix:

1. The intro text is locked inside the sticky region — it sits still while the image zooms beneath it, which feels detached. User wants it to scroll away normally instead of behaving stickily.
2. The About text is left-aligned with a paragraph-level fade. User wants it right-aligned with a **scroll-tied per-word blur-to-clear** reveal (the Valentin effect — each word starts blurred + dimmed and sharpens to full opacity as the scroll position passes it).
3. When the K1 person foreground fades, the K0 background's monitor still shows the "Welcome to to Portfolio." text, which is visible through the area the person used to occlude. User wants K0 and K1 to fade together behind a darkening scrim so the monitor text disappears with the person.

---

## FIX 1 — Intro text scrolls normally (not sticky)

### Desired behavior

The K0 background image and K1 person foreground stay in the sticky 180vh zoom region. The **intro text block leaves the sticky container** and becomes a regular flow element positioned absolutely over the top of the hero, so it scrolls off-screen at normal page-scroll speed while the image continues its sticky zoom behind it.

Visually: when the user starts scrolling, the "Hi there, this is Hirusha Dassanayaka. Building bridges between [rotating word]." text drifts up off the viewport at 1:1 scroll speed, while the desk image stays in place and zooms in.

### Implementation notes

- Restructure `CinematicIntro.tsx` so the intro text block is **outside** the sticky container, but still inside the same 180vh wrapper. Use `position: absolute; top: 0; left: 0; right: 0;` on the intro text block, or put it in a sibling non-sticky div positioned over the hero.
- Remove the `overlayOpacity` scroll-driven fade from the intro text — it should fade naturally by leaving the viewport, not by opacity animation.
- Keep mouse parallax on K1 person foreground only — the intro text no longer needs parallax since it's leaving the viewport quickly anyway.
- Z-order inside the sticky region (back to front): K0 background → scrim layer (see Fix 3) → K1 person.
- Z-order of the intro text: above the entire sticky stack (`z-30` or higher).
- On mobile / reduced-motion (`useFallback`), keep the current static fallback — text and image both render statically without scroll-driven effects.

### Acceptance test

- Refresh the page. The intro text is visible over the desk image at the top.
- Scroll one viewport down. The intro text has scrolled off the top of the screen completely. The desk image is still visible, now slightly zoomed in.
- The intro text never sticks to the top of the viewport — it behaves like any normal page content.

---

## FIX 2 — About text: right-aligned + scroll-tied per-word blur-to-clear

### Desired behavior

Match Valentin Cervera's reference exactly: each word starts in a "ghost" state (blurred ~6-8px, opacity ~0.15-0.25) and **sharpens to full opacity + zero blur as the scroll position crosses that word's vertical position in the viewport**. This is *not* a one-shot entrance animation — if the user scrolls back up, the words blur out again. The reveal is bidirectionally tied to scroll position.

The whole About text block also moves from left-aligned to **right-aligned** (`text-align: right`, content shifted to the right side of the container).

### Implementation notes

Create a new primitive `src/components/BlurWords.tsx`:

```tsx
// Pseudo-API
<BlurWords
  text="I'm a 5th-semester Digital Technology & Management student at OTH Amberg-Weiden..."
  className="text-white/90 text-lg md:text-xl leading-relaxed"
  // Optional knobs:
  startBlur={8}      // px of blur on the "future" side
  startOpacity={0.18} // opacity on the "future" side
  revealWindow={0.15} // fraction of viewport over which a word fully resolves
/>
```

Internals:

- Split `text` on whitespace into individual `<span>` elements per word (preserve punctuation attached to its word; preserve line breaks as `<br />`).
- For each word, use `useScroll({ target: wordRef, offset: ["start 0.85", "start 0.55"] })` from framer-motion (the per-element variant) to drive a `progress` 0..1 based on the word's position in the viewport.
- Map `progress` → `filter: blur(${startBlur * (1 - progress)}px)` and `opacity: ${startOpacity + (1 - startOpacity) * progress}`.
- Use `useMotionValue` + `useTransform` so the per-word transforms are GPU-driven and don't re-render on every scroll tick.
- Wrap each word in `display: inline-block` so blur and opacity apply cleanly without breaking line layout.

In `CinematicIntro.tsx`:

- Replace the current paragraph-staggered `Reveal` blocks in the About section with `<BlurWords>` instances, one per paragraph.
- Change the About container to right-aligned: `<div class="text-right ml-auto max-w-2xl">…</div>` (keep the existing max-width constraint, just shift to the right side of the page).
- The "(About)" eyebrow label and the headline ("Tech-fluent. Business-minded. Detail-obsessed.") should also right-align for consistency.

Reduced-motion / mobile fallback (`useFallback`):

- `BlurWords` should detect `useReducedMotion()` and render words as static, fully-opaque text (no blur, no scroll binding). Right-alignment still applies — only the per-word effect is disabled.

### Acceptance test

- Scroll down to the About section.
- The eyebrow "(About)", headline, and paragraph text are all right-aligned (text sits on the right side, with white space to the left).
- As the section enters from below, words at the bottom of each paragraph are blurry and dim; the top words are sharp and bright.
- Slowly scrolling reveals words one-by-one — each word sharpens individually as it crosses the trigger line (~mid-viewport).
- Scrolling back up causes the same words to re-blur. The effect is fully bidirectional.
- On `prefers-reduced-motion: reduce` or `(max-width: 767px)`, all words are fully sharp from the start — only the right-alignment remains.

---

## FIX 3 — K0 + K1 fade together to a dark scrim

### Desired behavior

Currently only the K1 person foreground fades; the K0 desk/monitor background stays at full opacity, which exposes the "Welcome to to Portfolio." text on the monitor through the area where the person used to be. This breaks the illusion.

Treat K0 and K1 as a single visual unit. As `activeProgress` increases, both layers fade behind a darkening scrim so that by the time the About section overlays, the monitor text is no longer visible — the user sees the About text on a near-black backdrop with only a faint image silhouette.

### Implementation notes

- Add a full-bleed **scrim layer** between K0 and K1 in the sticky region, with `background: black` and `opacity` driven by `useTransform(activeProgress, [0, 1], [0, 0.92])`. Z-order: K0 → scrim → K1.
- Change `imageOpacity` (currently applied only to K1 person) to apply equally to both K0 and K1, OR — simpler — leave K0/K1 at full opacity and let the scrim do the darkening. The latter is cleaner because it preserves the image silhouette behind the About text instead of fading to white/empty.
- Keep the existing `imageScale = 1 + activeProgress * 0.25` zoom on **both** K0 and K1 so they stay locked together as a single unit (currently K0 may not be scaling — verify and apply scale to K0 if missing).
- The mouse parallax on K1 should be gated to `activeProgress < 0.5` so the parallax fades out cleanly as the scrim takes over — once K1 is mostly hidden by the scrim, parallax is meaningless and could even cause subtle edge artifacts.
- On `useFallback`, render K0 + K1 statically without scrim, scale, or parallax — same as current fallback behavior.

### Acceptance test

- Scroll down through the sticky hero zoom.
- Around 50% scroll progress, the desk image starts visibly darkening.
- By the time the About text is fully readable (overlay opacity = 1), the monitor in the background is dark enough that "Welcome to to Portfolio." is **not legible** — even squinting, it should read as a faint glow at most, not as text.
- Scroll back up: the scrim lifts, monitor text returns to full visibility, image returns to original scale.
- No flash or jump at the boundary where the sticky region ends.

---

## Files Antigravity should touch

- `src/sections/CinematicIntro.tsx` — restructure intro text out of sticky container (Fix 1); swap About paragraphs to `BlurWords` + right-align (Fix 2); add scrim layer between K0 and K1, gate parallax to `activeProgress < 0.5`, ensure K0 scales with K1 (Fix 3).
- `src/components/BlurWords.tsx` — **NEW** primitive for the per-word scroll-tied blur effect (Fix 2). Self-contained, no external deps beyond framer-motion.
- `src/hooks/useScrollScrub.ts` — no changes expected; existing hook handles the sticky region.

## Files Antigravity should NOT touch

- `src/components/RotatingWords.tsx` — current inline-grid layout-shift-prevention is correct, leave it.
- `src/components/CurtainLoader.tsx` — curtain animation is working, leave it.
- `src/components/Nav.tsx`, `src/components/Footer.tsx`, other sections.

## Open questions / edge cases for Antigravity to handle

- If the intro text de-pinning (Fix 1) causes the sticky region's total scroll length to feel wrong (too short or too long with the text gone), adjust the 180vh height — but flag the change in the commit message rather than silently tweaking.
- If `BlurWords` proves expensive on long paragraphs (more than ~80 words), reduce the `revealWindow` and consider `will-change: filter, opacity` on each word span. Don't introduce intersection-observer batching unless profiling shows it's needed — framer-motion's `useScroll` per-element is fast enough for this scale.
- If the scrim (Fix 3) makes the About section look too dark to read comfortably, raise the white text opacity in the About block (currently `text-white/90`) to `text-white` and let the scrim do the contrast work.
