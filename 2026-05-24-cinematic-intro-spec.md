# Cinematic Intro — Build Spec for Antigravity

This spec adds a scroll-driven cinematic intro to the portfolio. The video already exists; this spec covers the React/TS/Tailwind/Framer-Motion plumbing that turns it into a Valentin-Cheval-style opening that resolves into the existing `<Work />` section.

> **Goal.** When the page loads, the viewer sees Hirusha at his desk facing camera. As they scroll, the camera move plays through to a close-up of the right monitor — which is now showing the portfolio's Projects page. The cinematic then fades into the live `<Work />` section seamlessly.

---

## 1. Overview

We're adding **one new top-level section component** (`<CinematicIntro />`) that swaps in for `<Hero />` on capable clients. The existing `<Hero />` is preserved as a fallback path. The rest of the page (`<About />` → `<Contact />`) is untouched.

The cinematic intro is a **sticky scroll-scrub region**: a 250vh-tall outer container pins a viewport-sized inner stage while scroll progress drives `video.currentTime`. Three layers stack inside the stage:

1. **Video layer** — `<video>` element scrubbed by scroll
2. **Composite layer** — `intro-end-composite.jpg` cross-faded in at scroll 90%+
3. **Overlay text layer** — Valentin-style left-aligned name + tagline + rotating words + corner captions, faded out as scroll progresses

On mobile, reduced-motion, or unsupported clients, the same stage shows `intro-poster.jpg` as a static background with the overlay text on top — no scrubbing, no parallax, page scrolls normally.

---

## 2. Asset inventory

All assets are already placed in `Antigravity working folder/public/hero/`:

| File | Size | Role |
|------|------|------|
| `intro-desktop.mp4` | 2.9 MB | Scrubbed video. 1126×720, 10s, 24fps, every-frame keyframes, no audio. Path: `/hero/intro-desktop.mp4` |
| `intro-start.jpg` | 52 KB | **First frame** of `intro-desktop.mp4`. Used as the `<video poster>` attribute so the page paints the start frame (Hirusha facing camera) immediately, with no flash when JS later seeks to `currentTime = 0`. Path: `/hero/intro-start.jpg` |
| `intro-poster.jpg` | 45 KB | **End frame** of `intro-desktop.mp4`. Used as the background image for the mobile / `prefers-reduced-motion` fallback layout (see Section 8). Do NOT use as `<video poster>` — that role belongs to `intro-start.jpg`. Path: `/hero/intro-poster.jpg` |
| `intro-end-composite.jpg` | 59 KB | End-frame with portfolio Projects mockup painted onto the right monitor. Cross-faded over the video at scroll 90%+. Path: `/hero/intro-end-composite.jpg` |

The original raw upload (`intro.mp4.mp4`) has been deleted. The four files above are the only ones the build should reference.

---

## 3. Component architecture

### 3.1 New file: `src/sections/CinematicIntro.tsx`

A new section component that owns:
- The sticky scroll-scrub container
- The video element
- The composite cross-fade
- The mouse-parallax wrapper
- The overlay text

### 3.2 New file: `src/components/CinematicOverlay.tsx`

Sub-component for the overlay text layer. Owns the top-left location caption, top-right socials row, center-left name + tagline + rotating words, and bottom-left scroll cue. Keeps `<CinematicIntro />` from getting too big.

### 3.3 New file: `src/hooks/useScrollScrub.ts`

Custom hook that reads scroll progress within a target element's bounding rect and returns a `0..1` value. Used to drive both `video.currentTime` and overlay opacity. See section 4 for the implementation pattern.

### 3.4 Modified: `src/App.tsx`

Swap `<Hero />` for `<CinematicIntro />`. Keep `<Hero />` import only if the fallback uses it (see section 8 — currently it does not, so the `<Hero />` import can be removed and the file kept as dead code for now in case we want it back).

```tsx
// Before
<Hero />
<About />

// After
<CinematicIntro />
<About />
```

### 3.5 Modified: `src/components/Nav.tsx`

The `<Nav />` currently appears on top from page load. While the cinematic intro is in view, the Nav's monogram + links should be **hidden** (`opacity-0`) so they don't compete with the overlay text. Once the user has scrolled past the cinematic section, Nav fades in.

Approach: add an `isCinematic` prop or use a context. Simpler: a `data-cinematic-active` attribute on `<body>` that the Nav reads via a class watcher, or a Zustand-like minimal store. **Easiest path: use the same `useScrollScrub` hook in `<Nav />` to check whether window.scrollY is past the cinematic region (250vh), and toggle opacity accordingly.** No new state library needed.

---

## 4. Scroll-scrub mechanics

### 4.1 Pin region

