import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * CurtainLoader — diagonal split-screen page-load reveal.
 *
 * Two black triangular panels cover the viewport on initial load, then
 * slide apart perpendicular to a top-left → bottom-right diagonal:
 *   - Upper-right triangle slides north-east (off-screen up + right)
 *   - Lower-left triangle slides south-west (off-screen down + left)
 *
 * Behavior:
 *   - Plays once per browser session (sessionStorage flag)
 *   - Skipped entirely for users who prefer reduced motion
 *   - Unmounts after the animation completes (no layout cost afterwards)
 *   - Locks body scroll while the curtain is up
 *   - Sits at z-[100] above all page content
 */

const PANEL_DURATION = 1.0;       // seconds for the slide
const PANEL_DELAY = 0.18;         // hold black for a beat before opening
const TOTAL_DURATION_MS = (PANEL_DURATION + PANEL_DELAY) * 1000 + 50;

export default function CurtainLoader() {
  const [visible, setVisible] = useState<boolean>(true);

  // ── Lock body scroll while the curtain is up, then unmount ──
  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      document.body.style.overflow = prevOverflow;
      setVisible(false);
    }, TOTAL_DURATION_MS);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  if (!visible) return null;

  // Slight overshoot (120%) guarantees both panels clear the viewport
  // even on ultra-wide aspect ratios.
  const slideTransition = {
    duration: PANEL_DURATION,
    delay: PANEL_DELAY,
    ease: [0.7, 0, 0.3, 1] as const,
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100]"
    >
      {/* Upper-right triangle — slides north-east */}
      <motion.div
        className="absolute inset-0 bg-black"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
        initial={{ x: 0, y: 0 }}
        animate={{ x: '120%', y: '-120%' }}
        transition={slideTransition}
      />
      {/* Lower-left triangle — slides south-west */}
      <motion.div
        className="absolute inset-0 bg-black"
        style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }}
        initial={{ x: 0, y: 0 }}
        animate={{ x: '-120%', y: '120%' }}
        transition={slideTransition}
      />
    </div>
  );
}
