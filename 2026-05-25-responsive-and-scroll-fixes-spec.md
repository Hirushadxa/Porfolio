# Spec — Responsive Fixes + Scroll Smoothness Pass

**Date:** 2026-05-25
**Owner:** Hirusha
**Author of spec:** Claude (Cowork) — to be executed by Antigravity
**Project:** Portfolio website (React + Vite + TypeScript + Tailwind v4)
**Scope:** Fix tablet "hero re-pins / lag" behavior, smooth out scrolling on touch devices, and clean up a handful of breakpoint issues across nav, container, experience timeline, and contact CTA.

---

## 0. Context an Antigravity agent needs to know

The site uses:
- **React 19 + Vite 8 + TypeScript** under `src/`
- **Tailwind CSS v4** (CSS-first config in `src/index.css` via `@theme`)
- **Framer Motion 12** for animations
- **Lenis 1.3** for global smooth scroll, wired in `src/components/SmoothScroll.tsx`
- A custom `useScrollScrub` hook in `src/hooks/useScrollScrub.ts` that drives the cinematic hero via rAF + `setState`

The single page mounts in `src/App.tsx`:

```
SmoothScroll
 ├ CurtainLoader
 ├ Nav
 ├ main
 │   ├ CinematicIntro      ← Hero + About combined, sticky background, scroll-scrubbed
 │   ├ Work
 │   ├ Experience
 │   ├ Skills
 │   └ Contact
 └ Footer
```

Do **NOT** rename components, restructure App.tsx, change routing, or modify Tailwind tokens. All changes are **surgical edits** to the files listed under each task.

---

## 1. Symptoms reported by Hirusha

1. "After one scroll on tablet, the hero section comes back to full screen and lags" — sticky hero feels like it pins for too long and stutters while scrolling.
2. Scrolling does not feel smooth (perceived jank/rubber).
3. General responsive issues across breakpoints.

---

## 2. Root causes (verified by reading the code)

### 2a. Tablet falls into the heavy desktop cinematic path
`src/sections/CinematicIntro.tsx` line **42**:

```ts
const mq = window.matchMedia('(max-width: 767px)');
```

This means tablets (768 – 1023 px, including iPads in portrait) get the **desktop branch** (line 198 onward), which:
- Sets the section to `min-h-[200dvh]` (line 202) — twice the viewport tall, so the user must scroll through 2× viewport-heights of the same hero.
- Pins a `sticky top-0 h-dvh` background (line 205) carrying two large images (`/hero/K0.jpg` and `/hero/K1-person.png`).
- Animates **four** style properties on each scroll frame via `useScrollScrub` and `setState` (lines 56–65): `imageScale`, `imageOpacity`, `scrimDarkenOpacity`, `aboutScrimOpacity`.
- Runs mouse-parallax (lines 73–88) — irrelevant on touch, but the listener still attaches.

That combination on a mid-range tablet GPU is what feels like "comes back to full screen and lags."

### 2b. Lenis fights native touch momentum
`src/components/SmoothScroll.tsx` line **25–30**:

```ts
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  touchMultiplier: 2,
  infinite: false,
});
```

Two issues for touch devices:
1. `touchMultiplier: 2` amplifies finger movement — touch scrolling feels overshoot-y.
2. There is no `(hover: none) and (pointer: coarse)` gate, so Lenis instantiates on iPad / phone where native scrolling is already smooth.

### 2c. `useScrollScrub` re-renders on every frame even when nothing changed
`src/hooks/useScrollScrub.ts` lines **36–47** call `setProgress(p)` every rAF tick. React will re-render `CinematicIntro` every frame during scroll, re-evaluating all four style derivations and pushing fresh props into multiple `<motion>` elements. On tablets this compounds with 2a.

### 2d. Nav stays hidden too long on the long cinematic intro
`src/components/Nav.tsx` line **22**:

```ts
setCinematicActive(window.scrollY < window.innerHeight * 0.9);
```

With the 200dvh intro, the nav doesn't re-show until ≈45 % of the section. On tablet this feels like the nav is "missing."

### 2e. Minor responsive gaps
- `src/components/Container.tsx` (line 19): `px-6 md:px-12` jumps with no intermediate step — content hugs the edge on 640–768 px screens.
- `src/components/ExperienceItem.tsx` (line 15): `md:grid-cols-[200px_1fr]` engages at 768 px and the 200 px label column is too tight on small tablets.
- `src/sections/Contact.tsx` (line 22): email pill can overflow on ≤360 px phones even with `break-all`.

---

## 3. Fixes — task by task

