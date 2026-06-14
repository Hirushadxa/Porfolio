# Spec — Restore Blur in RevealWords + Strict Right-Column Layout

**Date:** 2026-05-25
**Target files:** `src/components/RevealWords.tsx`, `src/sections/CinematicIntro.tsx`
**Supersedes:** The reveal-effect portions of `2026-05-25-about-left-align-opacity-sweep-spec.md` and `2026-05-25-about-right-anchor-sweep-sharpen-and-overflow-spec.md` (FIX 3 only). The horizontal-overflow fixes from those specs (`w-full` instead of `w-screen`, `overflow-x-hidden` on section root, `max-w-[100vw]` on K1) have already been applied and remain correct — do not change them.
**Source of truth:** This spec follows Gemini's exact technical specification for a "Scroll-Driven Word-by-Word Text Reveal with Motion Blur." The previous specs incorrectly removed the blur — restore it; the blur is the secret sauce that creates the sweep illusion.

---

## Context — why this spec exists

A prior spec asked Antigravity to remove the blur from the per-word reveal because an earlier description (also from Gemini) had emphasized opacity-only transitions. After viewing the actual reference video, the user confirmed the correct effect uses **both** a blur transition (4px → 0px) **and** an opacity transition (0.15 → 1.0), and that the blur is essential — it's what creates the perceived "soft-edged highlight sweeping across the line" rather than discrete per-word steps.

Two things need to change:

1. **`RevealWords.tsx`** — restore the blur transition, drop opacity baseline to 0.15, widen the reveal window so 2–3 adjacent words are mid-transition simultaneously, add explicit GPU hints.
2. **About section wrapper in `CinematicIntro.tsx`** — restructure so the text block sits strictly in the right column (Tailwind: `ml-auto w-full md:w-1/2 lg:w-5/12`) with the text inside still reading left-to-right. The current grid (`mx-auto max-w-6xl grid grid-cols-12`) keeps the block too central.

---

## FIX A — Rewrite `RevealWords.tsx` with blur + opacity reveal

### Animation specification (verbatim from Gemini)

> Base (Dim) State: `opacity: 0.15` and `filter: blur(4px)`
>
> Active (Revealed) State: `opacity: 1` and `filter: blur(0px)`
>
> Hardware Acceleration: Ensure the animated words include `transform: translateZ(0)` or `will-change: opacity, filter` to force GPU rendering and prevent scroll lag.
>
> Adjust the Framer Motion viewport offsets (e.g., `['start 0.8', 'start 0.4']`) so that 2 or 3 adjacent words are slightly in-transition at the exact same time.

### Implementation

Replace the current contents of `src/components/RevealWords.tsx` with:

```tsx
import { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
} from 'framer-motion';

interface RevealWordsProps {
  text: string;
  className?: string;
}

interface WordProps {
  word: string;
}

function Word({ word }: WordProps) {
  const ref = useRef<HTMLSpanElement>(null);

  // Wide overlap window — 2–3 adjacent words are mid-transition at any moment,
  // which is what creates the continuous-sweep illusion (not discrete steps).
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'start 0.4'],
  });

  // Opacity 0.15 → 1.0
  const opacity = useTransform(scrollYProgress, [0, 1], [0.15, 1]);

  // Blur 4px → 0px (numeric value driven by scroll, composed via template)
  const blurPx = useTransform(scrollYProgress, [0, 1], [4, 0]);
  const filter = useMotionTemplate`blur(${blurPx}px)`;

  return (
    <motion.span
      ref={ref}
      style={{
        opacity,
        filter,
        // GPU hint — force compositor layer so blur + opacity animations
        // don't trigger layout/paint on the main thread.
        willChange: 'opacity, filter',
        transform: 'translateZ(0)',
      }}
      className="inline-block"
    >
      {word}
      {/* Trailing space as its own span so words don't mash together. */}
      <span>&nbsp;</span>
    </motion.span>
  );
}

export default function RevealWords({ text, className = '' }: RevealWordsProps) {
  const prefersReduced = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);

  // Reduced motion: render static, fully-opaque, unblurred text.
  if (prefersReduced) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p className={className}>
      {words.map((word, i) => (
        <Word key={`${word}-${i}`} word={word} />
      ))}
    </p>
  );
}
```

### Critical implementation notes

