# Antigravity Prompt — Replay the constellation wave on clicking the center dot

## How it works now (context for you / Antigravity)
In `src/components/FloatingLogos.tsx`, the "wave" is the constellation wake-up
intro. State `isIntroPlaying` drives it:
- An `IntersectionObserver` sets `isInView`, which (guarded by
  `hasTriggeredIntro`) sets `isIntroPlaying = true` once.
- A `useEffect` watching `isIntroPlaying` resets it to `false` after 2600ms.
- While true: the `.constellation-pulse` ring is rendered (golden ring that
  expands from center, keyframes in `src/index.css`) AND the parent gets the
  `intro-active` class, which runs the staggered `wake-up-btn` / `wake-up-img`
  animations on every logo.

The "yellow breathing dot" is the central core around line 240 — the
`rounded-full bg-accent` dot (with the `animate-pulse` / `animate-ping` glow).
It currently lives inside a wrapper with `pointer-events-none`, so it can't be
clicked.

## What I want
Make that center dot clickable so clicking it replays the exact same wave
(constellation pulse + logo wake-up), as many times as the user wants.

## PROMPT (paste into Antigravity)

In `src/components/FloatingLogos.tsx`, let the user replay the constellation
wake-up animation by clicking the central "breathing" accent dot. Do not change
the existing auto-play-on-scroll behavior.

1. Add a `replayIntro` callback inside the `FloatingLogos` component:
   - If `isIntroPlaying` is already `true`, return early (ignore the click so a
     mid-animation click can't restart and cause jank).
   - Otherwise set `isIntroPlaying` to `true`. The existing
     `useEffect` that watches `isIntroPlaying` already resets it to `false`
     after 2600ms, so reuse that — don't add a second timer.
   - To guarantee the CSS keyframes restart cleanly on every replay, add a
     numeric `replayKey` state and increment it inside `replayIntro`. Apply that
     value as the React `key` on the `.constellation-pulse` element (so it
     remounts each time) — e.g. `<div key={replayKey} className="constellation-pulse" />`.
     The `intro-active` logo animations already restart because the class is
     removed and re-added on re-render.

2. Make the central dot clickable. The central core block currently sits inside
   `<div className="absolute inset-0 flex items-center justify-center pointer-events-none">`.
   Keep that wrapper as is, but render the accent dot as a real clickable
   `<button>` (replacing the plain `<div>` for the
   `bg-accent ... shadow-[0_0_15px_rgba(245,184,78,0.7)]` dot):
   - Add `pointer-events-auto`, `cursor-pointer`, and keep its existing size and
     glow classes.
   - `type="button"`, `onClick={replayIntro}`,
     `aria-label="Replay animation"`, and `title="Replay"`.
   - Keep the surrounding breathing glow layers (`animate-pulse`, `animate-ping`)
     exactly as they are — they stay decorative and non-interactive.
   - Make sure its `z-index` keeps it above the glow layers so the click lands
     (it already uses `zIndex: 5`).
   - Add a subtle affordance on hover, e.g. `transition-transform
     hover:scale-110`, so users sense it's interactive. Use only existing tokens
     / Tailwind utilities; don't introduce new colors.

3. Don't touch the `compact` (mobile) branch — the breathing dot only exists in
   the desktop scattered layout, so the replay button only needs to exist there.

4. Respect `prefers-reduced-motion`: the CSS already disables the intro
   animations under reduced motion, so no extra work needed, but don't add any
   new motion that ignores it.

Keep everything else — orbit animations, proximity glow, scroll opacity —
unchanged.
