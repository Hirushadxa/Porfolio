# Spec — Mobile Headshot + Tablet Adaptation + Desktop Cinematic (Hybrid Responsive Strategy)

**Date:** 2026-05-25
**Target file:** `src/sections/CinematicIntro.tsx`
**Builds on:** `2026-05-25-k1-responsive-scale-darken-spec.md` (the K1 height + scrim opacity tweaks for tablet sizes still apply on the desktop branch). The work in this spec focuses on **completely rewriting the mobile fallback branch** to use a dedicated headshot-above-text layout.
**Scope:** Restructure the `useFallback` branch only. The desktop branch (`≥ 768px`) keeps its current layered cinematic design; if the previous K1/scrim responsive tweaks haven't been applied yet, apply them as part of this spec too. Do not touch the curtain, intro text rotation logic, RevealWords, BlurWords, FloatingLogos internals, useScrollScrub, or any other component.

---

## The problem we're solving

On phone-width viewports (< 768px), the current mobile fallback still tries to render the layered K0 desk scene + K1 person foreground design — just statically. That layered approach doesn't translate to portrait orientation:

- K0 desk scene cropped to a phone aspect ratio is mostly empty background; the desk and monitors lose their context.
- K1 person, sized at `h-[95%] w-auto max-w-none object-contain`, becomes either too narrow (height-constrained) or overflow-clipped (width-uncapped). Either way the person ends up small, awkwardly positioned, or partially cut off — which is what Gemini's video review flagged ("pushing the person way down to the bottom, cropping him out").
- Overlay text competes with the image for the same vertical space, leading to bad legibility.

The fix is a **hybrid responsive strategy**:

- **`< 768px` (mobile):** Abandon the layered cinematic concept. Render a clean stacked layout with a **CSS-cropped headshot above the stacked intro text and About content**. K0 is hidden entirely. No scrim, no overlay competing with text. Looks app-like and polished on phones.
- **`768–1023px` (tablet/small laptop):** Keep the layered cinematic design but apply the previously-specced responsive K1 height (`h-[115%] md:h-[105%] lg:h-[100%] xl:h-[95%]`) and softer scrim (`from-black/40 md:from-black/55 lg:from-black/65 xl:from-black/75 …`) — both already specced in `2026-05-25-k1-responsive-scale-darken-spec.md`. If those haven't been applied yet, apply them now.
- **`≥ 1024px` (desktop):** No changes from current behavior.

This way each viewport range gets a design that's actually appropriate to it.

---

## CHANGE 1 — Rewrite the mobile fallback branch

The current fallback (lines ~113–199 of `CinematicIntro.tsx`) renders the layered K0+K1+scrim design statically with overlay text on top. Replace the entire `if (useFallback) { return ( … ) }` block with a clean stacked layout.

### New fallback structure

