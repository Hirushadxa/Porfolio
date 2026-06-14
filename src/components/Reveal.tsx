import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Delay in seconds before this element animates in */
  delay?: number;
  /** Animation width — 'full' triggers once when any part enters viewport */
  width?: 'fit' | 'full';
  className?: string;
}

/**
 * Scroll-reveal wrapper using Framer Motion.
 *
 * Spec behavior:
 * - Elements fade up (translateY 20px → 0, opacity 0 → 1) when entering viewport.
 * - Stagger children by passing incremental `delay` values (80ms = 0.08s each).
 * - prefers-reduced-motion: disables transforms, keeps opacity transition only.
 */
export default function Reveal({
  children,
  delay = 0,
  width = 'full',
  className = '',
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const prefersReduced = useReducedMotion();

  return (
    <div
      ref={ref}
      className={`${width === 'full' ? 'w-full' : 'w-fit'} ${className}`}
    >
      <motion.div
        initial={{
          opacity: 0,
          y: prefersReduced ? 0 : 20,
        }}
        animate={
          isInView
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: prefersReduced ? 0 : 20 }
        }
        transition={{
          duration: prefersReduced ? 0.4 : 0.6,
          delay,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
