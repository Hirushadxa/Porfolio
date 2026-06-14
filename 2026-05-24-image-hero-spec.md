# Image Hero + Scroll Reveal — Build Spec for Antigravity

This spec replaces the video-based cinematic intro with a Valentin-Cheval-style image hero that uses scroll-linked CSS transforms instead of video scrubbing. The reference effect: static portrait → image scales + fades on scroll → About section reveals on the right with a per-paragraph dim-and-blurred → clear text reveal.

> **Supersedes:** `2026-05-24-cinematic-intro-spec.md`. That spec is now historical reference only — do not implement from it.

---

## 1. Overview

We're gutting the video logic from `CinematicIntro.tsx` and rebuilding the same component as an **image-driven scroll-reveal section** that absorbs the existing `<About />` content.

The sticky scroll-scrub pattern from the cinematic version is preserved — only the rendered content changes. The `useScrollScrub` hook is reused unchanged. **Sticky region height bumped to 500vh** (from 250vh) so per-paragraph reveals have time to register at normal scroll speed.

**Visual sequence:**

1. **Scroll 0%** — Layered hero: `K0.jpg` (empty workspace) as static background + `K1-person.png` (Hirusha cut out, transparent bg) as foreground sitting in his chair. Overlay text (name + tagline + rotating words + corner captions) sits on the left. **Mouse parallax applied only to the K1-person layer** so Hirusha leans/shifts with cursor movement while the workspace stays still — gives the scene visible depth.
2. **Scroll 0–30%** — Both image layers scale up together (1.0 → 1.15) and fade (opacity 1 → 0). Overlay text fades to 0 over the same window. Mouse parallax dies.
3. **Scroll 25–95%** — About content slides in from the right edge into a right-column position. Each paragraph starts dim+blurred. As scroll progresses past each paragraph's threshold, it transitions to clear+sharp over a 12–15% scroll window. Already-passed paragraphs stay sharp; not-yet-reached paragraphs stay dim+blurred.
4. **Scroll 95–100%** — Sticky region fades to page bg color, releases. `<Work />` follows below.

---

## 2. Asset inventory

`Antigravity working folder/public/hero/`:

| File | Size | Role |
|------|------|------|
| `K0.jpg` | 580 KB | **Background layer.** Empty workspace (monitors + desk + lamp). Static, no parallax, no animation other than the scroll-driven dissolve. |
| `K1-person.png` | ~600 KB | **Foreground layer.** Hirusha cut out from K1 with transparent background. Positioned to align with where the chair would be in K0 (the photographer kept the same camera position across K0 and K1, so they stack naturally). Mouse parallax applied to this layer. |
| `K1.jpg` | 592 KB | Original photo of Hirusha at desk. Not used in the layered hero (replaced by the K0 + K1-person stack). Keep for now as backup / mobile fallback candidate; revisit deletion after Phase BC verification. |

**Files to delete (already orphaned, no longer referenced — pending sandbox availability for `rm` or manual cleanup in File Explorer):**

- `public/hero/intro-desktop.mp4`
- `public/hero/intro-start.jpg`
- `public/hero/intro-poster.jpg`
- `public/hero/intro-end-composite.jpg`

Do not import any of these from code — they will be deleted.

---

## 3. Component architecture

### 3.1 Rewrite: `src/sections/CinematicIntro.tsx`

The file stays, the name stays, the import in `App.tsx` stays unchanged. Internals are revised from the current Phase B implementation. Responsibilities:

- 250vh sticky outer container (unchanged from current Phase B)
- Sticky inner stage (unchanged)
- **Background image layer** with `K0.jpg`, `object-cover`, scale + opacity scroll-driven (no parallax)
- **Foreground image layer** with `K1-person.png`, positioned absolute over K0, same scale + opacity scroll-driven, **plus mouse parallax** active only when `progress < 0.01`
- **Scrim gradient** between the two image layers (so the left text reads against K0's background but doesn't dim the K1-person foreground)
- **Overlay text layer** (Valentin-style left-aligned: "Hi there, this is" + name + tagline + rotating words + top corners + scroll cue) with opacity scroll-driven
- **About reveal layer** containing all current About content (paragraphs + language line) positioned on the right, with per-paragraph dim → clear scroll choreography
- **Nav hide** while in the cinematic region (existing Phase B Nav-hide behaviour stays)
- **Bg handoff overlay** at 95%+ stays