```tsx
if (useFallback) {
  return (
    <section id="cinematic-intro" className="bg-bg">
      {/* ── Hero (stacked: headshot → intro text) ── */}
      <div className="px-6 pt-8 pb-12 space-y-8">
        {/* Headshot — CSS-cropped from existing K1-person.png */}
        <div
          className="mx-auto rounded-2xl overflow-hidden bg-surface"
          style={{
            width: 'clamp(220px, 64vw, 320px)',
            height: 'clamp(220px, 64vw, 320px)',
          }}
        >
          <img
            src="/hero/K1-person.png"
            alt="Hirusha Dassanayaka"
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 18%' }}
          />
        </div>

        {/* Intro text — stacked, left-aligned, mobile-tuned sizes */}
        <div className="space-y-4 text-left max-w-xl mx-auto">
          <p className="font-mono text-sm text-fg-muted">Hi there, this is</p>
          <h1 className="text-4xl leading-[1] font-display sm:text-5xl">
            Hirusha Dassanayaka.
          </h1>
          <p className="pt-2 text-base text-fg-muted sm:text-lg">
            Building bridges between
          </p>
          <div className="font-display italic text-accent text-3xl leading-[1.05] sm:text-4xl">
            <RotatingWords words={ROTATING_WORDS} />
          </div>
        </div>
      </div>

      {/* ── About (stacked, stagger-revealed) ── */}
      <div id="about" className="px-6 pb-24">
        <div className="max-w-xl mx-auto">
          <Reveal>
            <div className="mb-8 space-y-3">
              <span className="font-mono text-sm tracking-wider text-accent">
                (About)
              </span>
              <h2 className="font-display text-3xl leading-[1.05] text-fg sm:text-4xl">
                Tech-fluent. Business-minded. Detail-obsessed.
              </h2>
            </div>
          </Reveal>

          <div className="space-y-5">
            <Reveal delay={0.08}>
              <p className="text-base leading-relaxed text-fg sm:text-lg">
                {aboutParagraph1}
              </p>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="text-base leading-relaxed text-fg sm:text-lg">
                {aboutParagraph2}
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <p className="font-mono text-sm tracking-wide sm:text-base">
                {aboutLanguageLine}
              </p>
            </Reveal>
          </div>

          {/* Compact logo strip */}
          <div className="pt-10">
            <Reveal delay={0.32}>
              <FloatingLogos progress={0} compact />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
```

### Critical notes on the new fallback

- **No K0 image, no scrim, no parallax, no scroll-zoom.** The mobile design completely abandons the layered cinematic concept. Section background is just `bg-bg` (the solid dark theme color).
- **Headshot container uses `clamp(220px, 64vw, 320px)`** so it scales with viewport: 220px floor for very small phones, 64vw at typical phone sizes (~240px at 375px width, ~287px at 448px width), 320px ceiling on larger phones / tablet portrait. Square aspect ratio, `rounded-2xl` (16px corners) for a polished but not overly stylized look.
- **`object-position: center 18%`** crops the K1 image so the head and upper torso are visible inside the square. The 18% Y-offset is a calibrated guess; if visually the crop cuts off the top of the head or shows too much shoulder, tune between `center 8%` and `center 25%` by eye. Don't over-engineer this — adjust by visual inspection.
- **`bg-surface` on the container** fills in any letterboxing if the image's aspect ratio doesn't perfectly match the square — it'll show as a subtle darker square behind the cropped portrait, which looks intentional.
- **Reveal animations preserved** on intro and About sections (the `Reveal` component with staggered delays from the previous fallback — keep them, they work on mobile).
- **`RotatingWords` still active** — the rotating word animation runs on mobile because it doesn't depend on scroll, just on a timer.
- **Compact `FloatingLogos`** sits at the bottom of the About section as a horizontal logo strip — that's what the `compact` prop is for. Don't try to render the scattered/floating version on mobile.

### What gets removed from the fallback

- The entire layered K0+K1 image stack including the gradient scrim.
- The "Scroll down" cue at the bottom.
- The `min-h-dvh` viewport-locking on the hero area (the new hero is just a stacked div that takes its natural height).
- All the absolute positioning, flex column with `flex-1` spacer, etc. — replaced with simple block flow.

### What stays from the fallback

