# Spec: Curtain reveal + sticky-zoom rework + hero layout

**Date:** 2026-05-24
**Scope:** Replace the hero scroll choreography in the portfolio so it matches Valentin's reference video (uploaded separately by Hirusha). Three coordinated changes: a new page-load curtain, a sticky-zoom rework that keeps the portrait visible behind the About text, and three small layout fixes inside the hero overlay.

---

## 0. Context for Antigravity

You are editing a Vite + React + TypeScript + Tailwind + framer-motion portfolio. Key existing files you will reference or modify:

- `src/App.tsx` — top-level layout, imports the hero/nav/footer
- `src/sections/CinematicIntro.tsx` — sticky scroll-scrub hero + About section (this is the file most of the work touches)
- `src/components/RotatingWords.tsx` — already-built cycling word component used inside the tagline; inherits font-size from its parent span
- `src/components/ParagraphReveal.tsx` — already-built scroll-driven paragraph fade-in primitive
- `src/components/FloatingLogos.tsx` — already-built scattered logo layer rendered in the left column of the About reveal
- `src/components/Reveal.tsx` — generic in-view stagger fade used by the mobile fallback path
- `src/hooks/useScrollScrub.ts` — returns 0..1 scroll progress through a sticky section

Do not modify `RotatingWords.tsx`, `ParagraphReveal.tsx`, `FloatingLogos.tsx`, `Reveal.tsx`, `useScrollScrub.ts`, `Nav.tsx`, `Footer.tsx`, or any section after CinematicIntro.

---

## 1. Page-load curtain (new component)

### Goal
On first page load, reveal the hero with a diagonal split-screen black curtain — two triangular panels parting along a top-left → bottom-right diagonal.

### Create `src/components/CurtainLoader.tsx`

**Behavior:**

1. Renders two black triangular panels covering the full viewport on mount.
2. After a brief hold (~180ms), both panels slide apart perpendicular to a TL→BR diagonal:
   - **Upper-right triangle** (vertices: top-left, top-right, bottom-right) slides north-east — `x: 120%, y: -120%`
   - **Lower-left triangle** (vertices: top-left, bottom-left, bottom-right) slides south-west — `x: -120%, y: 120%`
3. Slide duration: `1.0s`, easing: `[0.7, 0, 0.3, 1]` (smooth cubic out).
4. After the animation completes the component unmounts itself (no layout cost afterwards).
5. While the curtain is up, `document.body.style.overflow` is set to `'hidden'` to lock scrolling; restore the previous value on cleanup.
6. **Plays once per browser session** — set `sessionStorage.setItem('curtain-played', '1')` on play, skip if the key is already present. Wrap the sessionStorage access in try/catch (Safari private mode can throw).
7. **Respects `useReducedMotion()`** — skip the curtain entirely (render `null`) for users who prefer reduced motion.

**Implementation notes:**

- Use `motion.div` from `framer-motion`.
- Use CSS `clip-path: polygon(...)` to shape the triangles. Apply the clip-path via the `style` prop so framer-motion can animate `x` and `y` transforms separately.
- Fixed positioning, `inset-0`, `z-[100]`, `pointer-events-none`.
- Use `useState<boolean | null>(null)` so the decision (play vs skip) is made client-side after mount — avoids SSR mismatches even though Vite is SPA-only.

**Polygon strings:**

- Upper-right: `polygon(0 0, 100% 0, 100% 100%)`
- Lower-left: `polygon(0 0, 0 100%, 100% 100%)`

### Mount in `src/App.tsx`

Add `<CurtainLoader />` as the **first child** of the top-level fragment (before `<Nav />`), and import it from `./components/CurtainLoader`. Do not change any other JSX in App.tsx.

### Acceptance criteria

- On first page load with motion enabled, you see two black triangles part diagonally over ~1.2 seconds total (0.18s hold + 1.0s slide), then the hero is fully visible.
- Refreshing within the same browser tab does **not** replay the curtain.
- Opening a new tab to the same URL **does** replay it.
- With `prefers-reduced-motion: reduce`, the curtain is skipped entirely on first load and you see the hero immediately.
- Scrolling is locked during the animation and unlocked the moment it finishes.
- The component is removed from the DOM after animation; no leftover divs.

---

## 2. Sticky-zoom rework (modify `CinematicIntro.tsx`)

### Current behavior to change

The desktop branch (the `if (useFallback)` returns mobile/reduced-motion; everything below it is desktop) currently:

- Scales both `K0.jpg` (background) and `K1-person.png` (foreground) from `1 → 1.15` over scroll 0–30%.
- Fades both images from opacity `1 → 0` over the same 0–30% window.
- Fades the scrim alongside the images.
- About text reveals on a near-black backdrop after the picture disappears.

### Desired behavior

