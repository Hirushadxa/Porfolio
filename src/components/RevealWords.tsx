import { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
} from 'framer-motion';

/* ───────────────────────────────────────────────────────────────────
 * RevealWords — Scroll-Driven Word-by-Word Text Reveal with Motion Blur
 *
 * Accepts one or more paragraphs.  A SINGLE useScroll() on the
 * wrapper tracks scroll progress; every word across ALL paragraphs
 * is assigned a sequential slice of that 0→1 progress with 40 %
 * overlap between adjacent words — producing the continuous sweep.
 *
 * This guarantees the second paragraph only begins revealing after
 * the first one is mostly done.
 * ─────────────────────────────────────────────────────────────────── */

/* ── public types ────────────────────────────────────────────────── */

interface ParagraphDef {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

interface RevealWordsProps {
  /** Pass a single string OR an array of paragraph definitions. */
  texts: ParagraphDef[];
  /** className for the outer wrapper div. */
  containerClassName?: string;
}

/* ── per-word span ───────────────────────────────────────────────── */

interface WordProps {
  word: string;
  progress: import('framer-motion').MotionValue<number>;
  rangeStart: number;
  rangeEnd: number;
}

function Word({ word, progress, rangeStart, rangeEnd, prefersReduced }: WordProps & { prefersReduced: boolean }) {
  const opacity = useTransform(progress, (v) => {
    if (v >= rangeEnd) return 1;
    if (v <= rangeStart) return 0.22;
    const t = (v - rangeStart) / (rangeEnd - rangeStart);
    return 0.22 + t * 0.78;
  });

  const blurPx = useTransform(progress, (v) => {
    if (prefersReduced) return 0;
    
    const blurPeak = 4; // Peak blur during transition in px
    const preRevealWindow = 0.05; // Scroll progress window before rangeStart to ramp up blur

    if (v >= rangeEnd) return 0;
    if (v >= rangeStart) {
      const t = (v - rangeStart) / (rangeEnd - rangeStart);
      return (1 - t) * blurPeak;
    }
    const windowStart = Math.max(0, rangeStart - preRevealWindow);
    const windowDelta = rangeStart - windowStart;
    if (windowDelta > 0 && v >= windowStart) {
      const t = (v - windowStart) / windowDelta;
      return t * blurPeak;
    }
    return 0;
  });

  const filter  = useMotionTemplate`blur(${blurPx}px)`;

  return (
    <motion.span
      style={{
        opacity,
        filter,
        willChange: 'opacity, filter',
        transform: 'translateZ(0)',
      }}
      className="inline-block"
    >
      {word}
      <span>&nbsp;</span>
    </motion.span>
  );
}

/* ── main component ──────────────────────────────────────────────── */

export default function RevealWords({
  texts,
  containerClassName = '',
}: RevealWordsProps) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Single scroll tracker across the entire text block.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.8', 'end 0.55'],
  });

  // Split every paragraph into words up-front.
  const paragraphs = texts.map((p) => ({
    ...p,
    words: p.text.split(/\s+/).filter(Boolean),
  }));

  const totalWords = paragraphs.reduce((sum, p) => sum + p.words.length, 0);

  // We removed the static early return for prefersReduced.
  // Instead, we pass it down to Word to disable the blur filter, 
  // but keep the scroll-based opacity fade!

  /* ── compute per-word ranges ──
   * 40 % overlap between adjacent slices so 2–3 words
   * are always mid-transition → the "sweep" illusion.          */
  const overlapFactor = 0.85;
  const wordSpan = 1 / (totalWords * (1 - overlapFactor) + overlapFactor);
  const step     = wordSpan * (1 - overlapFactor);

  let globalIndex = 0;

  return (
    <div ref={containerRef} className={containerClassName}>
      {paragraphs.map((p, pi) => (
        <p key={pi} className={p.className ?? ''} style={p.style}>
          {p.words.map((word, wi) => {
            const idx = globalIndex++;
            const rangeStart = Math.max(0, idx * step);
            const rangeEnd   = Math.min(1, rangeStart + wordSpan);
            return (
              <Word
                key={`${pi}-${word}-${wi}`}
                word={word}
                progress={scrollYProgress}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                prefersReduced={!!prefersReduced}
              />
            );
          })}
        </p>
      ))}
    </div>
  );
}
