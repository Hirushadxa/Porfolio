import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import Container from '../components/Container';
import Reveal from '../components/Reveal';
import RotatingWords from '../components/RotatingWords';

const ROTATING_WORDS = [
  'Tech & Business',
  'Code & Strategy',
  'Data & Decisions',
  'Hardware & Insight',
  'Engineering & People',
];

export default function Hero() {
  const prefersReduced = useReducedMotion();

  return (
    <section
      id="hero"
      className="flex min-h-screen flex-col justify-between px-0 py-8 md:py-12"
    >
      {/* ── Top: location caption ── */}
      <Container>
        <p className="font-mono text-xs tracking-wide text-fg-subtle md:text-sm">
          Münchener Straße 73, 85051 Ingolstadt — (Available for internships)
        </p>
      </Container>

      {/* ── Middle: eyebrow + headline + sub-line ── */}
      <Container>
        <div className="space-y-6">
          <Reveal delay={0.1}>
            <p className="font-mono text-sm text-fg-muted md:text-base">
              Hi there, this is
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <h1 className="text-display">
              Hirusha Dassanayaka.
              <br />
              Building bridges between
              <br />
              <RotatingWords words={ROTATING_WORDS} />
            </h1>
          </Reveal>

          <Reveal delay={0.35}>
            <p className="max-w-xl text-lg leading-relaxed text-fg-muted md:text-xl">
              Digital Technology &amp; Management student blending hands-on
              engineering with business analysis.
            </p>
          </Reveal>
        </div>
      </Container>

      {/* ── Bottom: scroll cue ── */}
      <Container>
        <Reveal delay={0.5}>
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-xs text-fg-subtle">
              (scroll down)
            </span>
            <motion.span
              animate={
                prefersReduced ? {} : { y: [0, 4, 0] }
              }
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <ArrowDown className="h-4 w-4 text-fg-subtle" />
            </motion.span>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
