# Orbit Section — Auto-Color Cycle Feature Spec

## The Problem
The orbit section shows logos and tech icons in grayscale by default, revealing their brand colours only on hover. Most visitors never discover this because there is no visual cue that hover does anything.

---

## Approach A — Auto-cycle (Hirusha's idea) ✅ RECOMMENDED

### Behaviour
- On page load, start an interval timer.
- Every **3 seconds**, pick the **next icon** in a shuffled (non-sequential) order.
- The active icon shows its full brand colour; all others stay grayscale.
- When the list is exhausted, reshuffle and start again.
- **If the user hovers** any icon manually, pause the auto-cycle for as long as the cursor is over the orbit section. Resume when the cursor leaves.
- The colour transition should be smooth: use a **0.4s ease-in-out** CSS transition on `filter` (or `opacity` if using a colour overlay approach).

### Antigravity Prompt to implement Approach A

```
In the orbit/solar-system section of the hero:

1. Create a state variable called `activeOrbitIndex` (number | null), initially null.
2. Create a state variable called `shuffledOrder` (number[]), initially an empty array.
3. On component mount, generate a shuffled version of the icon indices (Fisher-Yates shuffle) and store it in `shuffledOrder`. Set `activeOrbitIndex` to `shuffledOrder[0]`.
4. Start a `setInterval` with a 3000ms delay. On each tick, advance to the next index in `shuffledOrder`. When the end of the array is reached, reshuffle and restart from index 0.
5. Store the interval ID in a ref and clear it on unmount.
6. Add an `isAutoPlaying` state boolean, default true.
7. On `onMouseEnter` of the orbit container, set `isAutoPlaying` to false and pause the interval (clear it).
8. On `onMouseLeave` of the orbit container, set `isAutoPlaying` to true and restart the interval.
9. For each orbit icon, apply the full-colour style when its index matches `activeOrbitIndex` OR when it is being individually hovered (keep existing hover behaviour). Otherwise apply the grayscale style.
10. Ensure the colour transition uses `transition: filter 0.4s ease-in-out` so the colour fades in and out smoothly rather than snapping.
```

---

## Approach B — "Breathe" pulse hint (alternative, simpler)

Instead of cycling, add a one-time **gentle pulse animation** that plays on all icons simultaneously for the first 2 seconds after the section enters the viewport. The pulse briefly shows each icon at ~50% colour saturation and then fades back to grayscale, signalling "these are interactive".

This is subtler and doesn't require managing timers, but it only fires once and may be easy to miss.

### Antigravity Prompt for Approach B (if preferred instead)
```
In the orbit section:
1. Use an IntersectionObserver to detect when the orbit container enters the viewport.
2. On first intersection, add a CSS class `hint-pulse` to each orbit icon with a staggered delay (icon 0 = 0ms, icon 1 = 150ms, icon 2 = 300ms, etc.).
3. The `hint-pulse` keyframe animation: 0% grayscale(1) → 50% grayscale(0) saturate(1.2) → 100% grayscale(1), over 1.2s ease-in-out.
4. After the animation completes, remove the class. Only ever fire this once per page load.
```

---

## Which to go with?

**Approach A** (the cycling one) is recommended. It is more eye-catching, it keeps drawing attention even if the user scrolls back up, and the auto-pause-on-hover means it never fights with intentional interaction. The 3-second dwell per icon is a good rhythm — not too fast to feel frantic, not too slow to be missed.

**Approach B** is a good backup if Approach A feels too busy for the overall aesthetic.

---

## Notes for implementation
- The icons visible in the orbit are: TypeScript, React, Svelte/Droplet, Power BI/chart, sparkle/star, Singer logo, Wenglor logo, Thomas More logo, OTH Amberg-Weiden logo — 9 items total, so `shuffledOrder` is an array of indices 0–8.
- Keep the existing individual hover behaviour exactly as-is; Approach A only adds the auto-cycle on top of it.
- No changes needed to layout, sizing, orbital animation, or the glowing centre element.
