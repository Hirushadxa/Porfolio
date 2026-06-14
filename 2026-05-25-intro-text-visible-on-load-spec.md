# Spec — Intro Text Visible on Page Load

**Date:** 2026-05-25
**Target file:** `src/sections/CinematicIntro.tsx`
**Builds on:** `2026-05-25-intro-scroll-about-blur-bleed-fix-spec.md` (FIX 1)
**Scope:** Single targeted fix — positioning of the intro text block only. Do not touch BlurWords, RotatingWords, CurtainLoader, the scrim, or anything in the About section.

---

## Context — what's wrong right now

Per FIX 1 of the previous spec, the intro text block (the "Hi there, this is" eyebrow + "Hirusha Dassanayaka." headline + "Building bridges between" label + `<RotatingWords />`) was de-pinned so it scrolls off naturally instead of staying locked.

The current implementation appears to place the intro text **after** the sticky image region in normal document flow. This means on page load, the user sees only the desk image with no text — the intro copy is below the fold and only becomes visible once the user scrolls one viewport down.

That's wrong. The intro text should be the **first thing the user sees** when the curtain animation lifts. It should overlay the hero image at the top of the viewport from t=0, and only leave the viewport because the user scrolled past it.

---

## Desired behavior

1. Curtain animation plays on first load.
2. As the curtain lifts, the intro text is **already in position**, overlaying the desk image at the top of the viewport. The user sees both the desk scene (faintly visible behind the text) and the intro copy simultaneously — no scroll required.
3. As the user scrolls down, the intro text drifts up off the viewport at normal page-scroll speed (1:1).
4. By the time the user has scrolled roughly 80–100% of the first viewport, the intro text is completely gone from view.
5. The desk image stays sticky and zooms (as already implemented — no change to image behavior).
6. The scrim, About section, and BlurWords behavior all stay exactly as they are now.

---

## Implementation

The intro text block must live **inside the 180vh sticky wrapper**, positioned absolutely against that wrapper's top — *not* placed in normal flow after the sticky region.

### Structure to produce

```tsx
<div className="relative h-[180vh]">
  {/* Sticky image stack — unchanged from current implementation */}
  <div className="sticky top-0 h-screen overflow-hidden">
    {/* K0 background (z-10) */}
    {/* Scrim layer (z-15) */}
    {/* K1 person foreground (z-20) */}
  </div>

  {/* NEW: intro text overlay — visible at t=0, scrolls away naturally */}
  <div
    className="absolute top-0 left-0 right-0 z-30 pointer-events-none
               pt-[6vh] md:pt-[4vh] px-6"
  >
    <div className="max-w-4xl mx-auto pointer-events-auto">
      <p className="text-sm md:text-base text-white/70 mb-2">Hi there, this is</p>
      <h1 className="text-6xl md:text-8xl font-serif text-white leading-[0.95]">
        Hirusha Dassanayaka.
      </h1>
      <p className="text-lg md:text-xl text-white/85 mt-6">Building bridges between</p>
      <RotatingWords className="text-6xl md:text-8xl" />
    </div>
  </div>

  {/* About section content — unchanged from current implementation */}
  {/* (BlurWords, right-aligned, sits where it sits today — do not move it) */}
</div>
```

### Critical requirements

- **`position: absolute; top: 0`** on the intro overlay, relative to the 180vh `relative` wrapper — NOT relative to a sticky parent.
- **`z-index: 30`** — above K0 (10), scrim (15), and K1 (20), but below the About text z-order so the About reveal can paint over it later.
- **`pointer-events-none`** on the outer wrapper, **`pointer-events-auto`** on the inner content — so the overlay doesn't block clicks on anything below it that bleeds out of bounds (defensive).
- **No opacity transitions tied to `activeProgress`** — the text scrolls off naturally by leaving the viewport. Do not bind its opacity to scroll progress. (If FIX 1 added any such binding, remove it.)
- **No entrance animation beyond the curtain.** Specifically: no `initial={{ opacity: 0 }}` + `animate={{ opacity: 1 }}` on the wrapper, no delayed framer-motion entrance. The text is simply *there* when the curtain reveals it.
- **Preserve the current text styles, sizes, and content** — same fonts, same colors, same rotating words array. Only positioning changes.

### Reduced-motion / mobile fallback

If the current implementation has a `useFallback` branch that renders the intro text in a separate static layout for mobile / reduced-motion users, mirror the same positioning fix there: the text should still be the first thing visible on load, positioned absolutely over the top of the hero. On a small mobile viewport this might mean a slightly tighter `pt-[4vh]` and `max-w-full` — use judgment, but the visibility-on-load behavior is non-negotiable across all variants.

---

## Acceptance test

1. Hard-reload the page (or open in an incognito tab to ensure the curtain runs).
2. The curtain animation plays.
3. **As the curtain lifts, the intro text is fully visible at the top of the viewport**, overlaying the desk image. The user can read "Hi there, this is", "Hirusha Dassanayaka.", "Building bridges between", and the rotating word — all without touching the scroll wheel.
4. The desk image is visible behind the text (faintly, since the text overlays it).
5. Scroll down by ~50% of one viewport. The intro text has scrolled up; its bottom edge is near the middle of the viewport. The desk image is still pinned and slightly zoomed.
6. Scroll to one full viewport down. The intro text is completely off-screen. The desk image is still pinned (sticky), and the scrim is starting to darken it.
7. Continue scrolling. The About section enters and behaves exactly as it does today (BlurWords, right-aligned, etc.).
8. Scroll back to the top. The intro text re-enters from above and lands at its starting position. No flicker, no jump.

---

## Files to touch

- `src/sections/CinematicIntro.tsx` — restructure the intro text block so it lives as an `absolute top-0` child of the 180vh `relative` wrapper, not as a sibling/successor in normal flow.

## Files NOT to touch

- `src/components/BlurWords.tsx` — leave alone
- `src/components/RotatingWords.tsx` — leave alone
- `src/components/CurtainLoader.tsx` — leave alone
- `src/hooks/useScrollScrub.ts` — leave alone
- Any other section / component

## Edge cases for Antigravity

- If repositioning the intro text causes any z-stacking issue with the scrim or About text (e.g., About text appearing *behind* the intro overlay when both are technically painted), keep the intro text at `z-30` and bump the About content to `z-40`. The About section should always paint above the intro overlay since they exist in the same wrapper but at different scroll positions.
- If the sticky region's total height (180vh) feels off now that the intro text is absolutely positioned within it instead of stacked after it, adjust the height — but flag the change in the commit message rather than tweaking silently. A reasonable range is 160vh–220vh; don't drop below 140vh or the About reveal feels rushed.