### 3.3 New file: `src/components/FloatingLogos.tsx`

Renders the scatter of brand/institution SVG logos in the left column during the About reveal. Reads `progress` from parent. Each logo has its own scroll-driven opacity, gentle float animation (only when `progress > 0.25` and not `prefers-reduced-motion`), and a hand-picked position. See Section 5.6 for the full mechanic and the logo set.

### 3.2 New file: `src/components/ParagraphReveal.tsx`

Sub-component for each About paragraph. Props: `children` (the paragraph text), `start` (scroll progress at which the reveal begins, 0..1), `progress` (current scroll progress from parent). Renders an absolutely-positioned `<p>` with computed `opacity` and `filter: blur(...)` based on whether the paragraph is "not yet reached" (dim+blurred), "actively revealing" (transitioning), or "already passed" (clear).

```ts
// Sketch
interface ParagraphRevealProps {
  children: React.ReactNode;
  start: number;          // e.g., 0.40 for paragraph 1
  end?: number;           // e.g., 0.55 for paragraph 1 fully revealed; defaults to start + 0.15
  progress: number;       // scroll progress 0..1
  className?: string;
}

function ParagraphReveal({ children, start, end = start + 0.15, progress, className }: ParagraphRevealProps) {
  const local = clamp((progress - start) / (end - start), 0, 1);
  const opacity = 0.25 + local * 0.75;        // 0.25 → 1.0
  const blur = (1 - local) * 6;               // 6px → 0px
  return (
    <p
      className={className}
      style={{
        opacity,
        filter: `blur(${blur}px)`,
        transition: 'none', // do not transition — we drive this from scroll
        willChange: 'opacity, filter',
      }}
    >
      {children}
    </p>
  );
}
```

### 3.3 Existing `src/sections/About.tsx`

This file becomes **dead code** for now. Don't delete it yet — it's the source of truth for the About content that gets ported into `CinematicIntro.tsx`. After Phase C verification, it can be deleted.

In `App.tsx`, remove the `<About />` line from the rendered tree (its content lives inside `<CinematicIntro />` now).

### 3.4 Existing `src/hooks/useScrollScrub.ts`

Unchanged. Reused as-is.

### 3.5 Existing `src/sections/Hero.tsx`

Still unused. Keep as historical reference or delete — separate decision.

---

## 4. Layout

The sticky stage uses a CSS grid: 12 columns, full height. Two main zones:

```
┌────────────────────────────────────────────────────────────────┐
│ • Ingolstadt, Germany             LinkedIn · GitHub · Email    │ ← absolute top corners
├──────────────────────────────────┬─────────────────────────────┤
│                                  │                             │
│  Hi there, this is               │  ┌───────────────────────┐  │
│                                  │  │                       │  │
│  Hirusha Dassanayaka.            │  │   Hero image (K1)     │  │
│  Building bridges between        │  │   right column        │  │
│  [ Tech & Business ]             │  │   object-cover        │  │
│                                  │  │   scale + opacity     │  │
│                                  │  │   tied to scroll      │  │
│                                  │  │                       │  │
│                                  │  └───────────────────────┘  │
│  (Scroll down) ↓                 │                             │
├──────────────────────────────────┴─────────────────────────────┤
│                                                                │
│  ← Overlay text fades 0–30%                                    │
│  → About paragraphs appear in right column, 25–95% reveal      │
│  → Last paragraph clear at ~90%                                │
│  → bg-color handoff fade at 95%+                               │
└────────────────────────────────────────────────────────────────┘
```

**Tailwind sketch (not literal final code):**