The `<CinematicIntro />` outer container is `height: 250vh` (configurable constant). Its child is `sticky top-0 h-screen` — pinned to the viewport while the outer container scrolls past.

```tsx
<section ref={sectionRef} className="relative h-[250vh]">
  <div className="sticky top-0 h-screen w-screen overflow-hidden">
    {/* video, composite, overlay */}
  </div>
</section>
```

Pick `250vh` (not the often-cited `100vh`) so the user spends 2–3 seconds inside the move at a normal scroll speed. Too short and the scrub feels twitchy; too long and the viewer disengages.

### 4.2 Scroll progress hook

```ts
// useScrollScrub.ts — sketch, not literal final code

function useScrollScrub(ref: RefObject<HTMLElement>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const scrolled = -rect.top;
        const p = Math.max(0, Math.min(1, scrolled / total));
        setProgress(p);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
  }, [ref]);

  return progress;
}
```

### 4.3 Drive video.currentTime

```tsx
useEffect(() => {
  const video = videoRef.current;
  if (!video || !video.duration) return;
  video.currentTime = progress * video.duration;
}, [progress]);
```

**Critical:** the video must be `muted`, `playsInline`, `preload="auto"`, and **not** have `autoplay`. We never call `.play()` — we only update `.currentTime`. This works in all modern browsers because we're not initiating playback, just seeking.

```tsx
<video
  ref={videoRef}
  src="/hero/intro-desktop.mp4"
  poster="/hero/intro-start.jpg"   // ← start frame, NOT end frame
  muted
  playsInline
  preload="auto"
  className="absolute inset-0 h-full w-full object-cover"
/>
```

**For Phase B specifically:** the existing `src/sections/CinematicIntro.tsx` from Phase A currently sets `poster="/hero/intro-poster.jpg"`. Update that one line to `poster="/hero/intro-start.jpg"` as part of Phase B work.

### 4.4 Why every-frame keyframes matter

The video was encoded with `-g 1 -keyint_min 1`, meaning every frame is a keyframe. Without this, seeking to an arbitrary frame requires decoding forward from the nearest keyframe, which stutters badly in Safari. Don't re-encode this asset without preserving that flag.

---

## 5. Mouse parallax (pre-scroll only)

Before any scroll happens (`progress === 0`), the video element gets a subtle parallax translate based on cursor position.

### 5.1 Hook pattern

```tsx
const mouseX = useMotionValue(0);
const mouseY = useMotionValue(0);
const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

useEffect(() => {
  if (progress > 0.01) return; // dead once scroll starts
  const onMove = (e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * -12; // -6 to +6 px, opposite cursor
    const y = (e.clientY / window.innerHeight - 0.5) * -8;
    mouseX.set(x);
    mouseY.set(y);
  };
  window.addEventListener('mousemove', onMove);
  return () => window.removeEventListener('mousemove', onMove);
}, [progress]);
```

Apply to the video wrapper:

```tsx
<motion.div style={{ x: springX, y: springY }} className="absolute inset-0">
  <video ... />
</motion.div>
```

### 5.2 Why opposite-cursor

When the user moves their mouse right, the image shifts slightly left. Mimics how your perspective shifts as you lean — makes the scene feel like it has depth. Same-direction movement feels seasick.

### 5.3 Kill condition

Once `progress > 0.01`, the listener is removed and the spring settles to 0. Mouse parallax doesn't interfere with the scroll-scrub camera move.

---

## 6. Overlay text layer

Modeled on Valentin Cheval's hero: left-aligned, generous whitespace, the photo dominates the right portion of the frame.

