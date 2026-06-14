# Spec — About Right-Anchor + Sweep Sharpening + Horizontal Overflow Fix

**Date:** 2026-05-25
**Target files:** `src/sections/CinematicIntro.tsx`, `src/components/RevealWords.tsx`, possibly `src/index.css` or `tailwind.config`
**Builds on:** `2026-05-25-about-left-align-opacity-sweep-spec.md`
**Scope:** Three connected fixes — push the About block to the far right of the viewport, eliminate horizontal page overflow, and sharpen the per-word reveal sweep so it feels like a clear moving highlight line instead of a soft global fade.

---

## Context — what's wrong right now

After the previous spec landed, three issues remain:

### Issue 1 — About text isn't at the far right column

Current `CinematicIntro.tsx` (desktop branch, around the About viewport):

```tsx
<div className="mx-auto max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
  <div className="md:col-span-5 ...">FloatingLogos</div>
  <div className="md:col-span-7 ... pr-6 md:pr-12">About text</div>
</div>
```

The grid is `mx-auto max-w-6xl` — capped at 72rem and centered on the page. On a wide monitor, the entire grid sits centered with whitespace on both sides, so the "right column" only reaches roughly 75% across the viewport, not all the way to the edge. The visual feels mid-screen, not right-anchored.

Valentin's reference layout puts the text block clearly against the right side of the viewport with a comfortable padding, not centered in a constrained container.

### Issue 2 — Horizontal scrollbar at the bottom of the page

The current sticky background uses:

```tsx
<div className="sticky top-0 h-dvh w-screen overflow-hidden z-0 pointer-events-none">
```

`w-screen` is `100vw`, which **does not exclude the vertical scrollbar's width**. On Windows browsers with a visible vertical scrollbar, `100vw` is larger than the available content width, which creates ~15px of horizontal overflow at the body level — hence the horizontal scrollbar.

The K1 person image also uses `max-w-none`, which lets it size beyond the viewport if the aspect ratio demands. Combined with the `w-screen` parent, this can push overflow further.

### Issue 3 — Reveal sweep doesn't read as a sharp moving line

Current `RevealWords` per-word `useScroll` window is `['start 0.80', 'start 0.45']` — that's 35% of viewport height worth of scroll distance for each word to transition. Adjacent words have heavily overlapping reveal windows, so at any scroll position, *many* words across multiple lines are mid-transition simultaneously. The result reads as a soft global fade rather than a clear, identifiable "sweep line" that you can watch move down the paragraph as you scroll.

The user wants a sharper effect — at any given scroll position, there should be a visible **line of transition**: words above it fully bright, words below it fully dim, and only a narrow band actively transitioning in between.

---

## FIX 1 — Push the About block to the far right of the viewport

### Desired behavior

The About text block (eyebrow + headline + RevealWords paragraphs + language line) sits on the **right side of the viewport** with a comfortable ~3-5rem of breathing room from the right edge. The FloatingLogos column occupies the left portion of the viewport.

The two columns no longer live inside a 72rem centered container — they span the full viewport width with sensible side padding.

### Implementation

Replace the current grid container in the desktop branch's About viewport:

```tsx
{/* BEFORE */}
<div className="mx-auto max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
  <div className="md:col-span-5 ...">FloatingLogos</div>
  <div className="md:col-span-7 ... pr-6 md:pr-12">About text</div>
</div>

{/* AFTER */}
<div className="w-full px-6 md:px-12 lg:px-16 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
  <div className="md:col-span-5">FloatingLogos</div>
  <div className="md:col-span-6 md:col-start-7 text-left">About text</div>
</div>
```

Key changes:
- **Remove `mx-auto max-w-6xl`** — let the grid span the full viewport width.
- **Add side padding** at the wrapper level (`px-6 md:px-12 lg:px-16`) so content doesn't kiss the edge.
- **Put the About column in `md:col-span-6 md:col-start-7`** — six columns starting at column 7 (out of 12), pushing it firmly into the right half with the leftmost column reserved for a small gutter / breathing room.
- **Drop the inline `pr-6 md:pr-12`** on the About column since side padding is now handled by the wrapper.

