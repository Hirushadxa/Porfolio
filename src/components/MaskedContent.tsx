import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface MaskedContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * A wrapper that applies a viewport-fixed fade-out mask to its children.
 * This ensures that scrolling text disappears before overlapping the Nav bar,
 * without relying on buggy browser features like mask-attachment: fixed or mix-blend-mode.
 */
export default function MaskedContent({ children, className = '' }: MaskedContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [absoluteY, setAbsoluteY] = useState(0);
  const { scrollY } = useScroll();

  useEffect(() => {
    const updatePosition = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setAbsoluteY(rect.top + window.scrollY);
      }
    };
    updatePosition();
    // Re-calculate if window resizes
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  // Calculate the offset so the mask always stays fixed at the top of the viewport
  const maskPositionY = useTransform(scrollY, (y) => `${y - absoluteY}px`);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, transparent 60px, black 90px, black 100000px)',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: '100% 100000px',
        WebkitMaskPositionY: maskPositionY,
        maskImage: 'linear-gradient(to bottom, transparent 0px, transparent 60px, black 90px, black 100000px)',
        maskRepeat: 'no-repeat',
        maskSize: '100% 100000px',
        maskPositionY: maskPositionY,
      } as any}
    >
      {children}
    </motion.div>
  );
}