### 6.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│ Ingolstadt, Germany                LinkedIn · GitHub · ✉│  ← top corners, font-mono text-xs
├─────────────────────────────────────────────────────────┤
│                                                          │
│   Hello.                                                 │  ← small intro, font-mono text-sm fg-muted
│                                                          │
│   Hirusha Dassanayaka.                                   │  ← text-5xl md:text-6xl, font-display
│                                                          │
│   Building bridges between                               │  ← text-lg md:text-xl, font-sans fg-muted
│   [ Tech & Business ] ↻                                  │  ← RotatingWords component
│                                                          │
│                                                          │
│   (Scroll down) ↓                                        │  ← font-mono text-xs fg-subtle
└─────────────────────────────────────────────────────────┘
```

### 6.2 Scrim gradient

A `linear-gradient(to right, rgba(0,0,0,0.55), transparent 55%)` sits above the video and below the text. Ensures the text reads against busy video content.

```tsx
<div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent to-55%" />
```

### 6.3 Fade-out curve

Overlay opacity = `1 - (progress / 0.4)` clamped to `[0, 1]`. By the time scroll reaches 40%, overlay is fully gone. Camera move continues in the open.

### 6.4 Rotating words component

Reuse the existing `<RotatingWords />` from `src/components/RotatingWords.tsx`. Pass the same `ROTATING_WORDS` array currently in `<Hero />`:

```ts
const ROTATING_WORDS = [
  'Tech & Business',
  'Code & Strategy',
  'Data & Decisions',
  'Hardware & Insight',
  'Engineering & People',
];
```

Stop the rotation when `progress > 0.2` (rotating words look weird when the overlay is fading). Pass a `paused` prop or wrap in a conditional render.

### 6.5 Top-right socials

Compact row matching `<Nav />` style:

```tsx
<div className="absolute top-6 right-6 flex items-center gap-3 font-mono text-xs text-fg-muted">
  <a href="https://linkedin.com/in/hirusha-dassanayaka" target="_blank" rel="noopener noreferrer">LinkedIn</a>
  <span aria-hidden="true">·</span>
  <a href="https://github.com/hirusha-dassanayaka" target="_blank" rel="noopener noreferrer">GitHub</a>
  <span aria-hidden="true">·</span>
  <a href="mailto:hirushadassanayaka1@gmail.com">Email</a>