### TASK 1 — Expand mobile fallback in CinematicIntro to cover tablets and touch
**File:** `src/sections/CinematicIntro.tsx`
**Lines:** 41–47
**Current:**

```ts
useEffect(() => {
  const mq = window.matchMedia('(max-width: 767px)');
  setIsMobile(mq.matches);
  const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}, []);
```

**Replace with:**

```ts
useEffect(() => {
  // Use the lightweight stacked layout on tablets AND any touch-primary device.
  // Width gate catches portrait iPads; pointer:coarse catches landscape iPads
  // and touch-only laptops up to ~1280px.
  const mq = window.matchMedia(
    '(max-width: 1023px), (hover: none) and (pointer: coarse)'
  );
  setIsMobile(mq.matches);
  const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}, []);
```

**Why:** the desktop sticky-pinned, scroll-scrubbed cinematic stage is too heavy for tablets. Falling into the existing `useFallback` branch (lines 113–193) gives them the stacked headshot + intro + about layout that already works on phones.

**Rename note:** the local variable is still called `isMobile` even though it now matches tablets too. **Do not rename it** — it would touch downstream usage and add diff noise. The new media query is the only change.

---

### TASK 2 — Shrink the desktop cinematic section height
**File:** `src/sections/CinematicIntro.tsx`
**Line:** 202
**Current:**

```tsx
<section
  ref={sectionRef}
  id="cinematic-intro"
  className="relative min-h-[200dvh]"
>
```

**Replace with:**

```tsx
<section
  ref={sectionRef}
  id="cinematic-intro"
  className="relative min-h-[160dvh]"
>
```

**Why:** even on desktop, 200dvh is a long scroll for a single hero. 160dvh keeps the same effect (image fades to scrim, About is revealed) but cuts the pinned distance by ~20 % and reduces the total frames where every animated property updates.

---

### TASK 3 — Add GPU promotion to the sticky background wrapper
**File:** `src/sections/CinematicIntro.tsx`
**Line:** 205
**Current:**

```tsx
<div className="sticky top-0 h-dvh w-full overflow-hidden z-0 pointer-events-none">
```

**Replace with:**

```tsx
<div
  className="sticky top-0 h-dvh w-full overflow-hidden z-0 pointer-events-none"
  style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
>
```

**Why:** forces this wrapper onto its own GPU compositor layer so subsequent transform/opacity updates on its children don't trigger re-paints of siblings.

---

### TASK 4 — Throttle `useScrollScrub` re-renders to meaningful progress changes
**File:** `src/hooks/useScrollScrub.ts`
**Lines:** 14–48
**Current:**

```ts
export default function useScrollScrub(ref: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId: number;
    let elementTop = 0;
    let elementHeight = 0;

    const updateMeasurements = () => {
      if (!ref.current) return;
      let top = 0;
      let curr = ref.current;
      while (curr) {
        top += curr.offsetTop;
        curr = curr.offsetParent as HTMLElement;
      }
      elementTop = top;
      elementHeight = ref.current.offsetHeight;
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (elementHeight === 0) {
          updateMeasurements();
        }
        const total = elementHeight - window.innerHeight;
        if (total <= 0) return;
        const scrolled = window.scrollY - elementTop;
        const p = Math.max(0, Math.min(1, scrolled / total));
        setProgress(p);
      });
    };
    // …
```

**Replace the `onScroll` body with:**

```ts
const onScroll = () => {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    if (elementHeight === 0) {
      updateMeasurements();
    }
    const total = elementHeight - window.innerHeight;
    if (total <= 0) return;
    const scrolled = window.scrollY - elementTop;
    const p = Math.max(0, Math.min(1, scrolled / total));
    // Only commit a re-render when progress changes meaningfully (~0.5%).
    // Skips ~200 React reconciliations per full-section scroll.
    setProgress((prev) => (Math.abs(prev - p) > 0.005 ? p : prev));
  });
};
```

**Why:** React calls a reconciliation for every `setState` even when the value is structurally identical. Bouncing the threshold to 0.005 still gives a visually smooth animation (every ~5 px of scroll within the 200dvh stage) while cutting React work by an order of magnitude.

---

### TASK 5 — Lenis: gate off touch, soften wheel, lower touch multiplier
**File:** `src/components/SmoothScroll.tsx`
**Lines:** 21–45
**Current:**

```ts
export default function SmoothScroll({ children }: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
      infinite: false,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
```

**Replace with:**

```ts
export default function SmoothScroll({ children }: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // On touch-primary devices, native momentum is already smoother than
    // anything Lenis can interpolate — opt out entirely.
    const isTouchPrimary =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    if (isTouchPrimary) return;

    const lenis = new Lenis({
      duration: 1.05,                                    // a touch faster, less rubbery
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1,                                // neutral, default-like
      infinite: false,
    });

    lenisRef.current = lenis;

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
```