```tsx
<div className="sticky top-0 h-screen w-screen overflow-hidden grid grid-cols-12 gap-6 px-8 md:px-16">
  {/* Top corners */}
  <div className="absolute top-6 left-6 ...">• Ingolstadt, Germany</div>
  <div className="absolute top-6 right-6 ...">LinkedIn · GitHub · Email</div>

  {/* Left column: overlay text + about text */}
  <div className="col-span-12 md:col-span-6 lg:col-span-5 self-center">
    {/* Hero overlay text — fades on scroll */}
    {/* About paragraphs — reveal on scroll (positioned in same column on mobile) */}
  </div>

  {/* Right column: image OR about-on-right slot */}
  <div className="col-span-12 md:col-span-6 lg:col-span-7 self-center">
    {/* Image layer (scale + opacity) */}
    {/* About on right column on desktop */}
  </div>

  {/* Bottom-left scroll cue */}
  <div className="absolute bottom-6 left-6 ...">(Scroll down) ↓</div>

  {/* Handoff bg fade */}
  <div className="absolute inset-0 ..." style={{ opacity: handoffOpacity, backgroundColor: 'var(--color-bg)' }} />
</div>
```

**Note on About placement on desktop vs mobile:**

- **Desktop (md+):** About paragraphs appear in the **right column**, replacing the fading image. This matches the reference screenshot.
- **Mobile (< md):** About paragraphs appear in the **same single column**, below where the image was. The image still scales + fades; the About reveals below it.

---

## 5. Scroll-driven choreography

Reuse `useScrollScrub(sectionRef)`. The single `progress` value drives every animated property below.

### 5.1 Hero image — scale + opacity (both layers, in sync)

```ts
// progress 0.0 → 0.3: both K0 background and K1-person foreground scale together
const imageScale = 1 + Math.min(progress / 0.3, 1) * 0.15;
const imageOpacity = 1 - Math.min(progress / 0.3, 1);
```

Apply the SAME `imageScale` and `imageOpacity` to BOTH the K0 background wrapper and the K1-person foreground wrapper. They scale and fade together as one scene. Mouse parallax (Section 6) only affects the K1-person foreground's translate, not the K0 background.

Use Framer Motion's `motion.img` with `style={{ scale: imageScale, opacity: imageOpacity }}` on each. Transform-origin defaults to center.

**K1-person positioning (head-cutoff fix):** The previous Phase BC implementation cropped the head with `object-cover`. Replace with:

```tsx
<motion.img
  src="/hero/K1-person.png"
  alt=""
  style={{ scale: imageScale, opacity: imageOpacity }}
  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[95%] w-auto max-w-none object-contain"
/>
```

Key changes: `object-contain` not `object-cover`, anchor to `bottom-0`, fixed height `h-[95%]` of stage (slight margin from top), `w-auto` to preserve aspect, `-translate-x-1/2` to center horizontally. The whole person is always visible head-to-frame regardless of viewport aspect ratio.

**K0 background** can keep `object-cover` since it's a full scene that should fill the viewport.

### 5.2 Overlay text — opacity + typography + scrim

```ts
// progress 0.0 → 0.30: overlay fades 1.0 → 0
const overlayOpacity = 1 - Math.min(progress / 0.30, 1);
```

Apply `overlayOpacity` to the wrapping div for intro caption + name + tagline + rotating words + bottom scroll cue. Top-corner captions (location, socials) fade with the same curve.

**Typography scale (bumped after Phase BC v1 — text was too small):**

| Element | Tailwind classes | Notes |
|---|---|---|
| Intro caption ("Hi there, this is") | `font-mono text-base md:text-lg text-fg-muted` | up from `text-sm` |
| Name ("Hirusha Dassanayaka.") | `font-display text-7xl md:text-9xl leading-[1]` | up from `text-6xl md:text-8xl` |
| Tagline + rotating words | `text-xl md:text-2xl text-fg-muted` | up from `text-lg md:text-xl` |
| Top-corner captions | `font-mono text-sm md:text-base` | up from `text-xs` |
| Bottom scroll cue | `font-mono text-sm` | up from `text-xs` |

**Scrim gradient (darkened so text reads against busy K0 background):**

```tsx
<div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent to-65%" />
```

Up from `from-black/55 to-transparent to-55%`. Three stops now (75% → 40% → transparent) for a smoother roll-off into the photo area.

### 5.3 About paragraphs — dim+blur → clear

The About right-column wrapper MUST have `id="about"` so the Nav's `<a href="#about">` link scrolls to it correctly. Previous Phase BC v1 missed this — the Nav link became dead because the original `<About />` section was removed from App.tsx.