- Section id `cinematic-intro` and the `id="about"` anchor for nav links.
- `RotatingWords` import and usage.
- `Reveal` staggered entrance on About content.
- `FloatingLogos` compact strip.
- `aboutParagraph1`, `aboutParagraph2`, `aboutLanguageLine` content strings (already defined above the fallback branch — they're shared with desktop).

---

## CHANGE 2 — Confirm tablet (768–1023px) adaptations are applied

These were specified in `2026-05-25-k1-responsive-scale-darken-spec.md`. Check the desktop branch and verify both are present. If either is missing, apply it now:

### K1 image height (desktop branch, around line ~242)

Should currently read:

```tsx
<motion.img
  src="/hero/K1-person.png"
  alt="Hirusha Dassanayaka at his workspace"
  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[115%] md:h-[105%] lg:h-[100%] xl:h-[95%] w-auto max-w-none object-contain"
  style={{
    scale: imageScale,
    willChange: 'transform',
  }}
/>
```

If it still says `h-[95%]` or `max-w-[100vw]`, replace with the above.

### Static left-side scrim (desktop branch, around line ~227)

Should currently read:

```tsx
<div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/40 md:from-black/55 lg:from-black/65 xl:from-black/75 via-black/20 md:via-black/28 lg:via-black/34 xl:via-black/40 to-transparent to-65%" />
```

If it still says `from-black/75 via-black/40` flat (no responsive variants), replace with the above.

---

## CHANGE 3 — Add a tablet object-position shift on K0 (desktop branch)

This is new (not in the previous K1/scrim spec). On tablet widths the K0 desk scene with default `object-position: center center` crops the sides of the scene roughly symmetrically. With the About text now anchored to the right column on the desktop branch, the right side of K0 gets covered by the About content during scroll — meaning the visually important part of the desk scene (monitors, the person's position in the chair) is in the *left to middle* of the K0 image. Shifting `object-position` slightly leftward on tablet widths keeps more of the scene visible *to the left of where the About text overlays*.

### Current K0 image (around line ~214)

```tsx
<motion.img
  src="/hero/K0.jpg"
  alt=""
  className="h-full w-full object-cover"
  style={{
    scale: imageScale,
    opacity: imageOpacity,
    willChange: 'transform, opacity',
  }}
/>
```

### Replace with

```tsx
<motion.img
  src="/hero/K0.jpg"
  alt=""
  className="h-full w-full object-cover object-[35%_center] md:object-[40%_center] lg:object-[center_center]"
  style={{
    scale: imageScale,
    opacity: imageOpacity,
    willChange: 'transform, opacity',
  }}
/>
```

### Why these specific values

- `object-[35%_center]` for the `< md` desktop branch range (shouldn't happen often since `< 768px` goes to the mobile fallback, but for the brief 768px crossover this gives a sane default).
- `md:object-[40%_center]` (768–1023px tablet/small laptop) — shifts the visible crop slightly to the left of K0's image so the desk and person are more centered in the visible frame, before the About column overlays the right side.
- `lg:object-[center_center]` (≥ 1024px) — back to dead center. On large screens there's enough horizontal room that center-cropping shows everything important.

### What this fixes

On a 1024px tablet/laptop, before this change: K0 is center-cropped, with the right side of the scene partially visible. With About text overlaying the right side (anchored via `ml-auto`), the visually interesting part of the scene gets covered. After this change: the visible K0 crop shifts slightly left, so the monitors and person remain visible to the *left* of the overlaid About text — the composition reads as "person and workspace on the left, About text on the right" instead of "About text covering the workspace."

---

## Acceptance test

### Mobile (`< 768px`)

1. Open Chrome DevTools, set viewport to **375×667** (iPhone SE).
2. The page shows: nav at top, then a centered square headshot (~240px) of Hirusha's face and upper torso, then "Hi there, this is", "Hirusha Dassanayaka.", "Building bridges between", and the rotating word — all left-aligned in a single column.
3. The About section follows in normal flow with the (About) eyebrow, headline, two paragraphs, language line, and the compact logo strip.
4. **No K0 desk scene is visible anywhere on the page.** The background is solid dark (`bg-bg`).
5. **No horizontal scrolling.** Vertical scrolling only.
6. The headshot is cropped tightly to show the face and shoulders — no awkward letterboxing, no body cut off mid-torso in a weird way.
7. Resize to **414×896** (large phone) — the headshot grows to about 265px square, layout stays clean.

### Tablet (`768–1023px`)

8. Set viewport to **820×1180** (iPad portrait). The desktop branch activates.
9. The layered cinematic hero is visible — K0 desk scene + K1 person foreground + scrim.
10. K1 person fills more of the frame than at default `h-[95%]` (because the responsive height is `md:h-[105%]`).
11. The static left-side scrim is lighter than on desktop (because `md:from-black/55` instead of `xl:from-black/75`) — K1 person reads brighter, less washed out.
12. K0 image's visible crop is shifted slightly left (`md:object-[40%_center]`) — the workspace remains visible to the left of the About text column.
13. Switch to **1024×768** (small laptop landscape, just at the `lg` breakpoint). The K0 returns to center crop, scrim returns to `lg:from-black/65`, K1 height returns to `lg:h-[100%]`.

### Desktop (`≥ 1280px`)

14. Set viewport to **1920×1080**. Everything looks exactly like the current behavior — no regressions on large screens.
15. K0 center-cropped, K1 at `xl:h-[95%]`, scrim at `xl:from-black/75`, full cinematic intent.

### No cross-regression

16. The curtain animation still plays on first load at every viewport size.
17. The dark-fade scrim (the `bg-black` layer driven by `scrimDarkenOpacity`) still fades K0+K1 together during scroll on desktop.
18. The About-readability gradient scrim still activates correctly during scroll on desktop.
19. The intro text overlay still scrolls off naturally on desktop.
20. The RevealWords per-word blur reveal still triggers correctly in the About section on desktop.
21. Reduced-motion users get the mobile-style fallback layout (because `useFallback = isMobile || !!prefersReduced` — anyone with the OS-level reduce-motion setting will see the clean stacked layout, which is the correct behavior).

---

## Files to touch

- `src/sections/CinematicIntro.tsx` — three coordinated edits:
  - Replace the entire `if (useFallback) { return ( … ) }` block with the new stacked headshot layout (CHANGE 1).
  - Verify/apply the responsive K1 height and scrim opacity from the previous spec on the desktop branch (CHANGE 2).
  - Add the responsive `object-position` chain to the K0 `motion.img` on the desktop branch (CHANGE 3).

## Files NOT to touch

- `src/components/RevealWords.tsx`, `RotatingWords.tsx`, `CurtainLoader.tsx`, `FloatingLogos.tsx`, `Reveal.tsx` — leave alone.
- `src/hooks/useScrollScrub.ts` — leave alone.
- `src/index.css` — leave alone (the `overflow-x: clip` from the double-scrollbar fix must remain).
- The K0.jpg or K1-person.png image files — no new assets, no file edits. The headshot is CSS-cropped from the existing K1.
- The desktop branch's About section structure (FloatingLogos column + RevealWords column) — already correct from prior specs.

## Edge cases for Antigravity

- If the `object-position: center 18%` crop on the headshot doesn't show Hirusha's face well (e.g., crops off the top of his head, or shows too much shoulder), tune the Y-offset between `8%` and `25%`. The exact value depends on where in the K1-person.png image the face sits — visual inspection should be the deciding factor, not a fixed rule.
- If the `clamp(220px, 64vw, 320px)` headshot size feels too large or too small on real devices, adjust the clamp values. `clamp(200px, 60vw, 300px)` is more conservative; `clamp(240px, 70vw, 360px)` is more generous.
- The `bg-surface` filler behind the headshot (if the image doesn't perfectly fill the square) should be a subtle dark surface tone, not a contrasting color. If `bg-surface` reads as too light, use `bg-bg` instead.
- If `RotatingWords` looks distractingly large on mobile at `text-3xl sm:text-4xl`, drop it to `text-2xl sm:text-3xl`. Match the headline weight without dominating.
- The `Reveal` component's stagger delays (0.08 / 0.16 / 0.24 / 0.32) are calibrated for desktop intersection-observer behavior. On mobile they should still work — but if entries feel slow or clunky, halving them (0.04 / 0.08 / 0.12 / 0.16) is acceptable. Don't change unless the staggers feel sluggish.
- DO NOT try to combine the mobile and desktop branches via responsive Tailwind classes — they need to be separate return paths because the structural design (layered vs. stacked) is fundamentally different. The `useFallback` boolean is the correct discriminator.