### Acceptance test

1. Open the page on a wide monitor (≥1440px).
2. Scroll to the About section.
3. The text block clearly sits on the **right half of the viewport** — its left edge starts past the visual center of the screen, not near it.
4. There's ~3-5rem of whitespace between the text block's right edge and the viewport's right edge — text doesn't touch the edge but is clearly right-anchored.
5. The FloatingLogos column occupies the left half, with a comfortable gap between the two columns.

---

## FIX 2 — Eliminate horizontal page overflow

### Desired behavior

No horizontal scrollbar appears at the bottom of the page on any viewport size or any scroll position. The page is locked to vertical scroll only.

### Implementation

Three coordinated changes:

**1. Replace `w-screen` with `w-full` on the sticky background.**

In `CinematicIntro.tsx`, change:

```tsx
{/* BEFORE */}
<div className="sticky top-0 h-dvh w-screen overflow-hidden z-0 pointer-events-none">

{/* AFTER */}
<div className="sticky top-0 h-dvh w-full overflow-hidden z-0 pointer-events-none">
```

`w-full` respects the parent's width (which is the section, which is the body's content area — excluding scrollbar), so no overflow.

**2. Add `overflow-x-hidden` defensively at the section root.**

```tsx
<section
  ref={sectionRef}
  id="cinematic-intro"
  className="relative h-[200dvh] overflow-x-hidden"
>
```

This contains any accidental horizontal bleed from child elements (image overflow, motion transforms exceeding viewport, etc.).

**3. Constrain the K1 image's maximum width.**

The K1 person image currently uses `max-w-none` which allows arbitrary horizontal sizing:

```tsx
{/* BEFORE */}
<motion.img
  src="/hero/K1-person.png"
  ...
  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[95%] w-auto max-w-none object-contain"
  style={{ scale: imageScale, willChange: 'transform' }}
/>

{/* AFTER */}
<motion.img
  src="/hero/K1-person.png"
  ...
  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[95%] w-auto max-w-[100vw] object-contain"
  style={{ scale: imageScale, willChange: 'transform' }}
/>
```

`max-w-[100vw]` ensures the image, even when zoomed, never exceeds the viewport width. The combination of `overflow-x-hidden` on the parent and the constrained image width prevents the transform-scale from bleeding horizontally.

Also apply the same fix to the fallback (mobile) branch's K1 image if it has the same `max-w-none`.

**4. (Optional defensive) Add `overflow-x: clip` on `body` in `src/index.css`.**

If after the above changes any horizontal overflow remains, add:

```css
html, body {
  overflow-x: clip;
}
```

`overflow-x: clip` is preferred over `overflow-x: hidden` here because it doesn't create a new scrolling context that breaks `position: sticky`. Only add this if necessary.

### Acceptance test

1. Load the page on Windows Chrome / Edge with default scrollbars visible.
2. Open DevTools. Resize viewport to several widths (1920, 1440, 1024, 768).
3. At every width, the page has **no horizontal scrollbar at the bottom**.
4. Scroll through the full page — at no scroll position does a horizontal scrollbar appear.
5. The K1 person image never exceeds the viewport's width even at maximum zoom.

---

## FIX 3 — Sharpen the reveal sweep

### Desired behavior

The reveal effect should read as a **moving line of brightness** sweeping down the paragraph as the user scrolls. At any given scroll position:

- Words **above** the sweep line are fully bright (opacity 1.0).
- Words **on** the sweep line are mid-transition (a narrow band, maybe 1-2 lines of words).
- Words **below** the sweep line are fully dim (opacity 0.18 — slightly dimmer than the current 0.30 so the bright revealed text really pops).

The transition for any individual word should happen over a **narrow scroll distance**, not a wide one. This creates the visual sense that there's a clear "reading position" you can watch move down the paragraph.

