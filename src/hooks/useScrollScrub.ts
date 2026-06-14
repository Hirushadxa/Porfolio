import { useEffect, useState, type RefObject } from 'react';

/**
 * Returns a 0..1 scroll progress value that represents how far the user has
 * scrolled through a target element's total scrollable height (element height
 * minus one viewport height).
 *
 * - 0 → the element's top is at the viewport top (sticky stage just pinned)
 * - 1 → the element's bottom has reached the viewport bottom (stage about to unpin)
 *
 * Uses rAF-throttled scroll events with passive listeners for smooth perf.
 */
export default function useScrollScrub(ref: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId: number;
    let elementTop = 0;
    let elementHeight = 0;

    const updateMeasurements = () => {
      if (!ref.current) return;
      
      // Calculate absolute page top offset by walking up the offsetParent chain
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
        // Only commit a re-render when progress changes meaningfully (~0.5%).
        // Skips ~200 React reconciliations per full-section scroll.
        setProgress((prev) => (Math.abs(prev - p) > 0.005 ? p : prev));
      });
    };

    // Initialize measurements
    updateMeasurements();
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateMeasurements, { passive: true });
    window.addEventListener('load', updateMeasurements, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateMeasurements);
      window.removeEventListener('load', updateMeasurements);
    };
  }, [ref]);

  return progress;
}
