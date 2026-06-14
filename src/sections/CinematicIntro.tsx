import { useRef, useEffect, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import RotatingWords from '../components/RotatingWords';
import Reveal from '../components/Reveal';
import RevealWords from '../components/RevealWords';
import FloatingLogos from '../components/FloatingLogos';
import useScrollScrub from '../hooks/useScrollScrub';

/**
 * CinematicIntro — Image-driven scroll-reveal hero + About section.
 *
 * Structure:
 *   - Parent section wrapper: relative h-[300vh]
 *   - Sticky background wrapper (z-0): keeps the K0 background and K1-person images
 *     pinned in the viewport while zooming and fading out on scroll.
 *     K1-person foreground retains cursor parallax responsiveness.
 *   - Scrolling content overlay (z-10): wraps the Hero tagline screen (100vh)
 *     and the About section (100vh) in normal page flow. They scroll natively on top.
 */

const ROTATING_WORDS = [
  'Tech & Business',
  'Code & Strategy',
  'Data & Decisions',
  'Hardware & Insight',
  'Engineering & People',
];



export default function CinematicIntro() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();

  // ── Mobile detection ──
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(
      '(max-width: 767px), (max-width: 1023px) and (orientation: portrait)'
    ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(
      '(max-width: 767px), (max-width: 1023px) and (orientation: portrait)'
    );
    
    const updateMobileStatus = () => {
      setIsMobile(mq.matches);
    };

    // Initial run
    updateMobileStatus();

    mq.addEventListener('change', updateMobileStatus);
    window.addEventListener('resize', updateMobileStatus);
    window.addEventListener('orientationchange', updateMobileStatus);

    return () => {
      mq.removeEventListener('change', updateMobileStatus);
      window.removeEventListener('resize', updateMobileStatus);
      window.removeEventListener('orientationchange', updateMobileStatus);
    };
  }, []);

  const useFallback = isMobile;

  // ── Scroll progress ──
  const progress = useScrollScrub(sectionRef);
  const activeProgress = useFallback ? 0 : progress;

  // ── Image zoom: scale 1→1.15 across full 0–100% scroll ──
  const imageScale = prefersReduced ? 1 : 1 + activeProgress * 0.15;

  // ── Image fade: 1→0 over 80–100% ──
  const imageOpacity = useFallback ? 1 : 1 - Math.max(0, (activeProgress - 0.80) / 0.20);


  // ── About-readability scrim: 0→1 over 20–50% (right-side gradient for text legibility) ──
  const aboutScrimOpacity = Math.min(Math.max(0, (activeProgress - 0.20) / 0.30), 1);

  // ── Mouse parallax — K1-person foreground only, pre-scroll ──
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 30, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 30, damping: 25 });

  useEffect(() => {
    // FIX 3: Gate parallax to activeProgress < 0.5 — once scrim takes over, parallax is meaningless
    if (useFallback || prefersReduced || activeProgress > 0.5) {
      mouseX.set(0);
      mouseY.set(0);
      return;
    }
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * -24;   // ±12px opposite cursor
      const y = (e.clientY / window.innerHeight - 0.5) * -16;  // ±8px
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [activeProgress, useFallback, mouseX, mouseY, prefersReduced]);

  // About text content (plain strings for BlurWords)
  const aboutParagraph1 =
    "I'm a 5th-semester Digital Technology & Management student at OTH Amberg-Weiden, where I'm learning to operate at the intersection of engineering and strategy. My academic focus spans IoT and sensor technology, applied AI and computer vision in smart factories, BI and data modelling, and the business processes that translate technology into outcomes.";

  const aboutParagraph2 =
    "Before Germany, I worked at Singer Sri Lanka PLC as a Junior Executive in IT, where I learned that the difference between a good system and a useful one is whoever's sitting in front of it. That stuck with me, I now build with users in mind, whether it's a Power BI dashboard, a smart-camera quality station, or a freelance website.";

  const aboutLanguageLine = (
    <>
      <span className="text-accent">EN</span>
      <span className="text-fg-muted"> — C1</span>
      <span className="mx-2 text-fg-subtle">·</span>
      <span className="text-accent">DE</span>
      <span className="text-fg-muted"> — B2</span>
      <span className="mx-2 text-fg-subtle">·</span>
      <span className="text-accent">SI</span>
      <span className="text-fg-muted"> — Native</span>
    </>
  );

  // ════════════════════════════════════════════════════════════════
  // FALLBACK: mobile / reduced-motion — static single-column layout
  // ════════════════════════════════════════════════════════════════
  if (useFallback) {
    return (
      <section id="cinematic-intro" className="bg-bg">
        {/* Anchor for nav Home link */}
        <div id="hero" />
        {/* ── Hero (stacked: headshot → intro text) ── */}
        <div className="px-6 pt-8 pb-12 space-y-8">
          {/* Headshot — CSS-cropped from existing K1-person.png */}
          <div
            className="mx-auto rounded-2xl overflow-hidden bg-surface"
            style={{
              width: 'clamp(220px, 64vw, 320px)',
              height: 'clamp(220px, 64vw, 320px)',
            }}
          >
            <img
              src="/hero/K1-person.png"
              alt="Hirusha Dassanayaka"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 18%' }}
            />
          </div>

          {/* Intro text — stacked, left-aligned, mobile-tuned sizes */}
          <div className="space-y-4 text-left max-w-xl mx-auto">
            <p className="font-mono fluid-text-sm text-fg-muted">Hi there, this is</p>
            <h1 className="fluid-text-5xl leading-[1] font-display">
              Hirusha<br />Dassanayaka.
            </h1>
            <p className="pt-2 fluid-text-lg text-fg-muted">
              Building bridges between
            </p>
            <div className="font-display italic text-accent fluid-text-4xl leading-[1.05]">
              <RotatingWords words={ROTATING_WORDS} />
            </div>
          </div>
        </div>

        {/* ── About (stacked, stagger-revealed) ── */}
        <div id="about" className="px-6 pb-24">
          <div className="max-w-xl mx-auto">
            <Reveal>
              <div className="mb-8 space-y-3">
                <span className="font-mono fluid-text-sm tracking-wider text-accent">
                  (About)
                </span>
                <h2 className="font-display fluid-text-4xl leading-[1.05] text-fg">
                  Tech-fluent. Business-minded. Detail-obsessed.
                </h2>
              </div>
            </Reveal>

            <div className="fluid-space-y">
              <Reveal delay={0.08}>
                <p className="fluid-text-lg leading-relaxed text-fg">
                  {aboutParagraph1}
                </p>
              </Reveal>

              <Reveal delay={0.16}>
                <p className="fluid-text-lg leading-relaxed text-fg">
                  {aboutParagraph2}
                </p>
              </Reveal>

              <Reveal delay={0.24}>
                <p className="font-mono fluid-text-base tracking-wide">
                  {aboutLanguageLine}
                </p>
              </Reveal>
            </div>

            {/* Compact logo strip */}
            <div className="pt-10">
              <Reveal delay={0.32}>
                <FloatingLogos progress={0} compact />
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // DESKTOP: sticky background with natural relative scrolling overlays
  // ════════════════════════════════════════════════════════════════
  return (
    <section
      ref={sectionRef}
      id="cinematic-intro"
      className="relative min-h-[160dvh]"
    >
      {/* Anchor for nav Home link */}
      <div id="hero" className="absolute top-0" />
      {/* ── 1. STICKY BACKGROUND LAYER (z-0) ── */}
      <div
        className="sticky top-0 h-dvh w-full overflow-hidden z-0 pointer-events-none"
        style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
      >
        {/* K0 background */}
        <div className="absolute inset-0">
          <motion.img
            src="/hero/K0.jpg"
            alt=""
            className="h-full w-full object-cover object-[35%_center] md:object-[40%_center] lg:object-[center_center]"
            style={{
              scale: imageScale,
              opacity: imageOpacity,
              willChange: imageOpacity > 0.02 ? 'transform, opacity' : 'auto',
            }}
          />
        </div>

        {/* Scrim gradient */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/40 md:from-black/55 lg:from-black/65 xl:from-black/75 via-black/20 md:via-black/28 lg:via-black/34 xl:via-black/40 to-transparent to-65%" />

        {/* K1-person foreground ( parallax + scale + fade ) */}
        <motion.div
          className="absolute inset-0 z-[3] pointer-events-none"
          style={{
            x: springX,
            y: springY,
            opacity: imageOpacity,
            willChange: imageOpacity > 0.02 ? 'transform, opacity' : 'auto',
          }}
        >
          <motion.img
            src="/hero/K1-person.png"
            alt="Hirusha Dassanayaka at his workspace"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[95%] w-auto max-w-none object-contain"
            style={{
              scale: imageScale,
              willChange: 'transform',
            }}
          />
        </motion.div>

        {/* FIX 3: Removed solid black darkening scrim to allow 3D background to shine through as images fade */}

        {/* About-readability scrim (right-side gradient for text legibility) */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-l from-black/90 via-black/60 to-transparent to-55%"
          style={{
            opacity: aboutScrimOpacity * imageOpacity,
            willChange: 'opacity',
          }}
        />
      </div>

      {/* ── 1.5 INTRO TEXT OVERLAY (z-30) ── */}
      {/* visible at t=0, scrolls away naturally with the page */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none flex min-h-dvh flex-col justify-between px-6 py-6 md:px-16 md:py-8">
        {/* Socials removed per request */}
        <div className="h-8" />

        {/* Tagline block */}
        <div className="pt-[20dvh] md:pt-[15dvh] pointer-events-auto">
          <div className="max-w-[85vw] space-y-4 md:space-y-5 md:max-w-4xl">
            <p className="font-mono text-base text-fg-muted md:text-lg">
              Hi there, this is
            </p>

            <h1 className="font-display leading-[1]" style={{ fontSize: 'clamp(2.25rem, 7vw, 8rem)' }}>
              Hirusha<br />Dassanayaka.
            </h1>

            <p className="pt-1 fluid-text-xl text-fg-muted">
              Building bridges between
            </p>

            <div className="font-display italic text-accent leading-[1.05]" style={{ fontSize: 'clamp(1.75rem, 5.5vw, 6rem)' }}>
              <RotatingWords words={ROTATING_WORDS} />
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Scroll cue */}
        <div className="flex items-center gap-2 font-mono text-sm text-fg-subtle pointer-events-auto">
          <span>(Scroll down)</span>
          <motion.span
            animate={prefersReduced ? {} : { y: [0, 3, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <ArrowDown className="h-4 w-4" />
          </motion.span>
        </div>
      </div>

      {/* ── 2. SCROLLING CONTENT LAYER (z-10) ── */}
      <div className="relative z-10 w-full pointer-events-none">
        {/* ABOUT VIEWPORT */}
        <div
          id="about"
          className="relative min-h-dvh w-full py-24 md:py-32 pointer-events-auto"
        >
          {/* Left half: FloatingLogos floats in its own absolute space so it doesn't
              compete with the text block for layout. On mobile it disappears and the
              compact logo strip inside the text block handles it. */}
          <div className="absolute inset-y-0 left-0 w-1/2 hidden md:flex items-start pointer-events-none px-6 md:px-12 pt-[152px]">
            <div className="relative w-full h-[340px] lg:h-[440px] xl:h-[600px]">
              <FloatingLogos progress={0.5} />
            </div>
          </div>

          {/* Right half: About text block — exact Tailwind classes from Gemini spec.
              ml-auto pushes the block to the right; the responsive widths progressively
              narrow it as the viewport widens (full → half → 5/12).
              Text inside is left-aligned. */}
          <div className="ml-auto w-full md:w-1/2 lg:w-5/12 text-left pr-6 md:pr-12 pl-6 md:pl-8 lg:pl-0 space-y-8">
            <div className="mb-8 md:mb-12 space-y-3 md:space-y-4">
              <span className="font-mono fluid-text-base tracking-wider text-accent">
                (About)
              </span>
              <h2 className="font-display fluid-text-5xl leading-[1.1] text-fg">
                Tech-fluent. Business-minded. Detail-obsessed.
              </h2>
            </div>

            <RevealWords
              texts={[
                {
                  text: aboutParagraph1,
                  className: 'fluid-text-xl leading-relaxed text-white',
                },
                {
                  text: aboutParagraph2,
                  className: 'fluid-text-xl leading-relaxed text-white',
                },
              ]}
              containerClassName="fluid-space-y"
            />
            <p className="font-mono fluid-text-lg tracking-wide mt-6">
              {aboutLanguageLine}
            </p>

            {/* Mobile logos list (md:hidden) */}
            <div className="block md:hidden pt-8">
              <Reveal delay={0.32}>
                <FloatingLogos progress={0} compact />
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