- **`useMotionTemplate`** is required to compose the numeric `blurPx` motion value into the CSS `filter: blur(...)` string. Do **not** try to drive `filter` directly with a numeric `useTransform` — it needs to be a string, and `useMotionTemplate` is framer-motion's idiomatic way to do that without manual subscription.
- **The reveal window `['start 0.8', 'start 0.4']`** is intentionally 40% of viewport height (wider than the 17% from the previous failed spec). This width is what allows 2–3 adjacent words to be in mid-transition simultaneously, producing the continuous sweep rather than a stair-step.
- **`transform: translateZ(0)` AND `willChange: 'opacity, filter'`** — both are applied. `translateZ(0)` promotes the element to its own compositor layer; `will-change` tells the browser which properties will animate. The combination is the most reliable cross-browser hint for GPU compositing of blur + opacity.
- **Drop the prop interface for `baseOpacity` / `fullOpacity`** — they're no longer needed; the values are hardcoded to match the spec exactly (0.15 / 1.0). Anyone who needs to tune them can edit the component directly.
- **Trailing `<span>&nbsp;</span>`** stays — without it, the `inline-block` motion spans collapse against each other.
- **Reduced-motion fallback** renders a plain `<p>` with no per-word spans, no blur, no scroll binding.

---

## FIX B — Restructure the About section to strict right-column layout

### Layout specification (verbatim from Gemini)

> The text block needs to sit completely on the right half of the screen, leaving the left side empty, but the text inside the block must read naturally from left to right.
>
> The parent wrapper must use Tailwind classes to constrain the width and push it right: `className="ml-auto w-full md:w-1/2 lg:w-5/12 text-left pr-6 md:pr-12 pl-6 md:pl-8 lg:pl-0"`
>
> The text inside must remain left-aligned (`text-left`).

### Implementation

In `src/sections/CinematicIntro.tsx`, replace the desktop branch's About viewport block. Currently it looks like (lines ~317–363):

```tsx
<div
  id="about"
  className="relative min-h-dvh w-full flex items-center justify-end px-6 md:px-16 py-24 md:py-32 pointer-events-auto"
>
  <div className="mx-auto max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
    <div className="md:col-span-5 h-[400px] relative pointer-events-none hidden md:block">
      <FloatingLogos progress={0.5} />
    </div>
    <div className="md:col-span-7 space-y-8 text-left pr-6 md:pr-12">
      {/* heading + RevealWords + language line + mobile logos */}
    </div>
  </div>
</div>
```

Replace with:

```tsx
<div
  id="about"
  className="relative min-h-dvh w-full py-24 md:py-32 pointer-events-auto"
>
  {/* Left half: FloatingLogos floats in its own absolute space so it doesn't
      compete with the text block for layout. On mobile it disappears and the
      compact logo strip inside the text block handles it. */}
  <div className="absolute inset-y-0 left-0 w-1/2 hidden md:flex items-center pointer-events-none px-6 md:px-12">
    <div className="relative w-full h-[400px]">
      <FloatingLogos progress={0.5} />
    </div>
  </div>

  {/* Right half: About text block — exact Tailwind classes from Gemini spec.
      ml-auto pushes the block to the right; the responsive widths progressively
      narrow it as the viewport widens (full → half → 5/12).
      Text inside is left-aligned. */}
  <div className="ml-auto w-full md:w-1/2 lg:w-5/12 text-left pr-6 md:pr-12 pl-6 md:pl-8 lg:pl-0 space-y-8">
    <div className="mb-12 space-y-4">
      <span className="font-mono text-sm tracking-wider text-accent md:text-base">
        (About)
      </span>
      <h2 className="font-display text-4xl leading-[1.05] text-fg md:text-5xl">
        Tech-fluent. Business-minded. Detail-obsessed.
      </h2>
    </div>

    <div className="space-y-6">
      <RevealWords
        text={aboutParagraph1}
        className="text-lg leading-relaxed text-white md:text-xl"
      />
      <RevealWords
        text={aboutParagraph2}
        className="text-lg leading-relaxed text-white md:text-xl"
      />
      <p className="font-mono text-base tracking-wide md:text-lg">
        {aboutLanguageLine}
      </p>
    </div>

    {/* Mobile logos list (md:hidden) */}
    <div className="block md:hidden pt-8">
      <Reveal delay={0.32}>
        <FloatingLogos progress={0} compact />
      </Reveal>
    </div>
  </div>
</div>
```

### Why a flex/grid container is no longer used