```tsx
<div id="about" className="absolute right-8 top-1/2 -translate-y-1/2 max-w-xl ...">
  {/* heading + paragraphs */}
</div>
```

Three paragraphs from the current About:

| # | Content | start | end |
|---|---------|-------|-----|
| 1 | "I'm a 5th-semester Digital Technology & Management student..." | 0.30 | 0.45 |
| 2 | "Before Germany, I worked at Singer Sri Lanka PLC..." | 0.50 | 0.65 |
| 3 | Language line: `EN — C1 · DE — B2 · SI — Native` | 0.70 | 0.82 |

Initial state (before any has been scrolled past): opacity 0.25, blur 6px, fully visible (just dim and unreadable). Final state (after reveal): opacity 1, blur 0.

Use `<ParagraphReveal>` (Section 3.2) for each. The "section heading" (`(About)` label + `Tech-fluent. Business-minded. Detail-obsessed.` headline) appears at the top of the right column from the start (opacity 1, no reveal animation) — anchors the section visually.

**About typography (bumped after Phase BC v1):**

| Element | Tailwind classes |
|---|---|
| `(About)` label | `font-mono text-sm md:text-base text-accent` |
| Heading "Tech-fluent..." | `font-display text-4xl md:text-5xl leading-[1.05]` |
| Paragraphs (1, 2) | `text-lg md:text-xl leading-relaxed text-fg` |
| Language line | `font-mono text-base md:text-lg` |

All up one notch from the existing About.tsx values, since the section now competes visually with the floating logos and a large left-side hero text.

### 5.4 About slide-in from right

Optional polish: the entire About right-column wrapper can slide in from `translateX(40px)` → `translateX(0)` over scroll 0.25 → 0.40. Subtle. Don't overdo it — the reference (Valentin) doesn't slide, just reveals. Implement only if it feels right when testing; otherwise skip.

### 5.5 Handoff bg fade

Same as Phase B:

```ts
const handoffOpacity = Math.max(0, (progress - 0.95) / 0.05);
```

Section ends in clean bg, Work appears below.

### 5.6 Floating logos — fill the empty left column during About reveal

While the About reveal is happening on the right, the left column is dead space. Fill it with a scatter of small floating logos that reinforce Hirusha's story (education, employers, tech stack).

**Container:** new component `<FloatingLogos />` (Section 3.3). Lives inside `<CinematicIntro />`, positioned absolutely in the left ~45% of the stage (the same area the overlay text occupied), behind the overlay text in z-order so it doesn't compete during the hero state.

**Per-logo behaviour:**
- Each logo is ~32–48px square, SVG, monochrome white-on-transparent or muted (`opacity: 0.5–0.7`)
- Positioned randomly within the left column area (use a hand-picked scatter rather than `Math.random()` so layout is stable across renders)
- **Opacity tied to scroll progress:** invisible at scroll 0, fades in over 25%–40%, stays visible through 95%, fades with the handoff
- **Gentle float animation (only when `progress > 0.25`):** each logo drifts ±4px vertically with a 4–6s loop, randomised per logo. Optional ±0.5° rotation.
- **Reduced-motion:** static, no float animation, but still fade in/out with scroll

```tsx
// Sketch
const LOGOS = [
  { src: '/logos/oth-amberg-weiden.svg', x: 8,  y: 18, delay: 0 },
  { src: '/logos/thomas-more.svg',        x: 22, y: 35, delay: 0.3 },
  { src: '/logos/singer-sri-lanka.svg',   x: 15, y: 55, delay: 0.6 },
  { src: '/logos/wenglor.svg',            x: 30, y: 72, delay: 0.9 },
  { src: '/logos/react.svg',              x: 5,  y: 78, delay: 1.2 },
  { src: '/logos/typescript.svg',         x: 35, y: 12, delay: 0.15 },
  { src: '/logos/vite.svg',               x: 28, y: 88, delay: 0.45 },
  { src: '/logos/firebase.svg',           x: 12, y: 40, delay: 0.75 },
  { src: '/logos/power-bi.svg',           x: 38, y: 50, delay: 1.05 },
  { src: '/logos/gemini.svg',             x: 18, y: 92, delay: 1.35 },
];

// x, y are percentages within the left column area
```

