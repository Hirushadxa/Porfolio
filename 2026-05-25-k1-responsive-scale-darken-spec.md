# Spec — Make K1 Person More Prominent on Smaller Screens + Reduce Scrim Darkening

**Date:** 2026-05-25
**Target file:** `src/sections/CinematicIntro.tsx`
**Scope:** Two related responsive fixes on the hero image stack. Touch ONLY the K1 image height class and the static left-side scrim gradient. Do not change the K0 background, the dark-fade scrim, the About-readability scrim, the parallax, the zoom animation, or any layout outside the sticky background.

---

## The problem

On smaller desktop viewports (laptop sizes, ~1024–1440px wide), the K1 person image looks too small in the frame — there's a lot of empty dark background visible on the sides. On even smaller / narrower viewports the image also appears unnecessarily darkened, because the static left-side scrim gradient is the same intensity regardless of screen size and the person fills less of the visible area, so the scrim dominates.

Two root causes:

1. **K1 height is fixed at `h-[95%]`** of the sticky container. With `w-auto` and a portrait-aspect-ratio image, this means the image's width is roughly `0.75 × viewport_height`. On a 1366×768 laptop, that's ~547px wide in a 1366px viewport — only ~40% of the viewport width. The person reads as small.

2. **Static scrim gradient `from-black/75 via-black/40 to-transparent to-65%`** is applied at full intensity on every screen size. On smaller viewports the person occupies less width, so the scrim's darkened zone covers proportionally more of the person, making the whole image read as dim.

The fix is to **progressively scale up K1's height on smaller breakpoints** so the person fills more of the frame, and to **progressively reduce the scrim intensity on smaller breakpoints** so the person isn't washed out.

---

## FIX 1 — Make K1 height responsive

### Current code (around line 240–248 of CinematicIntro.tsx)

```tsx
<motion.img
  src="/hero/K1-person.png"
  alt="Hirusha Dassanayaka at his workspace"
  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[95%] w-auto max-w-[100vw] object-contain"
  style={{
    scale: imageScale,
    willChange: 'transform',
  }}
/>
```

### Replace with

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

### Why these specific values