Previously the two columns (FloatingLogos + About text) lived inside a shared grid. That coupled their widths and forced both to obey the grid's centering. Per Gemini's spec, the About wrapper needs its own width chain (`w-full md:w-1/2 lg:w-5/12`) with `ml-auto` — that's incompatible with being a grid child whose width is dictated by the grid template.

The cleanest decoupling is to make the parent `relative`, position FloatingLogos absolutely in the left half (it's decorative scattering anyway, doesn't need flow positioning), and let the About text use its own flex/block flow on the right via `ml-auto`. This matches Gemini's spec verbatim and leaves the visual outcome identical to or better than the previous grid approach.

### Acceptance test

1. Open on a wide monitor (≥1440px).
2. The About section's text block sits clearly on the **right side** of the viewport — its leftmost edge starts past the visual center.
3. On a 1920px viewport, the text block takes roughly 5/12 of viewport width (~800px) and is anchored to the right edge with `pr-6 md:pr-12` worth of breathing room.
4. The FloatingLogos float in the left half of the section, vertically centered, not overlapping the text.
5. On a 1024px viewport, the text block takes half the viewport width (`md:w-1/2`) and still hugs the right side.
6. On mobile (<768px), the FloatingLogos are hidden in their absolute container (which is `hidden md:flex`), and the compact logo strip inside the text block renders instead. The text block is full-width.
7. The text inside each paragraph remains **left-aligned** (lines start at the same x-position and wrap right).

---

## FIX C — Verify the reveal works on the new layout

After both fixes land, the per-word blur reveal must trigger correctly on the new right-column block. Things to verify:

1. As you scroll the About section into view, each word transitions from `opacity: 0.15, blur(4px)` to `opacity: 1, blur(0)` over a 40%-of-viewport scroll distance.
2. At any moment during the scroll, you can see **2–3 adjacent words mid-transition** — slightly blurred and slightly dim — between a clear "bright" zone above and a clear "dim/blurry" zone below.
3. Scrolling back up causes the same words to re-blur and re-dim. Effect is fully bidirectional.
4. No layout shift when blur is applied (because `inline-block` + spacer span are preserved).
5. No visible scroll jank — the `willChange` + `translateZ(0)` hints should ensure compositor-only animation.
6. On `prefers-reduced-motion: reduce` or `(max-width: 767px)` (the `useFallback` path in `CinematicIntro`), the About text renders statically without blur or per-word animation. The right-column layout still applies on desktop reduced-motion; on mobile the layout collapses to full-width as designed.

---

## Files to touch

- `src/components/RevealWords.tsx` — full rewrite per FIX A.
- `src/sections/CinematicIntro.tsx` — replace the desktop About viewport block per FIX B. The mobile/fallback `if (useFallback)` branch does not need changes (it already uses static text via `Reveal` with no per-word animation).

## Files NOT to touch

- The intro overlay (Hi there / Hirusha Dassanayaka / Building bridges / RotatingWords) — already correct.
- The sticky background (K0 + scrim + K1 + dark scrim + about-readability gradient) — already correct from prior specs.
- `useScrollScrub.ts`, `RotatingWords.tsx`, `CurtainLoader.tsx`, `FloatingLogos.tsx`, `Reveal.tsx` — leave alone.
- Section root's `overflow-x-hidden` and `h-[200dvh]` — keep as-is.

## Edge cases for Antigravity

- If `useMotionTemplate` import errors out, framer-motion has had it since v6 — verify the project's framer-motion version is at least v6; the project already uses other framer-motion features so this should be fine. Don't fall back to a manual subscribe pattern unless the import actually fails.
- If absolute-positioning the FloatingLogos in the left half causes them to overlap a section above or below the About block (because the parent has `min-h-dvh` and the logos are absolute within it), constrain the absolute container to a centered vertical band (e.g., `top-1/2 -translate-y-1/2 h-[400px]` instead of `inset-y-0 items-center`).
- If the `lg:w-5/12` width feels too narrow on ultra-wide monitors (≥2560px), the chain can extend with `2xl:w-1/3` or `2xl:max-w-[640px]` — but only add this if visually justified.
- If the About-readability scrim (the right-side gradient) no longer aligns visually with where the text now sits (text is further right than before), bump the scrim's gradient stops so the dark zone aligns under the text — e.g., change `bg-gradient-to-l from-black/85 via-black/55 to-transparent` to `bg-gradient-to-l from-black/90 via-black/60 to-transparent to-55%`. Tune by eye.