**Logo set (locked in):**

| File | Source | Category |
|---|---|---|
| `oth-amberg-weiden.svg` | oth-aw.de press/brand page | Education |
| `thomas-more.svg` | thomasmore.be brand assets | Education |
| `singer-sri-lanka.svg` | singersl.com corporate identity | Company |
| `wenglor.svg` | wenglor.com brand resources | Company |
| `react.svg` | simpleicons.org/icons/react | Tech |
| `typescript.svg` | simpleicons.org/icons/typescript | Tech |
| `vite.svg` | simpleicons.org/icons/vitejs | Tech |
| `firebase.svg` | simpleicons.org/icons/firebase | Tech |
| `power-bi.svg` | simpleicons.org/icons/powerbi | Tech |
| `gemini.svg` | simpleicons.org/icons/googlegemini | Tech |

All saved to `public/logos/` as SVGs. Hirusha sources and saves them; spec assumes they're in place before Antigravity runs Phase BC.

---

## 6. Mouse parallax (pre-scroll only) — K1-person only

- **Active only while `progress < 0.01`** (pre-scroll). Once scroll begins, listener is removed and spring settles to 0.
- **Applied ONLY to the K1-person foreground wrapper.** K0 background does not translate. This is the entire visual point of the layered hero — the person shifts subtly while the workspace stays still, creating depth.
- **Magnitude: ±12px X / ±8px Y** (revised down from ±20/±14 — the prior magnitude felt puppet-like, too snappy/exaggerated).
- **Spring: `stiffness: 30`, `damping: 25`** (revised from `stiffness: 50, damping: 20`). Slower response, smoother glide. The lower stiffness makes the motion feel like the person is gently shifting weight rather than tracking the cursor.
- Use `useMotionValue` + `useSpring` per Framer Motion convention.

Translate direction is opposite to cursor (mouse moves right → image shifts left a bit). Mimics how perspective works when you lean.

The scale (from § 5.1) and parallax translate stack on the K1-person element: the outer wrapper does the parallax translate, the inner `motion.img` does the scale. Don't combine them in one transform string or you'll fight Framer Motion's animation interpolation.

```tsx
// Sketch
<motion.div style={{ x: springX, y: springY }} className="absolute inset-0 pointer-events-none">
  <motion.img
    src="/hero/K1-person.png"
    alt=""
    style={{ scale: imageScale, opacity: imageOpacity }}
    className="h-full w-full object-cover object-center"
  />
</motion.div>
```

---

## 7. Mobile & reduced-motion fallback

### 7.1 Detection

```ts
const isMobile = window.matchMedia('(max-width: 767px)').matches;
const prefersReduced = useReducedMotion();
const useFallback = isMobile || prefersReduced;
```

### 7.2 Fallback behavior

When `useFallback === true`:

- **Drop the sticky 250vh container.** Render as a normal-flow section with `min-h-screen`.
- **No scroll-scrub.** Image is shown at static `scale(1)`, `opacity(1)`.
- **No mouse parallax.**
- **No per-paragraph reveal.** About paragraphs render at full opacity with no blur. Use the existing `<Reveal>` component (from the current About.tsx) for a simple stagger fade-in instead.
- **Single column.** Image fills full width at the top, About content stacks below.

Effectively: on fallback, this section behaves like a traditional hero followed by the existing About section.

---

## 8. Build phases

**Status of prior phases:**
- ✅ **Phase A** (gut video, image hero scaffold, App.tsx swap) — complete and approved
- ⚠️ **Phase B** (scroll-scrub + image dissolve + overlay fade + mouse parallax + Nav hide) — implemented but superseded by Phase BC
- ⚠️ **Phase BC v1** (layered hero + parallax revision + about reveal) — implemented but needs revision per user feedback: parallax too snappy, head cropped, text too small, scroll region too short, About not linked to Nav, empty left column

The remaining work is collapsed into **one revised phase** (Phase BC v2) so Antigravity executes all corrections in a single pass.

### Phase BC v2 — Polish on layered hero + add floating logos

