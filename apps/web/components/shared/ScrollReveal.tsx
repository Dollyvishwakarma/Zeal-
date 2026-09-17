'use client';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@zeal/ui';
import { ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  delay?: number;
}

export function ScrollReveal({
  children,
  className,
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  delay = 0,
}: ScrollRevealProps) {
  const { ref, isInView } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={cn(
        'scroll-reveal',
        isInView && 'in-view',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
