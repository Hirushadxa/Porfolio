import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LogoItem {
  id: string;
  src: string;
  label: string;
  url?: string;
  ring: 'outer' | 'middle' | 'inner';
  angle: number;
  color: string; // Glow color on hover
}

const ORBITAL_LOGOS: LogoItem[] = [
  // Outer Ring (Dominant, Linkable)
  { id: 'wenglor',     src: '/logos/Wenglor_sensoric_logo.jpg',         label: 'Wenglor',               url: 'https://www.wenglor.com',       ring: 'outer',  angle: 0,   color: '#f5b84e' },
  { id: 'oth',         src: '/logos/OTH_AW_Logo.jpg',                  label: 'OTH Amberg-Weiden',     url: 'https://www.oth-aw.de',         ring: 'outer',  angle: 90,  color: '#f5b84e' },
  { id: 'thomasmore',  src: '/logos/Logo_Thomas_More.png',             label: 'Thomas More',           url: 'https://www.thomasmore.be',     ring: 'outer',  angle: 180, color: '#f5b84e' },
  { id: 'singer',      src: '/logos/Singer_Sri_Lanka_logo.jpg',        label: 'Singer Sri Lanka PLC',  url: 'https://www.singersl.com',      ring: 'outer',  angle: 270, color: '#f5b84e' },

  // Middle Ring (Key Skill)
  { id: 'typescript',  src: '/logos/Typescript_logo_2020.svg',         label: 'TypeScript',            ring: 'middle', angle: 45,  color: '#3178c6' },
  { id: 'react',       src: '/logos/React-icon.svg',                   label: 'React',                 ring: 'middle', angle: 225, color: '#61dafb' },

  // Inner Ring (Other abstract icons)
  { id: 'firebase',    src: '/logos/Firebase_Logo_(No_wordmark)_(2024-).svg', label: 'Firebase',     ring: 'inner',  angle: 30,  color: '#f58220' },
  { id: 'gemini',      src: '/logos/Google_Gemini_icon_2025.svg',             label: 'Gemini',       ring: 'inner',  angle: 120, color: '#8e75ff' },
  { id: 'powerbi',     src: '/logos/New_Power_BI_Logo.svg',                   label: 'Power BI',     ring: 'inner',  angle: 210, color: '#f2c811' },
  { id: 'vite',        src: '/logos/Vitejs-logo.svg',                         label: 'Vite',         ring: 'inner',  angle: 300, color: '#bd34fe' },
];

const hexToRgb = (hex: string): string => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '255, 255, 255';
};

interface FloatingLogosProps {
  progress: number;
  /** Compact horizontal strip for mobile fallback */
  compact?: boolean;
}