### Implementation

In `src/components/RevealWords.tsx`, two changes:

**1. Narrow the reveal window.**

Current:

```tsx
const { scrollYProgress } = useScroll({
  target: ref,
  offset: ['start 0.80', 'start 0.45'],  // 35% of viewport — too wide
});
```

New:

```tsx
const { scrollYProgress } = useScroll({
  target: ref,
  offset: ['start 0.72', 'start 0.55'],  // 17% of viewport — tighter, sharper sweep line
});
```

The transition still has soft edges (smooth opacity interpolation), but the active band of transitioning words is now narrower — at any scroll position you can see a clear band of brightness moving down the text.

**2. Drop the base opacity from 0.30 to 0.18.**

Update the default:

```tsx
export default function RevealWords({
  text,
  className = '',
  baseOpacity = 0.18,    // was 0.30 — dimmer so the contrast pops
  fullOpacity = 1.0,
}: RevealWordsProps) {
```

This makes the revealed text feel decisively brighter against unrevealed text, which is what gives the "sweeping highlight" feel.

**3. (Keep) per-word, not per-character.**

Do NOT switch to per-character. Per-word is correct here — character-level animations create too many DOM nodes and the visual difference at this paragraph length isn't worth the cost. The sharpening from changes 1 and 2 above is what produces the desired effect.

### Acceptance test

1. Scroll into the About section slowly.
2. At any moment, you can clearly identify a **narrow horizontal band** (1-2 lines tall) where words are in transition — words above are clearly bright, words below clearly dim.
3. As you scroll, that band visibly moves down the paragraph — it reads as a *sweeping motion*, not a global fade.
4. The dim baseline state (0.18 opacity) is readable but visually recedes — the bright revealed words are obviously the focus.
5. Scrolling back up causes the band to move back up; words above the band re-dim as the line moves past them.

---

## Files to touch

- `src/sections/CinematicIntro.tsx` —
  - Replace About grid container with full-width version (FIX 1).
  - Change `w-screen` → `w-full` on sticky background, add `overflow-x-hidden` to section root, constrain K1 image max-width (FIX 2).
- `src/components/RevealWords.tsx` — narrow reveal window to `['start 0.72', 'start 0.55']`, drop `baseOpacity` default to `0.18` (FIX 3).

## Files NOT to touch

- `src/components/RotatingWords.tsx`, `CurtainLoader.tsx`, `FloatingLogos.tsx`, `Reveal.tsx` — leave alone.
- The intro text overlay, hero image stack, scrim layers — already correct.
- `src/hooks/useScrollScrub.ts` — leave alone.

## Edge cases for Antigravity

- After FIX 1, on viewports between ~768px and ~1024px, the right column starting at `md:col-start-7` with `md:col-span-6` might feel slightly cramped (only 6 cols of 12). If so, the responsive breakpoint can stage: `md:col-start-6 md:col-span-7 lg:col-start-7 lg:col-span-6` so the text gets a touch more room at narrower desktop widths.
- After FIX 2, if `overflow-x-hidden` on the section breaks any sticky behavior, move the `overflow-x` rule to `html, body` via `index.css` instead (as `overflow-x: clip`, not `hidden`, to avoid breaking the sticky positioning context).
- After FIX 3, if the band feels too narrow on very long paragraphs (more than ~80 words), keep the window where it is but consider whether the first paragraph should pre-resolve faster (e.g., have a slightly wider window) so the user isn't waiting too long for the first words to brighten. Don't tune this unless visually it feels off — the 17% window is calibrated for typical paragraph lengths.
- The `aboutScrimOpacity` right-side gradient scrim is currently `bg-gradient-to-l from-black/85 via-black/55 to-transparent` — after pushing the text further right, verify the gradient still provides sufficient contrast behind the text. If text legibility drops, bump the `from-black/85` to `from-black/95` so the right-side text has a denser backing.
