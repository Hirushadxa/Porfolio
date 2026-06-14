# Spec — About Section: Left-Align + Opacity Sweep Reveal

**Date:** 2026-05-25
**Target files:** `src/sections/CinematicIntro.tsx`, `src/components/BlurWords.tsx` (rename → `RevealWords.tsx`)
**Builds on:** `2026-05-25-intro-scroll-about-blur-bleed-fix-spec.md` (FIX 2)
**Scope:** Two related changes to the About section. Do not touch the intro text, hero image stack, scrim, curtain, or any other section.

---

## Context — what's wrong right now

After the previous FIX 2 spec landed:

1. The About text is **right-aligned** (`text-align: right`, content shifted to the right column). The user wants it more like Valentin Cervera's reference layout: the text block still sits in the right portion of the page, but **the text within is left-aligned** (so each line starts at the same x-position and wraps naturally rightward). The current right-alignment looks awkward because the line-start positions are ragged.
2. The current reveal effect uses **blur + opacity per word**, which adds visual noise and doesn't quite match the cleaner sweep effect on Valentin's page. Per the Gemini-described approach the user wants applied: the text should start fully visible but **dim** (around 30% white), then sharpen to full white as the scroll position sweeps across each line left-to-right. No blur — opacity only. The transition between dim and bright should feel like a **soft-edged highlight sweeping** across the line, not a hard step per word.

---

## CHANGE 1 — Left-align the About text block

### Desired behavior

The About section keeps its current column position (right side of the page, comfortable max-width). What changes is that **text-align flips from right to left** so every line starts at the same x-position and reads naturally.

Specifically:
- The "(About)" eyebrow label: left-aligned (was right-aligned)
- The headline "Tech-fluent. Business-minded. Detail-obsessed.": left-aligned
- All paragraph body text: left-aligned

The block itself stays roughly where it sits today — right column of the page, anchored by something like `ml-auto max-w-2xl` (which positions the block on the right side of the page) — but with `text-left` inside so the content reads cleanly left-to-right.

### Implementation

In `CinematicIntro.tsx`, the About container should look like:

```tsx
<div className="ml-auto max-w-2xl text-left pr-6 md:pr-12">
  <p className="text-orange-400 mb-4">(About)</p>
  <h2 className="text-4xl md:text-5xl font-serif text-white mb-8">
    Tech-fluent. Business-minded. Detail-obsessed.
  </h2>
  <RevealWords text="I'm a 5th-semester Digital Technology & Management student at OTH Amberg-Weiden, where I'm learning to operate at the intersection of engineering and strategy." />
  <RevealWords text="My academic focus spans IoT and sensor technology, applied AI and computer vision in smart factories, BI and data modelling, and the business processes that translate technology into outcomes." />
  <RevealWords text="Before Germany, I worked at Singer Sri Lanka PLC as a Junior Executive in IT, where I learned that the difference between a good system and a useful one is whoever's sitting in front of it." />
  <RevealWords text="That stuck with me — I now build with users in mind, whether it's a Power BI dashboard, a smart-camera quality station, or a freelance website." />
</div>
```

Critical:
- `ml-auto` keeps the block in the right column (don't move it to the left side of the page — the FloatingLogos live on the left and shouldn't overlap with text).
- `text-left` is applied at the container level — every child inherits it. Remove any leftover `text-right` from the previous spec.
- The headline ("Tech-fluent. Business-minded. Detail-obsessed.") stays a static element — only the paragraph body uses `RevealWords`. The headline does not need the sweep effect.
- Reasonable right-side padding (`pr-6 md:pr-12`) so the text doesn't touch the viewport edge on wide screens.

### Reduced-motion / mobile fallback

Same change applied in the `useFallback` branch — `text-left` instead of `text-right`. The fallback continues to render text statically (no scroll effect).

---

## CHANGE 2 — Replace blur with opacity sweep

### Desired behavior (matches Gemini's specification)

- **Base state:** every word in the paragraph is rendered, but at low opacity (around `0.30` — dim white, still visible, not invisible).
- **Active state:** as the scroll position sweeps over each word's line, that word brightens to full opacity (`1.0`) — solid white.
- **Sweep direction:** left-to-right across each line, line-by-line down the paragraph.
- **Sweep feel:** soft-edged. Adjacent words overlap in their transitions so the brightness moves smoothly across the line, not as a hard per-word step.
- **Bidirectional:** scrolling back up returns words to the dim base state. Not a one-shot animation.

### Implementation — rename and rewrite the component

The previous spec created `src/components/BlurWords.tsx`. Since the new behavior has no blur, **rename the file to `src/components/RevealWords.tsx`** and rewrite the per-word logic:

```tsx
// src/components/RevealWords.tsx
import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

interface RevealWordsProps {
  text: string;
  className?: string;
  baseOpacity?: number;    // default 0.30 — dim state
  fullOpacity?: number;    // default 1.0  — bright state
}

interface WordProps {
  word: string;
  baseOpacity: number;
  fullOpacity: number;
}

function Word({ word, baseOpacity, fullOpacity }: WordProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    // The reveal window is generous so adjacent words overlap in their
    // transition zones — this produces the soft "sweep" look instead of
    // a hard per-word step.
    offset: ['start 0.80', 'start 0.45'],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [baseOpacity, fullOpacity]);

  return (
    <motion.span ref={ref} style={{ opacity }} className="inline-block">
      {word}
      {/* re-add the space after the word so words don't collide */}
      <span>&nbsp;</span>
    </motion.span>
  );
}

export default function RevealWords({
  text,
  className = '',
  baseOpacity = 0.30,
  fullOpacity = 1.0,
}: RevealWordsProps) {
  const prefersReduced = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);

  // Reduced motion: render static fully-opaque text, no scroll binding.
  if (prefersReduced) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p className={className}>
      {words.map((word, i) => (
        <Word
          key={`${word}-${i}`}
          word={word}
          baseOpacity={baseOpacity}
          fullOpacity={fullOpacity}
        />
      ))}
    </p>
  );
}
```