The portrait must **stay visible across the entire 500vh sticky region** and zoom in continuously. About text overlays on top of the still-visible, slowly zooming portrait.

**New scroll math:**

| Element | Old | New |
|---|---|---|
| `imageScale` (both K0 and K1-person) | `1 + min(p/0.3, 1) * 0.15` | `1 + p * 0.5` (slow zoom 1 → 1.5 across full 0–100% scroll) |
| `imageOpacity` (both layers) | `1 - min(p/0.3, 1)` | **Remove.** Images stay at full opacity. |
| Base scrim opacity (the gradient between K0 and K1-person) | tied to `imageOpacity` | **Remove the opacity binding** — base scrim stays at full strength |
| `overlayOpacity` (intro text fade) | `1 - min(p/0.3, 1)` | `1 - min(p/0.22, 1)` (intro text clears slightly faster so it doesn't compete with the About reveal) |
| Handoff bg fade | `max(0, (p - 0.95) / 0.05)` | **Unchanged** — keep clean exit to next section |

**New layer — About-readability scrim**

The right side of the picture must darken as the About text reveals so the prose stays legible against the portrait. Add a new `<div>` between the floating-logos layer and the intro overlay text layer:

```tsx
{/* About-readability scrim — strengthens as About reveals */}
<div
  className="absolute inset-0 z-[3] pointer-events-none bg-gradient-to-l from-black/85 via-black/55 to-transparent"
  style={{ opacity: aboutScrimOpacity, willChange: 'opacity' }}
/>
```

Where `aboutScrimOpacity = Math.min(Math.max(0, (activeProgress - 0.15) / 0.20), 1)` — i.e. ramps `0 → 1` between scroll 15% and 35%.

Z-index check after the change:
- K0 background: `z-auto` (parent z-0)
- Base scrim: `z-[1]`
- K1-person: `z-[2]`
- Floating logos: `z-[3]`
- About-readability scrim: `z-[3]` (placed AFTER floating logos in JSX so it paints on top of them, but `gradient-to-l` keeps the left column where the logos sit transparent)
- Intro overlay text: `z-[4]`
- About reveal text: `z-[5]`
- Section handoff: `z-[6]`

**About paragraph timing — leave the existing windows as-is:**
- Paragraph 1: `start={0.30}` `end={0.45}`
- Paragraph 2: `start={0.50}` `end={0.65}`
- Language line: `start={0.70}` `end={0.82}`

The 500vh sticky region length is **unchanged**.

The mouse parallax on K1-person (springs, ±12px X / ±8px Y) is **unchanged**.

### Acceptance criteria

- On the desktop branch, the portrait is visible from scroll 0% through to ~95% (where the handoff begins).
- Scrolling makes the portrait grow noticeably larger (final scale 1.5×), zoomed from bottom-center (preserve the existing `bottom-0 left-1/2 -translate-x-1/2` anchoring).
- Intro text (Hi there / Name / Building bridges / Rotating word) fully fades out by ~22% scroll.
- About paragraphs appear sequentially on top of the still-visible portrait.
- The right side of the screen darkens between 15% and 35% scroll, making About text readable; the left side (where floating logos sit) stays clear so logos remain visible.
- Floating logos still appear and float as before.
- The mobile/reduced-motion fallback path (the `if (useFallback)` branch at the top of the component) is **not touched by this section** — its changes are handled by Section 3 below.

---

## 3. Hero layout adjustments (apply to BOTH desktop and mobile-fallback branches)

### 3a. Delete the "Ingolstadt, Germany" line

In both branches, the top row of the hero overlay currently renders:

```tsx
<div className="flex items-start justify-between">
  <p className="font-mono text-sm tracking-wide text-fg-muted/80 md:text-base">
    Ingolstadt, Germany
  </p>
  <div className="flex items-center gap-3 ...">{/* socials */}</div>
</div>
```

Change to:

```tsx
<div className="flex items-start justify-end">
  <div className="flex items-center gap-3 ...">{/* socials */}</div>
</div>
```

The location `<p>` is deleted entirely. The socials cluster shifts to the right and stays there.

### 3b. Move the intro text block higher

Currently the hero overlay uses `flex flex-col justify-between` so the intro text block lands in the vertical middle. Change to `flex flex-col` (no `justify-between`) and add a top-padding on the intro text block to push it higher, then use `flex-1` spacer + scroll-cue at the bottom.

The new layout structure for the desktop branch overlay container:

```tsx
<div className="absolute inset-0 z-[4] flex h-full flex-col px-6 py-6 md:px-16 md:py-8" style={{ opacity: overlayOpacity, ... }}>
  {/* Top row: socials only */}
  <div className="flex items-start justify-end">
    {/* socials block */}
  </div>

  {/* Intro text block — pushed higher */}
  <div className="pt-[6vh] md:pt-[4vh]">
    {/* intro text block (see 3c) */}
  </div>

  {/* Spacer pushes scroll cue to bottom */}
  <div className="flex-1" />

  {/* Bottom-left: scroll cue */}
  <div className="flex items-center gap-2 font-mono text-sm text-fg-subtle">
    <span>(Scroll down)</span>
    <motion.span ...><ArrowDown className="h-4 w-4" /></motion.span>
  </div>
</div>
```

Note: the desktop overlay container changes from `relative z-[4]` to `absolute inset-0 z-[4]` because we are no longer in a sticky flex column flow — we need it to fill the sticky parent. This is a small but important change.

Apply the equivalent layout in the mobile-fallback branch (which uses `relative z-20 ... min-h-screen`).

### 3c. Restructure tagline — rotating word on its own line, larger

Replace the existing inline tagline:

```tsx
<p className="text-xl text-fg-muted md:text-2xl">
  Building bridges between{' '}
  <RotatingWords words={ROTATING_WORDS} />
</p>
```

With a two-element block:

```tsx
<p className="pt-2 text-xl text-fg-muted md:text-2xl">
  Building bridges between
</p>

<div className="font-display italic text-accent text-6xl leading-[1.05] md:text-8xl">
  <RotatingWords words={ROTATING_WORDS} />
</div>
```

The `RotatingWords` component is a `<span>` with `inline-grid`; it inherits the font-size from its parent `<div>`, so wrapping it in a `text-6xl md:text-8xl` parent is sufficient — do **not** edit `RotatingWords.tsx`.

Also widen the intro text container so the longer rotating words ("Engineering & People", "Hardware & Insight") don't wrap awkwardly at the larger size:

Change `max-w-xl space-y-5 md:max-w-2xl` → `max-w-xl space-y-5 md:max-w-4xl` on the `<div>` wrapping the four intro lines.

### Acceptance criteria

- The "Ingolstadt, Germany" text never appears anywhere in the hero.
- "Hi there, this is" sits noticeably higher up the viewport than before (top ~12-15vh from socials row instead of vertically centered).
- The tagline reads as two stacked lines: small "Building bridges between", then a large display-italic rotating word below it.
- The rotating word at md breakpoint is approximately 6× the line-height of the "Building bridges between" line above it.
- The scroll cue remains pinned at bottom-left.
- All four rotating words ("Tech & Business" through "Engineering & People") fit on one line without wrapping at all viewport widths ≥768px.
- Mobile fallback gets the same layout treatment (no location, intro block higher, rotating word on its own line larger).

---

## 4. Files

### Create
- `src/components/CurtainLoader.tsx`

### Modify
- `src/App.tsx` — add CurtainLoader import + render
- `src/sections/CinematicIntro.tsx` — sections 2 and 3 above (both desktop branch and mobile fallback for section 3)

### Do not touch
- `src/components/RotatingWords.tsx`
- `src/components/ParagraphReveal.tsx`
- `src/components/FloatingLogos.tsx`
- `src/components/Reveal.tsx`
- `src/hooks/useScrollScrub.ts`
- `src/components/Nav.tsx`
- `src/components/Footer.tsx`
- Anything in `src/sections/` other than `CinematicIntro.tsx`
- Anything in `public/`

---

## 5. Verification before declaring done

1. Run `npx tsc --noEmit` — must produce zero errors.
2. Run `npm run build` — must produce zero errors and zero warnings.
3. Manually verify in dev (`npm run dev`):
   - Curtain plays on first load, doesn't play on refresh, plays again in a new tab. Clear via DevTools → Application → Session Storage → delete `curtain-played` to retest.
   - Scrolling down the hero zooms the portrait while keeping it fully visible; About paragraphs reveal in sequence over it; the right side darkens for readability.
   - No "Ingolstadt, Germany" text anywhere.
   - Tagline reads as two stacked lines with a large rotating word.
   - At 320px viewport width the mobile fallback renders the new layout cleanly without overflow.
   - The Nav's `#about` anchor link still scrolls to the About section (no broken anchor).

---

## 6. Risk notes for Antigravity

- The desktop overlay container z-index change from `relative` to `absolute inset-0` is the most likely source of regressions — double-check the scroll cue still anchors to the bottom.
- The about-readability scrim sits at `z-[3]` alongside the floating-logos layer; the gradient direction (`bg-gradient-to-l from-black/85 ... to-transparent`) is intentional so the left column stays clear for the logos. Do not swap to `bg-gradient-to-r` or the logos will disappear under a black wash.
- If `aboutScrimOpacity` lookup feels wrong, the formula is `clamp((p - 0.15) / 0.20, 0, 1)` — it should be 0 at p=0.15 and 1 at p=0.35.