**Why:**
- `isTouchPrimary` returns the page to native scrolling on phones, iPads, touch-first laptops — eliminating the rubbery feel.
- `duration: 1.05` is a small reduction that makes the wheel feel snappier without losing the inertial character.
- `touchMultiplier: 1` is moot once the touch gate is in place but stays as a safety net.
- `cancelAnimationFrame(rafId)` on cleanup prevents a dangling rAF after `lenis.destroy()` during hot-reload.

---

### TASK 6 — Make the Nav re-show on a fixed scroll offset, not a viewport-relative one
**File:** `src/components/Nav.tsx`
**Lines:** 18–27
**Current:**

```ts
useEffect(() => {
  const onScroll = () => {
    setScrolled(window.scrollY > 80);

    setCinematicActive(window.scrollY < window.innerHeight * 0.9);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

**Replace with:**

```ts
useEffect(() => {
  const onScroll = () => {
    const y = window.scrollY;
    setScrolled(y > 80);
    // Fixed threshold (~70% of a typical viewport) means nav reappears at the
    // same point regardless of the cinematic section's dvh height.
    setCinematicActive(y < 600);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

**Why:** with the cinematic section reduced (Task 2) and the tablet fallback engaged (Task 1), tying nav-show to `innerHeight * 0.9` produces inconsistent feel. A fixed 600 px works at all sizes.

---

### TASK 7 — Smoother gutter ramp in `Container`
**File:** `src/components/Container.tsx`
**Line:** 19
**Current:**

```tsx
<Tag className={`mx-auto w-full max-w-7xl px-6 md:px-12 ${className}`}>
```

**Replace with:**

```tsx
<Tag className={`mx-auto w-full max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12 ${className}`}>
```

**Why:** introduces an intermediate gutter at sm (640 px) and md (768 px) so text doesn't slam into the viewport edges on small tablets.

---

### TASK 8 — Push the timeline two-column layout to `lg:`
**File:** `src/components/ExperienceItem.tsx`
**Line:** 15
**Current:**

```tsx
<div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-12">
```

**Replace with:**

```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-[180px_1fr] lg:gap-12">
```

**Also update lines 17 and 22:** change `md:pt-1` → `lg:pt-1` (line 17) and `md:pl-6` → `lg:pl-6` (line 22). Leave `pl-4` and the rest unchanged.

**Why:** at 768 px the period column squeezes the role/company line. Stacking until 1024 px gives the timeline room to breathe on small tablets.

---

### TASK 9 — Make the Contact email pill safe on tiny phones
**File:** `src/sections/Contact.tsx`
**Lines:** 20–26
**Current:**

```tsx
<a
  href="mailto:hirushadassanayaka1@gmail.com"
  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-bg transition-all duration-200 hover:-translate-y-1 hover:bg-accent-hover md:px-8 md:py-4 md:text-lg"
>
  <span className="break-all md:break-normal">hirushadassanayaka1@gmail.com</span>
  <ArrowUpRight className="h-5 w-5 shrink-0" />
</a>
```

**Replace with:**

```tsx
<a
  href="mailto:hirushadassanayaka1@gmail.com"
  className="inline-flex max-w-full items-center gap-2 rounded-full bg-accent px-4 py-3 text-xs font-medium text-bg transition-all duration-200 hover:-translate-y-1 hover:bg-accent-hover sm:px-5 sm:text-sm md:px-8 md:py-4 md:text-lg"
>
  <span className="min-w-0 truncate sm:whitespace-normal sm:break-all md:break-normal">
    hirushadassanayaka1@gmail.com
  </span>
  <ArrowUpRight className="h-5 w-5 shrink-0" />
</a>
```

**Why:** caps the pill width at the parent container width, truncates on ≤640 px, then progressively unlocks normal wrapping at larger breakpoints. No more horizontal overflow on 320–375 px phones.

---

### TASK 10 — Optional polish: lift `will-change` off the K0 image when it's faded out
**File:** `src/sections/CinematicIntro.tsx`
**Lines:** 209–217 (the `<motion.img src="/hero/K0.jpg" …>`)
**Current:**

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

**Replace `style` with:**

```tsx
style={{
  scale: imageScale,
  opacity: imageOpacity,
  willChange: imageOpacity > 0.02 ? 'transform, opacity' : 'auto',
}}
```

**Why:** keeping `will-change` active forever pins a compositor layer for an invisible element. Dropping it once opacity is essentially 0 frees memory. Apply the same pattern (lines 224–242) to the K1-person `motion.div` if it's easy — same intent.

---

## 4. Files allowed to touch

- `src/sections/CinematicIntro.tsx`
- `src/hooks/useScrollScrub.ts`
- `src/components/SmoothScroll.tsx`
- `src/components/Nav.tsx`
- `src/components/Container.tsx`
- `src/components/ExperienceItem.tsx`
- `src/sections/Contact.tsx`

## 5. Files that MUST NOT change

- `src/App.tsx` — composition is correct; do not reorder sections.
- `src/index.css` — design tokens are locked.
- `src/sections/Hero.tsx` — unused fallback reference, leave alone.
- `src/sections/Work.tsx`, `src/sections/Skills.tsx`, `src/sections/Experience.tsx` — section shells are fine.
- `src/data/*` — content data, off-limits for this pass.
- `src/components/CurtainLoader.tsx`, `src/components/Footer.tsx`, `src/components/ProjectCard.tsx`, `src/components/SkillGroup.tsx`, `src/components/SectionHeader.tsx`, `src/components/Reveal.tsx`, `src/components/RevealWords.tsx`, `src/components/ParagraphReveal.tsx`, `src/components/RotatingWords.tsx`, `src/components/FloatingLogos.tsx` — not in scope.
- `package.json`, `tsconfig*.json`, `eslint.config.js`, `vite.config.ts` — do not modify.

## 6. Acceptance criteria

A change is "done" only when all of the following hold:

1. **Tablet (768–1023 px, portrait iPad simulation in DevTools):** scrolling the hero section is one smooth motion with no sticky pin and no animated zoom — it uses the stacked headshot + intro + About layout that already exists for phones.
2. **Touch-primary device (DevTools mobile emulation with touch):** Lenis is not instantiated. Confirm by adding `console.log` temporarily or by checking that `document.documentElement.classList` does not include `lenis` / `lenis-smooth`.
3. **Desktop ≥1024 px non-touch:** the cinematic scrub still works — image scales, fades to black, About reveals on the right. Total intro scroll is now ~160dvh instead of 200dvh.
4. **Nav:** disappears under the hero, reappears once the user has scrolled past 600 px, both on desktop and on the new tablet stacked layout.
5. **Container gutters:** at 360 / 480 / 768 / 1024 / 1440 px viewports, content has visible breathing room from the edge (no copy hugging the screen border).
6. **Experience timeline:** stacks single-column up to 1023 px; switches to 180 px + 1fr at ≥1024 px.
7. **Contact email pill:** never overflows the section at 320 px; visually unchanged at ≥768 px.
8. `npm run build` succeeds with zero TS errors.
9. `npm run lint` succeeds with zero new warnings.
10. No new `console.error` / `console.warn` in DevTools on a full-page scroll.

## 7. Verification steps (manual)

1. `npm run dev` and open Chrome DevTools.
2. Toggle device toolbar; test these viewports in order: 360×740, 414×896, 768×1024 (portrait iPad), 1024×1366 (landscape iPad), 1280×800, 1440×900, 1920×1080.
3. At each viewport, scroll the full page once. Watch for:
   - Hero pinning longer than its own height (should not happen ≤1023 px).
   - Jank or frame drops in the Performance panel (record a 5-second scroll, look for long tasks > 50 ms).
   - Content overflowing horizontally (look for a horizontal scrollbar — there should be none at any size).
4. With "Throttle: Mid-tier mobile" CPU + "Slow 4G" network in DevTools, repeat 360×740 and 768×1024 — the hero scroll must remain smooth.
5. Toggle `prefers-reduced-motion: reduce` in DevTools rendering panel — confirm the page still loads and the intro doesn't break.
6. Build + preview: `npm run build && npm run preview`, repeat steps 2–3 on the production bundle.

## 8. Out of scope (do not bundle in this PR)

- Visual redesigns, copy changes, new sections.
- Lighthouse / Core Web Vitals tuning beyond what falls out of these changes.
- Replacing Lenis with another library.
- Refactoring `useScrollScrub` to use `IntersectionObserver` or `useScroll` from Framer Motion — interesting, but a separate PR.

## 9. Rollback plan

Each task is independent. If a change causes a regression, revert that file only — none of the tasks depend on each other except:
- Task 4 (`useScrollScrub` throttling) is most useful when paired with Task 2 (shorter section), but is safe on its own.
- Task 6 (Nav fade) assumes Task 2 — if Task 2 is reverted, change the `600` back to `window.innerHeight * 0.9`.

---

End of spec.