This phase revises the BC v1 implementation to address the user-feedback issues, and adds the floating-logos component to fill the empty left column.

**1. Scroll region extension:**
- Bump outer container from `h-[250vh]` to `h-[500vh]` (so per-paragraph reveals are visible at normal scroll speed)

**2. Mouse parallax dampening (Section 6):**
- Reduce magnitude from ±20px X / ±14px Y → **±12px X / ±8px Y**
- Reduce spring snappiness: `stiffness: 50 → 30`, `damping: 20 → 25`
- All other behaviour unchanged

**3. Head-cutoff fix (Section 5.1):**
- K1-person `<motion.img>`: replace `object-cover` with `object-contain`
- Position: `absolute bottom-0 left-1/2 -translate-x-1/2 h-[95%] w-auto max-w-none`
- Whole person visible head-to-frame regardless of viewport aspect

**4. Scrim darkening (Section 5.2):**
- Replace `from-black/55 to-transparent to-55%` with `from-black/75 via-black/40 to-transparent to-65%`
- Three-stop gradient for smoother roll-off, darker overall

**5. Hero typography bumps (Section 5.2):**
- Intro caption "Hi there, this is": `text-sm` → `text-base md:text-lg`
- Name "Hirusha Dassanayaka.": `text-6xl md:text-8xl` → **`text-7xl md:text-9xl`**, add `leading-[1]`
- Tagline + RotatingWords: `text-lg md:text-xl` → `text-xl md:text-2xl`
- Top-corner captions: `text-xs` → `text-sm md:text-base`
- Bottom scroll cue: `text-xs` → `text-sm`

**6. About typography bumps (Section 5.3):**
- `(About)` label: `text-xs` → `text-sm md:text-base`
- Heading: `text-3xl md:text-4xl` → `text-4xl md:text-5xl`
- Paragraphs: `text-base md:text-lg` → `text-lg md:text-xl`
- Language line: `text-sm md:text-base` → `text-base md:text-lg`

**7. About → Nav anchor wiring (Section 5.3):**
- Add `id="about"` to the wrapper that contains the About heading + paragraphs
- Confirm `<Nav />` link `<a href="#about">` jumps the user to this anchor

**8. FloatingLogos component (Sections 3.3, 5.6):**
- Create `src/components/FloatingLogos.tsx`
- Place in the left half of the stage, z-index below the overlay text (above K0+scrim)
- Renders the 10 logos from the table in Section 5.6 (paths under `/logos/`)
- Per-logo scroll-driven opacity (invisible at 0%, fades in 25%→40%, visible through 95%)
- Gentle float animation (±4px vertical, 4–6s loop, randomised delay) when `progress > 0.25` and not reduced-motion
- Mobile fallback: render as a compact horizontal logo strip below the About content, no float animation

**Acceptance (Phase BC v2):**
- Sticky region holds for 500vh of scroll (not 250vh) — About reveal visible at normal scroll speed
- K1-person whole body visible head-to-frame, no head crop, anchored to bottom-center
- Cursor parallax feels smooth and weighted (not puppet-y) — magnitude ±12/±8, slower spring
- Hero text legibly visible against the darker scrim, larger scale
- "(About)" label + heading anchor at top of right column from scroll 0 — paragraphs reveal one-at-a-time below
- Nav "About" link scrolls user to the About heading inside CinematicIntro (`id="about"` wired)
- 10 floating logos visible on the left side once About reveal begins (~scroll 25%+)
- Logos drift gently in non-reduced-motion, static when reduced-motion
- All other Phase BC v1 acceptance criteria still pass

---

## 9. Acceptance criteria (full)

