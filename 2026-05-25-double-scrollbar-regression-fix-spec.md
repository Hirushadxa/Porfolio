# Spec — Fix Double Scrollbar Regression

**Date:** 2026-05-25
**Target files:** `src/sections/CinematicIntro.tsx`, `src/index.css`
**Fixes regression introduced by:** `2026-05-25-about-right-anchor-sweep-sharpen-and-overflow-spec.md` (FIX 2 — the addition of `overflow-x-hidden` to the section root)
**Scope:** One focused change — move horizontal-overflow protection from the section element to the document root so the section stops creating its own scroll container. Do not touch the reveal animation, the About layout, the sticky background, the intro overlay, or anything else.

---

## The problem in one sentence

The previous spec added `overflow-x-hidden` to the `<section>` root to prevent horizontal page overflow. This **turned the section into a scroll container**, and because the section's content (sticky background + About content) is taller than the section's explicit `h-[200dvh]`, the section now shows its own vertical scrollbar — producing the double-scrollbar regression visible in the user's screenshot.

## Why `overflow-x-hidden` causes a second scrollbar

Per CSS spec, when an element has `overflow-x: hidden`, the implied behavior for `overflow-y` is no longer `visible` — it becomes `auto`. The element becomes a **scroll container** for both axes: horizontal is clipped, vertical scrolls. If the content inside exceeds the container's height (which it does here, because the About section's RevealWords paragraphs are long enough to push the inner scrolling content past 100dvh, total content past 200dvh), the container shows a vertical scrollbar.

That's the inner scrollbar in the screenshot. The outer scrollbar is the regular document scrollbar on `<html>` / `<body>`.

## The correct fix

Move the horizontal-overflow protection to the document root, and use `overflow-x: clip` instead of `hidden`. `clip` was introduced in the CSS Overflow Module Level 3 specifically for this case — it prevents overflow from being visible **without** creating a scroll container or a new formatting context. That means:

- Horizontal overflow is still clipped (no horizontal scrollbar at the body level).
- The element does not become scrollable in any direction.
- Sticky positioning inside child elements continues to work correctly (which `overflow: hidden` can break by establishing a new containing block for sticky).

Browser support for `overflow-x: clip`:
- Chrome / Edge: 90+ (April 2021)
- Firefox: 81+ (October 2020)
- Safari: 16+ (September 2022)

All current browsers support it. No fallback needed.

---

## Change 1 — Remove `overflow-x-hidden` from the section in `CinematicIntro.tsx`

In `src/sections/CinematicIntro.tsx`, line 208 currently reads:

```tsx
<section
  ref={sectionRef}
  id="cinematic-intro"
  className="relative h-[200dvh] overflow-x-hidden"
>
```

Change to:

```tsx
<section
  ref={sectionRef}
  id="cinematic-intro"
  className="relative h-[200dvh]"
>
```

(Just delete `overflow-x-hidden` from the className. Leave `relative h-[200dvh]` exactly as they are — those are required for the sticky positioning and the useScrollScrub progress calculation.)

## Change 2 — Add `overflow-x: clip` to `html, body` in `src/index.css`

Currently `src/index.css` (lines 33–51) has separate `html` and `body` blocks with no overflow rules. Add a single rule that applies to both. Insert the following block immediately after the existing `body { … }` block (around line 51, before the `:focus-visible` rule):

```css
html,
body {
  overflow-x: clip;
}
```

That's the entire diff to `index.css` — one new three-line rule.

**Do not** use `overflow-x: hidden` at the body level. Even though it would also prevent horizontal scrollbars, it creates the same scroll-container problem at the document level, which can break `position: sticky` in any section that uses it. `clip` is the right primitive here.

**Do not** add `overflow-y` to either `html` or `body` — leave vertical scrolling as the browser default. The page's main vertical scrollbar must remain on the document, not on any inner element.

---

## Acceptance test

1. Reload the page on a wide monitor (≥1440px).
2. **Only one vertical scrollbar is visible** — the standard document scrollbar on the right edge of the viewport. No inner scrollbar appears on the section, the About content, or any other nested element.
3. **No horizontal scrollbar appears at the bottom** of the page, at any scroll position, at any viewport width.
4. Scroll through the full page top-to-bottom. The sticky background image still pins at the top while the section's 200dvh window scrolls past — sticky behavior is intact.
5. The intro text overlay still scrolls off at the top naturally.
6. The About section's RevealWords reveal still animates correctly as the user scrolls.
7. Resize the viewport to 1024px, 768px, 480px. At every width: one vertical scrollbar (document), no horizontal scrollbar, no inner scrollbar.

---

## Files to touch

- `src/sections/CinematicIntro.tsx` — remove `overflow-x-hidden` from the section root (one className token deletion).
- `src/index.css` — add one new `html, body { overflow-x: clip; }` rule.

## Files NOT to touch

- `src/components/RevealWords.tsx` — leave alone.
- `src/components/RotatingWords.tsx`, `CurtainLoader.tsx`, `FloatingLogos.tsx`, `Reveal.tsx` — leave alone.
- `src/hooks/useScrollScrub.ts` — leave alone.
- Any layout, color, animation, or text content — leave alone. This is a pure overflow-container fix.

## Edge cases for Antigravity

- If after this change a horizontal scrollbar reappears at some viewport width, the cause is no longer the section — it's some other child element overflowing the body. The fix is **not** to put `overflow-x` back on the section. Instead, find the offending child (likely the K1 person image at extreme zoom, or a horizontally-scrolling carousel if one was added) and constrain its width directly. `overflow-x: clip` on body will still contain the visual bleed, but the underlying overflow should be diagnosed and constrained at its source.
- If `position: sticky` on any element stops working after this change, that's not from this spec — `overflow: clip` doesn't break sticky the way `overflow: hidden` does. Verify the sticky element's nearest scrolling ancestor is still the document (it should be, since neither `html` nor `body` is now a scroll container under `overflow-x: clip`).
- Do not change `h-[200dvh]` to `min-h-[200dvh]` or any other height. The 200dvh fixed height is what useScrollScrub depends on to compute the 0→1 progress range correctly. If About content exceeds the section bounds visually, that's a separate problem to address with a different spec — not part of this regression fix.
