import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface RotatingWordsProps {
  /** Array of words to cycle through */
  words: string[];
  /** Interval in ms between word changes (spec: 2500) */
  interval?: number;
  className?: string;
}

/**
 * Cycling word animation for the hero headline.
 *
 * Spec: 2.5s interval, 400ms crossfade.
 * Words display in italic Instrument Serif, accent color.
 * Respects prefers-reduced-motion (gentle 200ms crossfade, no transforms).
 *
 * Layout-shift prevention: renders the longest word invisibly to reserve
 * horizontal space, so shorter words don't cause the line to reflow.
 */
export default function RotatingWords({
  words,
  interval = 2500,
  className = '',
}: RotatingWordsProps) {
  const [index, setIndex] = useState(0);
  const prefersReduced = useReducedMotion();

  const longestWord = useMemo(
    () => words.reduce((a, b) => (a.length >= b.length ? a : b), ''),
    [words],
  );

  const next = useCallback(() => {
    setIndex((prev) => (prev + 1) % words.length);
  }, [words.length]);

  useEffect(() => {
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [next, interval]);

  return (
    <span className={`relative inline-grid ${className}`}>
      {/* Invisible spacer — reserves width of the longest word */}
      <span
        className="pointer-events-none invisible col-start-1 row-start-1 font-display italic"
        aria-hidden="true"
      >
        {longestWord}
      </span>

      {/* Visible animated word — stacks on top of spacer */}
      <span className="col-start-1 row-start-1">
        <AnimatePresence mode="wait">
          <motion.span
            key={words[index]}
            className="inline-block font-display italic text-accent"
            initial={{ opacity: 0, y: prefersReduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReduced ? 0 : -8 }}
            transition={{
              duration: prefersReduced ? 0.2 : 0.4,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