- `h-[115%]` for the default (below `md`, i.e., `< 768px`) — the image overflows the sticky container slightly at the top. Since the parent sticky container already has `overflow-hidden`, the top of the image (which is just empty transparent PNG anyway, above the person's head) gets clipped. The person ends up taking more vertical space relative to the viewport, so they appear visually larger.
- `md:h-[105%]` (≥ 768px) — slight overshoot, person fills more of the frame on tablet / small laptop.
- `lg:h-[100%]` (≥ 1024px) — image exactly fills container height; person is prominent.
- `xl:h-[95%]` (≥ 1280px) — back to the current behavior; person sits comfortably with a small gap at the top of the frame, which gives the composition room to breathe on larger screens.

### Why `max-w-none` is safe now

The sticky container parent has `overflow-hidden` clipping anything that overflows. The body now has `overflow-x: clip` (per the double-scrollbar fix). So even if the K1 image's auto-width exceeds the viewport on very narrow viewports, the visual overflow is clipped at both the sticky container and at the body — no horizontal scrollbar can appear from K1 itself.

`max-w-none` lets the image grow proportionally with its taller height, which is essential — capping it at `100vw` would force `object-contain` to shrink the height to maintain aspect, undoing the height boost.

### What this does NOT change

- The framer-motion `scale: imageScale` animation (1.0 → 1.5 across scroll) is untouched. The responsive height changes the *baseline* size; the scroll-driven scale still applies on top.
- The bottom anchor (`bottom-0`) and horizontal centering (`left-1/2 -translate-x-1/2`) are preserved — the person stays bottom-anchored and centered.
- The mobile fallback branch's K1 image (lines ~124–129) — leave it as-is. The mobile fallback already shows the person prominently because the layout collapses to single-column.

---

## FIX 2 — Soften the scrim gradient on smaller screens

### Current code (around line 227 of CinematicIntro.tsx)

```tsx
{/* Scrim gradient (between K0 and K1-person) */}
<div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/75 via-black/40 to-transparent to-65%" />
```

### Replace with

```tsx
{/* Scrim gradient — responsive intensity, lighter on smaller screens so K1 person isn't washed out */}
<div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/40 md:from-black/55 lg:from-black/65 xl:from-black/75 via-black/20 md:via-black/28 lg:via-black/34 xl:via-black/40 to-transparent to-65%" />
```

### What changes per breakpoint

| Breakpoint | From-color | Via-color |
| --- | --- | --- |
| `< 768px` (default) | `black/40` | `black/20` |
| `md` (≥ 768px) | `black/55` | `black/28` |
| `lg` (≥ 1024px) | `black/65` | `black/34` |
| `xl` (≥ 1280px) | `black/75` | `black/40` |

The `to-transparent to-65%` end-stop is the same at every breakpoint — only the starting darkness and mid-tone are reduced on smaller viewports.

### Why this works

The scrim still darkens the left third of the screen at every breakpoint, but it's no longer aggressive on screens where the person is more centered and visually prominent. On a 1366×768 laptop, the scrim is now `black/55` at the left edge (about 73% as dark as before), so the K1 person — which is now taller per FIX 1 — reads as more luminous and less washed-out.

On large screens (`xl`, 1280+) the scrim is unchanged from current behavior, so the cinematic look on big monitors is preserved.

### Mobile fallback

The mobile fallback (lines ~117–161) has the same scrim. Apply the same responsive class string there — but since the fallback only activates below `md`, the default values `from-black/40 via-black/20` are what will render on mobile. The `md`/`lg`/`xl` variants in the className are unreachable in fallback context but harmless.

If you want a slightly different mobile scrim (since the layout there is different), bump the default to `from-black/50 via-black/24` in the fallback branch only — this is optional and judgment-call territory.

---

## Acceptance test

### Scale fix

1. Open Chrome DevTools, set viewport to **1366×768** (small laptop).
2. The K1 person should now fill the frame more prominently — roughly the person's height equals the full viewport height, with the head reaching near the top edge and the body bottom-anchored.
3. Switch to **1920×1080** — the person sits slightly lower with a small gap at the top of the frame (same as the previous behavior at this size).
4. Switch to **2560×1440** — the same comfortable composition as 1920px.
5. Switch to **1024×600** (small tablet landscape) — the person fills almost the entire vertical space with minimal head room.
6. Switch to **768×1024** (tablet portrait, just above the mobile breakpoint) — the person is bottom-anchored, takes most of the vertical space; sides may be slightly clipped by `overflow-hidden`, which is fine.

### Darkening fix

7. At **1366×768**, the left third of the visible scene reads as a soft gradient that fades to clear by ~65% across. The K1 person, especially the left side of their body, is **not visibly washed out** by the scrim.
8. At **1920×1080+**, the scrim has the same cinematic intensity as before — no regression on large screens.
9. Scroll into the About section at every viewport size — the dark-fade scrim (the FIX 3 black layer that fades K0+K1 together) still activates correctly. That scrim is untouched; only the static left-side gradient changed.

### No regression elsewhere

10. The K0 background image still fills the viewport correctly (`object-cover`, unchanged).
11. The scroll-driven zoom animation (scale 1.0 → 1.5) still applies on top of the new baseline heights.
12. The mouse parallax on K1 still works in the 0–50% scroll range.
13. The intro text overlay still sits at the top of the page correctly.
14. No double-scrollbar regression — body's `overflow-x: clip` is unchanged.

---

## Files to touch

- `src/sections/CinematicIntro.tsx` — two specific edits:
  - K1 image's `className` on the desktop branch (around line ~242): swap `h-[95%]` for the responsive `h-[115%] md:h-[105%] lg:h-[100%] xl:h-[95%]`, swap `max-w-[100vw]` for `max-w-none`.
  - Scrim gradient `className` on the desktop branch (around line ~227): swap `from-black/75 via-black/40` for the responsive variant chain above.

## Files NOT to touch

- `src/index.css` — no changes (the `overflow-x: clip` from the previous spec must remain).
- `src/components/RevealWords.tsx`, `RotatingWords.tsx`, `CurtainLoader.tsx`, `FloatingLogos.tsx`, `Reveal.tsx` — leave alone.
- `src/hooks/useScrollScrub.ts` — leave alone.
- The K0 background image, the dark-fade scrim (`bg-black` with `scrimDarkenOpacity`), the About-readability scrim (`bg-gradient-to-l from-black/85`), the intro overlay, the About section layout — leave alone.
- The mobile fallback branch's K1 image styling — leave as-is unless you want to tune the scrim default per the optional note above.

## Edge cases for Antigravity

- If after FIX 1 the K1 image's top is visibly clipped in a distracting way (e.g., the top of the person's head looks chopped on `< md` viewports), reduce `h-[115%]` to `h-[110%]`. The goal is for the person to be prominent without looking awkwardly cropped — adjust by eye if needed.
- If after FIX 2 the About text legibility suffers on smaller viewports (because the left-side scrim is now lighter and stray monitor text from K0 bleeds through more), bump the `md:from-black/55` to `md:from-black/60`. The scrim values are tuned conservatively but can be nudged.
- Do NOT try to fix this by changing `imageScale` to a responsive value — that would interact with the scroll-driven animation in ways that are hard to reason about. The responsive baseline height is the correct lever.
- Do NOT add new breakpoints or change the existing breakpoint conventions (`sm`, `md`, `lg`, `xl`). Use the standard Tailwind set.
