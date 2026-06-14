import type { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: keyof HTMLElementTagNameMap;
}

/**
 * Centered container with max-width and responsive gutters.
 * Spec: max-w-7xl (1280px) with fluid gutters.
 */
export default function Container({
  children,
  className = '',
  as: Tag = 'div',
}: ContainerProps) {
  return (
    <Tag className={`mx-auto w-full max-w-7xl px-[clamp(1.25rem,4vw,3rem)] ${className}`}>
      {children}
    </Tag>
  );
}