</div>
```

Use the exact social URLs from `src/data/socials.ts` (or wherever they currently live in the Contact section).

### 6.6 Bottom-left scroll cue

```tsx
<div className="absolute bottom-6 left-6 flex items-center gap-2 font-mono text-xs text-fg-subtle">
  (Scroll down)
  <motion.span animate={prefersReduced ? {} : { y: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
    ↓
  </motion.span>
</div>
```

Match the existing Hero's bouncing arrow pattern for consistency.

---

## 7. End-frame handoff

### 7.1 Composite cross-fade

At `progress >= 0.9`, the `intro-end-composite.jpg` cross-fades over the video. By `progress === 1.0`, only the composite is visible. This is what carries the "Projects on right monitor" payoff.

```tsx
<img
  src="/hero/intro-end-composite.jpg"
  alt=""
  className="absolute inset-0 h-full w-full object-cover"
  style={{ opacity: Math.max(0, (progress - 0.9) / 0.1) }}
/>
```

### 7.2 Section handoff

The cinematic section ends at scroll = 250vh, after which `<About />` begins (current section order is preserved — see Decisions § 12). To make the transition feel like a continuation rather than a cut:

- Add a short fade-to-bg overlay at the bottom of the cinematic stage during the final 10% of scroll:

```tsx
<div
  className="absolute inset-0 bg-bg pointer-events-none"
  style={{ opacity: Math.max(0, (progress - 0.92) / 0.08) }}
/>
```

This makes the transition resolve in the page's own background color rather than ending on the photo abruptly.

---

## 8. Mobile fallback

### 8.1 Detection

Use a viewport-width check (`< 768px`) **and** a touch-capable check (`'ontouchstart' in window`). Both conditions trigger fallback. Better than user-agent sniffing.

```ts
const isMobile = typeof window !== 'undefined'
  && window.innerWidth < 768
  && 'ontouchstart' in window;
```

Compute on mount, recompute on resize (debounced).

### 8.2 Fallback layout

The cinematic section becomes a single fixed-height (`100vh`) hero with `intro-poster.jpg` as background, the overlay text on top, and a scrim. No sticky pinning, no scroll-scrub, no mouse parallax.

```tsx
{isMobile ? (
  <section className="relative h-screen w-screen overflow-hidden">
    <img src="/hero/intro-poster.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />
    <CinematicOverlay progress={0} mobile />
  </section>
) : (
  /* desktop sticky scroll-scrub version */
)}
```

The `<CinematicOverlay />` accepts a `mobile` prop that bumps the scale up slightly (since on mobile there's no scroll-scrub eating screen-time) and disables the fade-out behaviour.

### 8.3 Why not just use `<Hero />`?

Two reasons:
1. **Visual consistency.** A user landing on mobile shouldn't see a wildly different visual identity from a user landing on desktop.
2. **The poster image already conveys the photo + workspace context.** Reverting to text-only Hero loses that.

---

## 9. Reduced-motion fallback

For users with `prefers-reduced-motion: reduce`:

- Same layout as mobile fallback (static `intro-poster.jpg` + overlay).
- `<RotatingWords />` already respects `useReducedMotion()` and uses a 0.2s opacity-only crossfade — keep as-is.
- Bouncing scroll-cue arrow is suppressed.
- No mouse parallax.

Detection: `const prefersReduced = useReducedMotion()` from `framer-motion`.

```tsx
const useFallback = isMobile || prefersReduced;
```

One boolean drives both fallback paths to keep things simple.

---

## 10. Build phases

Antigravity should build this incrementally. Each phase produces a working, demoable state.

### Phase A — Component scaffold

- Create `src/sections/CinematicIntro.tsx` with sticky outer container and pinned inner stage
- Drop in the `<video>` element with poster, muted, playsInline, preload="auto"
- Wire up in `src/App.tsx` replacing `<Hero />`
- Verify: page loads, video first-frame visible, page scrolls without crashing

**Acceptance:** sticky region holds for 250vh of scroll, video first-frame visible throughout. No animation yet.

### Phase B — Scroll-scrub mechanics

- Create `src/hooks/useScrollScrub.ts`
- Wire the returned `progress` to `video.currentTime`
- Add the end-composite cross-fade layer (Section 7.1)
- Add the section-handoff bg fade (Section 7.2)

**Acceptance:** scrolling drives the video frame-by-frame smoothly. Composite cross-fades in at 90%+. Section ends in `bg-bg` color cleanly. `<About />` (or whatever follows) appears below the cinematic section as expected.

### Phase C — Overlay text + mouse parallax

- Create `src/components/CinematicOverlay.tsx` with the layout from Section 6
- Add the dark scrim gradient (Section 6.2)
- Wire opacity to scroll progress (Section 6.3)
- Add mouse parallax with kill-on-scroll behaviour (Section 5)
- Hide `<Nav />` while cinematic is in view (Section 3.5)

**Acceptance:** Pre-scroll, text is visible left-aligned over a scrimmed left half. Mouse moves cause subtle parallax. Scrolling 40% fades the text out. Nav reappears once cinematic is past.

### Phase D — Fallbacks + polish

- Add mobile detection (Section 8.1)
- Wire fallback layout (Section 8.2)
- Wire `prefers-reduced-motion` short-circuit (Section 9)
- Add `<video poster>` attribute so the first paint isn't black while the video loads
- Add `loading="eager"` to the poster `<img>` in the fallback so it doesn't pop in
- Test on a real mobile device, on a desktop with motion reduced in the OS, and on Firefox/Chrome/Safari

**Acceptance:** Mobile shows static poster + overlay, scrolls normally. Reduced-motion desktop matches the mobile path. No layout shift on first paint.

---

## 11. Acceptance criteria (full)

- [ ] First paint shows the video's first frame (not a black square) within 800ms on a fast connection
- [ ] Scroll-scrub on desktop is smooth — no visible jitter on a 60Hz monitor
- [ ] Text overlay reads cleanly against the video (scrim doing its job)
- [ ] Mouse parallax is subtle (≤12px) and stops the moment scroll begins
- [ ] At scroll 100%, the right monitor shows the Projects mockup (composite is visible)
- [ ] Cinematic section ends cleanly — no flash, no cut, into the next section
- [ ] `<Nav />` is hidden while cinematic is in view, fades in after
- [ ] Mobile shows static poster + overlay, no scrub
- [ ] Reduced-motion matches mobile path
- [ ] Total transfer for the cinematic intro is < 4 MB (video + poster + composite ≈ 3 MB)
- [ ] No console errors or warnings
- [ ] Build (`npm run build`) succeeds with no new warnings
- [ ] Lighthouse Performance score for the homepage is still ≥ 85 (it will drop a bit due to the video — that's expected and acceptable)

---

## 12. Decisions & open questions

### Resolved (locked in)

- **Section order:** `CinematicIntro` → `About` → `Work` → ... User scrolls past About to reach Projects. Existing section order is preserved.
- **Raw video file:** `intro.mp4.mp4` has been deleted. Only `intro-desktop.mp4`, `intro-poster.jpg`, and `intro-end-composite.jpg` should be referenced.

### Deferred to Phase C (decide when visible)

- **Headline scale.** Currently spec'd at `text-5xl md:text-6xl` for the name. May be bumped to `text-6xl md:text-8xl` for closer-to-Valentin scale once viewable in the browser.

### Still open

- **Browser chrome on the monitor composite.** Currently fullscreen-style. Can be regenerated to look like Chrome with `hirusha-dassanayaka.web.app` in the URL bar if desired.
- **Existing `<Hero />` component.** Being replaced in `App.tsx` but the file remains in the repo. Decide after Phase D verification — delete, or keep as fallback / future reference.
- **Stray `K0.jpg` / `K1.jpg` in `public/hero/`.** Not referenced by this spec. Confirm whether to delete (they appear to be earlier static-image hero assets, ~1.2 MB combined).

---

**Suggested next step:** start Antigravity at Phase A. Prompt it with this spec file + "implement Phase A only" so it doesn't try to do everything at once. Review after each phase like we did for the original build.