- [ ] Sticky region is 500vh, About reveal visible at normal scroll speed
- [ ] First paint shows layered hero (K0 + K1-person stacked correctly) + overlay text within 600ms
- [ ] K1-person whole-body visible head-to-frame, bottom-anchored, no clipping
- [ ] Cursor movement translates ONLY the K1-person foreground; K0 stays still
- [ ] Parallax magnitude ±12px X / ±8px Y, spring `stiffness: 30, damping: 25` — smooth and weighted
- [ ] Mouse parallax dies once scroll begins (`progress > 0.01`)
- [ ] Both image layers scale + fade together during scroll 0–30%
- [ ] Scrim is darker (`from-black/75 via-black/40 to-transparent`), text reads clearly against K0
- [ ] Overlay text reads "Hi there, this is" → "Hirusha Dassanayaka." → "Building bridges between [rotating]"
- [ ] Name renders at `text-7xl` on mobile, `text-9xl` on desktop
- [ ] Overlay text gone by 30% scroll
- [ ] About heading + label visible from scroll 0 at top of right column (`id="about"` wired)
- [ ] Nav "About" link scrolls user to the About anchor
- [ ] About paragraphs reveal one-at-a-time from dim+blurred → clear+sharp
- [ ] All About content readable by ~90% scroll
- [ ] About typography bumped: heading `text-4xl md:text-5xl`, paragraphs `text-lg md:text-xl`
- [ ] 10 floating logos visible in left column starting ~scroll 25%, drift gently
- [ ] All 10 logo files present at `public/logos/`
- [ ] Section ends in clean bg color, Work follows naturally
- [ ] Nav stays hidden during the cinematic region
- [ ] Mobile: single-column, no scrub, no parallax, About below layered hero, logos as compact strip
- [ ] Reduced-motion: same as mobile path, no float animation on logos
- [ ] No console errors, no layout shift on first paint
- [ ] `npm run build` succeeds with no new warnings

---

## 10. Decisions & open questions

### Resolved (locked in)

- **Reference:** Valentin Cheval pattern — image zooms + fades, About text reveals dim+blurred → clear per paragraph.
- **Hero composition:** Layered — `K0.jpg` (static background) + `K1-person.png` (foreground with mouse parallax). The two photos were shot from the same camera position, so they stack naturally.
- **K1.jpg:** Backup / not used in the layered hero. Kept on disk for now.
- **Sticky region:** 500vh (extended from 250vh for slow-scroll legibility of About reveals).
- **Mouse parallax:** Foreground-only (K1-person), magnitude ±12px X / ±8px Y, spring `stiffness: 30, damping: 25`, kill-on-scroll.
- **K1-person positioning:** `object-contain`, bottom-anchored (`h-[95%] w-auto`, `bottom-0`, `-translate-x-1/2`) — no head crop.
- **Scrim:** `from-black/75 via-black/40 to-transparent to-65%` (darker, smoother).
- **Headline scale:** `text-7xl md:text-9xl` (bumped from `text-6xl md:text-8xl`).
- **About anchor:** `id="about"` on About wrapper inside CinematicIntro, Nav link wired.
- **About typography:** heading `text-4xl md:text-5xl`, paragraphs `text-lg md:text-xl`, language line `text-base md:text-lg`.
- **Floating logos:** 10 logos (`oth-amberg-weiden`, `thomas-more`, `singer-sri-lanka`, `wenglor`, `react`, `typescript`, `vite`, `firebase`, `power-bi`, `gemini`) in `public/logos/`, rendered by `<FloatingLogos />` component, scroll-driven opacity + gentle float animation.
- **Headline intro caption:** "Hi there, this is" (replaces prior "Hello.")
- **About placement:** Existing About content unchanged, absorbed into the scroll region's right column on desktop, stacked below on mobile.
- **Component:** Reuse `CinematicIntro.tsx` (revise from current Phase B state) and `useScrollScrub.ts` (no changes).
- **Build plan:** Combined Phase BC — Antigravity executes all remaining work in one pass.

### Still open

- **About slide-in animation** — optional polish, decide visually after Phase BC ships.
- **Top-corner captions fade curve** — match overlay text fade or stay visible longer? Default: match.
- **Old `Hero.tsx` and `About.tsx` files** — keep for reference or delete after Phase BC verification?
- **Headline scale `text-8xl` on small screens** — may need a `text-7xl` knee for tablet (md to lg) to avoid awkward wrapping. Adjust if necessary.
- **`K0.jpg`** — delete or repurpose?

---

**Next step:** start Antigravity at Phase A with this spec. Same review loop as before — Antigravity completes a phase, sends output, I review against acceptance criteria before clearing the next phase.