export default function FloatingLogos({ progress, compact = false }: FloatingLogosProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredLogo, setHoveredLogo] = useState<string | null>(null);

  const [isInView, setIsInView] = useState(false);
  const [hasTriggeredIntro, setHasTriggeredIntro] = useState(false);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  const replayIntro = () => {
    if (isIntroPlaying) return;
    setReplayKey((prev) => prev + 1);
    setIsIntroPlaying(true);
  };

  useEffect(() => {
    if (compact) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.9 }
    );

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [compact]);

  useEffect(() => {
    if (isInView && !hasTriggeredIntro) {
      const raf = requestAnimationFrame(() => {
        setHasTriggeredIntro(true);
        setIsIntroPlaying(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isInView, hasTriggeredIntro]);

  useEffect(() => {
    if (isIntroPlaying) {
      const timer = setTimeout(() => {
        setIsIntroPlaying(false);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [isIntroPlaying]);

  // Scroll-driven opacity: invisible at 0%, fades in 25%→40%, visible through 95%
  const logoGroupOpacity = compact
    ? 1
    : Math.min(
        Math.max(0, (progress - 0.25) / 0.15),  // fade in 25%→40%
        1 - Math.max(0, (progress - 0.95) / 0.05) // fade out with handoff
      );

  // Proximity mouse tracker for dynamic color/glow/scale pull
  useEffect(() => {
    if (compact || typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    const gravityRadius = 180; // gravity radius in pixels

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (isIntroPlaying) return;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Skip calculations if the container is scrolled out of the viewport
        const containerRect = container.getBoundingClientRect();
        if (containerRect.top > window.innerHeight || containerRect.bottom < 0) {
          return;
        }

        const items = container.querySelectorAll('[data-logo-id]');
        const isAnyHovered = hoveredLogo !== null;

        items.forEach((item) => {
          const el = item as HTMLElement;
          const logoId = el.getAttribute('data-logo-id');
          const glowColor = el.getAttribute('data-glow-color') || '#ffffff';
          const isHovered = hoveredLogo === logoId;

          let f = 0;
          if (isAnyHovered) {
            f = isHovered ? 1 : 0;
          } else {
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dist = Math.sqrt((mouseX - cx) ** 2 + (mouseY - cy) ** 2);

            if (dist < gravityRadius) {
              f = 1 - dist / gravityRadius;
            }
          }

          // Directly apply dynamic proximity styles
          el.style.borderColor = f > 0.01 ? `rgba(${hexToRgb(glowColor)}, ${f * 0.5})` : 'transparent';
          el.style.boxShadow = f > 0.01 ? `0 0 ${f * 15}px ${glowColor}${Math.round(f * 63).toString(16).padStart(2, '0')}` : 'none';
          el.style.background = f > 0.01 ? `rgba(10, 10, 15, ${f * 0.85})` : 'transparent';
          el.style.transform = `scale(${1 + f * 0.15}) translateZ(0)`;

          const img = el.querySelector('.logo-img') as HTMLImageElement | null;
          if (img) {
            img.style.filter = `grayscale(${(100 - f * 100).toFixed(1)}%) opacity(${(50 + f * 50).toFixed(1)}%)`;
          }
        });
      });
    };

    const handleMouseLeave = () => {
      if (isIntroPlaying) return;
      cancelAnimationFrame(rafId);
      const items = container.querySelectorAll('[data-logo-id]');
      items.forEach((item) => {
        const el = item as HTMLElement;
        el.style.borderColor = 'transparent';
        el.style.boxShadow = 'none';
        el.style.background = 'transparent';
        el.style.transform = 'scale(1) translateZ(0)';

        const img = el.querySelector('.logo-img') as HTMLImageElement | null;
        if (img) {
          img.style.filter = 'grayscale(100%) opacity(50%)';
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [compact, hoveredLogo, isIntroPlaying]);

  // ── Compact mobile strip ──
  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-center fluid-gap-items py-8 opacity-65">
        {ORBITAL_LOGOS.map((logo) => {
          const isLinkable = !!logo.url;
          const content = <LogoImage logo={logo} sizeVar="clamp(24px, 5vw, 32px)" isCurrentHovered={false} isIntroPlaying={false} />;
          
          if (isLinkable) {
            return (
              <a 
                key={logo.id} 
                href={logo.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="transition-all hover:scale-105 inline-block"
              >
                {content}
              </a>
            );
          }
          return (
            <div key={logo.id} className="transition-all">
              {content}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Desktop scattered layout ──
  return (
    <div
      ref={containerRef}
      className={`relative w-[340px] h-[340px] lg:w-[440px] lg:h-[440px] xl:w-[600px] xl:h-[600px] mx-auto flex items-center justify-center orbit-parent ${
        isIntroPlaying ? 'intro-active' : ''
      }`}
      style={{ opacity: logoGroupOpacity }}
    >
      {/* Constellation Wake-Up Pulse */}
      {isIntroPlaying && (
        <div key={replayKey} className="constellation-pulse" />
      )}

      {/* Central Pulsing Abstract Core */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-12 h-12 lg:w-16 lg:h-16 xl:w-20 xl:h-20 rounded-full bg-accent/10 blur-md absolute animate-pulse" />
        <div className="w-6 h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 rounded-full bg-accent/20 animate-ping absolute" />
        <button
          type="button"
          onClick={replayIntro}
          aria-label="Replay animation"
          title="Replay"
          className="w-3.5 h-3.5 lg:w-4 xl:w-5 rounded-full bg-accent absolute shadow-[0_0_15px_rgba(245,184,78,0.7)] pointer-events-auto cursor-pointer transition-transform hover:scale-110"
          style={{ zIndex: 5 }}
        />
        
        {/* Concentric tech radar dashes */}
        <svg className="w-20 h-20 lg:w-28 lg:h-28 xl:w-32 xl:h-32 animate-orbit-cw absolute opacity-20" viewBox="0 0 100 100" style={{ '--orbit-duration': '15s' } as React.CSSProperties}>
          <circle cx="50" cy="50" r="40" stroke="#f5b84e" strokeWidth="1.5" strokeDasharray="5 5" fill="none" />
        </svg>
        <svg className="w-28 h-28 lg:w-38 lg:h-38 xl:w-44 xl:h-44 animate-orbit-ccw absolute opacity-10" viewBox="0 0 100 100" style={{ '--orbit-duration': '25s' } as React.CSSProperties}>
          <circle cx="50" cy="50" r="45" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 8" fill="none" />
        </svg>
      </div>

      {/* Orbit Track Lines */}
      <div className="orbit-track orbit-track-outer" />
      <div className="orbit-track orbit-track-middle" />
      <div className="orbit-track orbit-track-inner" />

      {/* Outer Ring: 4 Linkable Logos (CW) */}
      <div 
        className="absolute inset-0 animate-orbit-cw pointer-events-none" 
        style={{ '--orbit-duration': '60s' } as React.CSSProperties}
      >
        {ORBITAL_LOGOS.filter(l => l.ring === 'outer').map(logo => (
          <OrbitalItem 
            key={logo.id} 
            logo={logo} 
            radius="var(--radius-outer)" 
            antiDuration="60s" 
            antiDirection="ccw"
            hoveredLogo={hoveredLogo}
            setHoveredLogo={setHoveredLogo}
            isIntroPlaying={isIntroPlaying}
          />
        ))}
      </div>

      {/* Middle Ring: Key Skills (CCW) */}
      <div 
        className="absolute inset-0 animate-orbit-ccw pointer-events-none" 
        style={{ '--orbit-duration': '45s' } as React.CSSProperties}
      >
        {ORBITAL_LOGOS.filter(l => l.ring === 'middle').map(logo => (
          <OrbitalItem 
            key={logo.id} 
            logo={logo} 
            radius="var(--radius-middle)" 
            antiDuration="45s" 
            antiDirection="cw"
            hoveredLogo={hoveredLogo}
            setHoveredLogo={setHoveredLogo}
            isIntroPlaying={isIntroPlaying}
          />
        ))}
      </div>

      {/* Inner Ring: Other Skills (CW) */}
      <div 
        className="absolute inset-0 animate-orbit-cw pointer-events-none" 
        style={{ '--orbit-duration': '30s' } as React.CSSProperties}
      >
        {ORBITAL_LOGOS.filter(l => l.ring === 'inner').map(logo => (
          <OrbitalItem 
            key={logo.id} 
            logo={logo} 
            radius="var(--radius-inner)" 
            antiDuration="30s" 
            antiDirection="ccw"
            hoveredLogo={hoveredLogo}
            setHoveredLogo={setHoveredLogo}
            isIntroPlaying={isIntroPlaying}
          />
        ))}
      </div>
    </div>
  );
}

interface OrbitalItemProps {
  logo: LogoItem;
  radius: string; // CSS custom property e.g. "var(--radius-outer)"
  antiDuration: string;
  antiDirection: 'cw' | 'ccw';
  hoveredLogo: string | null;
  setHoveredLogo: (id: string | null) => void;
  isIntroPlaying: boolean;
}

function OrbitalItem({
  logo,
  radius,
  antiDuration,
  antiDirection,
  hoveredLogo,
  setHoveredLogo,
  isIntroPlaying,
}: OrbitalItemProps) {
  const isAnyHovered = hoveredLogo !== null;
  const isCurrentHovered = hoveredLogo === logo.id;

  const handleMouseEnter = () => setHoveredLogo(logo.id);
  const handleMouseLeave = () => setHoveredLogo(null);

  // Position is responsive using CSS Custom Properties
  const transformStyle = {
    left: '50%',
    top: '50%',
    transform: `translate(-50%, -50%) rotate(${logo.angle}deg) translate(${radius}) rotate(${-logo.angle}deg)`,
    zIndex: isCurrentHovered ? 50 : 10,
  };

  const isLinkable = !!logo.url;
  const logoHeightVar = `var(--logo-height-${logo.ring})`;
  const paddingVar = logo.ring === 'outer' ? 'var(--orbit-padding-outer)' : 'var(--orbit-padding-other)';

  const handleClick = () => {
    if (isLinkable && logo.url) {
      window.open(logo.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className="absolute pointer-events-auto transition-all duration-500 ease-out"
      style={transformStyle}
    >
      <div 
        className={`animate-orbit-${antiDirection}`}
        style={{ '--orbit-duration': antiDuration } as React.CSSProperties}
      >
        <div
          data-logo-id={logo.id}
          data-glow-color={logo.color}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className={`relative flex items-center justify-center rounded-lg border transition-all duration-300 logo-btn ${
            isLinkable ? 'cursor-pointer' : 'cursor-default'
          } ${
            isAnyHovered && !isCurrentHovered ? 'blur-[1.2px] opacity-15 scale-90' : 'blur-0 opacity-100'
          }`}
          style={{
            padding: paddingVar,
            willChange: 'transform, opacity, filter',
            ...(isIntroPlaying ? {} : {
              borderColor: isCurrentHovered ? logo.color : 'transparent',
              boxShadow: isCurrentHovered ? `0 0 15px ${logo.color}3f` : 'none',
              background: isCurrentHovered ? 'rgba(10, 10, 15, 0.85)' : 'transparent',
              transform: isCurrentHovered ? 'scale(1.15) translateZ(0)' : 'scale(1) translateZ(0)',
            }),
            '--glow-color': logo.color,
            '--glow-rgb': hexToRgb(logo.color),
            '--intro-delay': logo.ring === 'inner' ? '0.3s' : logo.ring === 'middle' ? '0.7s' : '1.1s',
          } as React.CSSProperties}
        >
          {/* Logo Image */}
          <LogoImage 
            logo={logo} 
            sizeVar={logoHeightVar} 
            isCurrentHovered={isCurrentHovered} 
            isIntroPlaying={isIntroPlaying} 
          />

          {/* Link Hint Overlay */}
          <AnimatePresence>
            {isLinkable && isCurrentHovered && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute -top-1.5 -right-1.5 bg-accent text-neutral-950 rounded-full p-0.5 shadow-md flex items-center justify-center border border-accent/30 z-50"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Skill Tooltip */}
          <AnimatePresence>
            {!isLinkable && isCurrentHovered && (
              <motion.div 
                initial={{ opacity: 0, y: 6, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 6, x: '-50%' }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full left-1/2 mb-2.5 px-2 py-1 rounded bg-neutral-900/95 border border-white/10 text-white text-[11px] font-mono whitespace-nowrap shadow-xl pointer-events-none z-50"
                style={{
                  boxShadow: `0 4px 12px rgba(0, 0, 0, 0.5), 0 0 8px ${logo.color}22`
                }}
              >
                {logo.label}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function LogoImage({ 
  logo, 
  sizeVar, 
  isCurrentHovered, 
  isIntroPlaying 
}: { 
  logo: LogoItem; 
  sizeVar: string; 
  isCurrentHovered: boolean; 
  isIntroPlaying: boolean;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <span className="font-mono text-[10px] text-fg-subtle/50 whitespace-nowrap select-none">
        {logo.label}
      </span>
    );
  }

  // Exact filters requested by user:
  // Resting state: grayscale(100%) opacity(50%)
  // Hover state: grayscale(0%) opacity(100%)
  // No inverts or blend modes so original brand colors are fully rendered.
  const filterStyle = isIntroPlaying ? {} : {
    filter: isCurrentHovered ? "grayscale(0%) opacity(100%)" : "grayscale(100%) opacity(50%)",
    willChange: 'filter, opacity',
    transform: 'translateZ(0)',
  };

  return (
    <img
      src={logo.src}
      alt={logo.label}
      style={{ 
        height: sizeVar, 
        width: 'auto',
        ...filterStyle
      }}
      className="logo-img select-none object-contain"
      draggable={false}
      onError={() => setHasError(true)}
    />
  );
}
