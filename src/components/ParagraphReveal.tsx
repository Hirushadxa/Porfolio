import type { ReactNode } from 'react';

/**
 * Scroll-driven paragraph and line-by-line reveal.
 *
 * Renders children or segments with computed opacity, vertical translation,
 * and blur driven directly by scroll progress — no CSS transitions, no
 * intersection observers.
 */

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

interface ParagraphRevealProps {
  children?: ReactNode;
  /** Scroll progress at which the reveal begins (0..1) */
  start: number;
  /** Scroll progress at which the reveal completes; defaults to start + 0.15 */
  end?: number;
  /** Current scroll progress from parent (0..1) */
  progress: number;
  className?: string;
  /** Optional array of segments to reveal sequentially (line-by-line) */
  segments?: ReactNode[];
}

export default function ParagraphReveal({
  children,
  start,
  end = start + 0.15,
  progress,
  className = '',
  segments,
}: ParagraphRevealProps) {
  const totalRange = end - start;

  if (segments && segments.length > 0) {
    const N = segments.length;
    const segmentDuration = totalRange * 0.6;
    const staggerAmount = N > 1 ? (totalRange * 0.4) / (N - 1) : 0;

    return (
      <div className={className}>
        {segments.map((seg, i) => {
          const segStart = start + i * staggerAmount;
          const segEnd = segStart + segmentDuration;
          const local = clamp((progress - segStart) / (segEnd - segStart), 0, 1);
          
          const opacity = 0.15 + local * 0.85;  // 0.15 → 1.0
          const translateY = (1 - local) * 24;  // 24px → 0px
          const blur = (1 - local) * 4;          // 4px → 0px

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateY(${translateY}px)`,
                filter: `blur(${blur}px)`,
                transition: 'none',
                willChange: 'opacity, transform, filter',
              }}
              className="mb-2 last:mb-0"
            >
              {seg}
            </div>
          );
        })}
      </div>
    );
  }

  const local = clamp((progress - start) / (end - start), 0, 1);
  const opacity = 0.25 + local * 0.75;  // 0.25 → 1.0
  const blur = (1 - local) * 6;          // 6px → 0px
  const translateY = (1 - local) * 20;   // 20px → 0px

  return (
    <p
      className={className}
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        filter: `blur(${blur}px)`,
        transition: 'none',
        willChange: 'opacity, transform, filter',
      }}
    >
      {children}
    </p>
  );
}