Key differences from the previous `BlurWords` implementation:
- **No `filter: blur(...)` anywhere.** Opacity is the only animated property.
- **No `useMotionTemplate` for filter strings** — `useTransform` directly drives a numeric opacity value, which is cheaper.
- **Wider reveal window** (`['start 0.80', 'start 0.45']` instead of the tighter window from the blur version) so adjacent words overlap in their transition zones — this is what creates the visual sweep instead of a per-word step.
- **`inline-block` on each word span** preserves wrapping behavior and lets opacity animate per element without breaking layout.

### Replace all `BlurWords` usages

In `CinematicIntro.tsx`, replace every `<BlurWords … />` with `<RevealWords … />`. The prop shape is similar (`text`, `className`) — if the previous spec used `startBlur`, `startOpacity`, `revealWindow` props, drop those and use the new `baseOpacity` / `fullOpacity` knobs (or just rely on the defaults of 0.30 / 1.0).

### Delete the old `BlurWords.tsx` file

After replacing all usages, delete `src/components/BlurWords.tsx` so it doesn't sit unused.

### Default text styling

`RevealWords` renders a `<p>` element. Apply text styling via the `className` prop:

```tsx
<RevealWords
  text="..."
  className="text-white text-lg md:text-xl leading-relaxed mb-6"
/>
```

Notes on color:
- The component animates opacity on each word, not the text color. So the base color is `text-white` and the dim state is achieved by `opacity: 0.30` on the word span — not by using a grey color.
- This matches the Gemini spec ("30% opacity white") and keeps the bright state a clean solid white.

---

## Acceptance test

### Visual on load

1. Scroll past the hero and arrive at the About section.
2. **The eyebrow "(About)", headline, and paragraphs all sit in the right column of the page, but the text inside each is left-aligned** — every line starts at the same x-position, wraps naturally to the right.
3. The first paragraph's words at the **top** of the section are nearly full white (because scroll has already passed them). The words further down the paragraph are progressively dimmer, reaching base 30% opacity at the bottom of the section.

### Scroll behavior

4. Scroll slowly into the section. As each word's vertical position crosses the trigger line (~mid-viewport), that word brightens from 30% to 100% opacity over a short scroll distance.
5. Because the reveal windows overlap, multiple adjacent words are in mid-transition at any given moment — this creates the **soft sweep** look across each line, not a hard per-word step.
6. Scroll back up — the words return to their dim base state. The effect is fully bidirectional.

### No blur anywhere

7. At every scroll position, text is **sharp**. No blur filter is applied at any point. Words simply transition between dim white and bright white.

### Reduced-motion + mobile fallback

8. With `prefers-reduced-motion: reduce` enabled (or on a `(max-width: 767px)` viewport per the `useFallback` flag): all words are static, fully opaque, no scroll binding. Left-alignment still applies.

---

## Files to touch

- `src/sections/CinematicIntro.tsx` — flip `text-right` → `text-left` on the About container; replace `<BlurWords>` with `<RevealWords>`.
- `src/components/RevealWords.tsx` — **NEW** file (essentially a rename + rewrite of `BlurWords.tsx`).
- `src/components/BlurWords.tsx` — **DELETE** after all references are migrated to `RevealWords`.

## Files NOT to touch

- `src/components/RotatingWords.tsx` — leave alone
- `src/components/CurtainLoader.tsx` — leave alone
- `src/components/FloatingLogos.tsx` (or wherever the floating logos render) — leave alone, they should continue to live in the left half of the page where they don't collide with the right-column text
- `src/hooks/useScrollScrub.ts` — leave alone
- Any intro-text / hero / scrim code — already correct from the prior spec

## Edge cases for Antigravity

- If, after the alignment change, the headline ("Tech-fluent. Business-minded. Detail-obsessed.") wraps awkwardly because `max-w-2xl` is now constraining left-aligned text where it previously constrained right-aligned text, bump the container to `max-w-3xl` rather than letting the headline wrap into more than 2 lines.
- If on small viewports the right-side padding `pr-6 md:pr-12` makes the block feel cramped, switch to a symmetric `px-6 md:px-12` on the parent and drop `ml-auto` on mobile so the text takes the full viewport width — but only below `md`. On `md+` keep the right-column placement.
- If the `RevealWords` overlapping-window approach feels too aggressive on shorter paragraphs (fewer than ~12 words), the reveal window should still feel like a sweep — tune `offset` to `['start 0.85', 'start 0.50']` for short paragraphs if needed. Don't change long-paragraph behavior.
- If GSAP+ScrollTrigger was previously considered (per the Gemini suggestion), **do not introduce GSAP** — the project uses framer-motion and the `useScroll` per-element pattern produces an equivalent result without a new dependency.
