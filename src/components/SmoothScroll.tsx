import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

/* ───────────────────────────────────────────────────────────────────
 * SmoothScroll — Global inertial/momentum scrolling via Lenis.
 *
 * Lenis intercepts native wheel/touch scroll events and applies a
 * soft easing curve with momentum decay.  Because it drives the
 * browser's real `window.scrollTo`, native layout features like
 * `position: sticky` and Framer Motion's `useScroll` continue to
 * work without any extra wiring.
 *
 * Usage: wrap the app root once —
 *   <SmoothScroll><App /></SmoothScroll>
 * ─────────────────────────────────────────────────────────────────── */

interface SmoothScrollProps {
  children: React.ReactNode;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // On touch-primary devices, native momentum is already smoother than
    // anything Lenis can interpolate — opt out entirely.
    const isTouchPrimary =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    if (isTouchPrimary || (typeof window !== 'undefined' && (window as any).__E2E__)) return;

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

    // Intercept in-page anchor clicks to animate them smoothly via Lenis
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (href && href.startsWith('#')) {
        const targetElement = document.querySelector(href);
        if (targetElement instanceof HTMLElement) {
          e.preventDefault();
          lenis.scrollTo(targetElement, {
            offset: -64, // offset by 64px to respect the sticky header height (4rem)
          });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('click', handleAnchorClick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
