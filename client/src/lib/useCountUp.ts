import { useEffect, useRef, useState } from 'react';

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Плавно «набегающее» число от 0 до target.
 * Возвращает текущее целое значение для рендера.
 */
export function useCountUp(target: number, durationMs = 1100, delayMs = 0): number {
  const [value, setValue] = useState(prefersReduced() ? target : 0);
  const raf = useRef<number>();

  useEffect(() => {
    if (prefersReduced()) { setValue(target); return; }
    let start: number | null = null;
    const timer = window.setTimeout(() => {
      const tick = (t: number) => {
        if (start === null) start = t;
        const p = Math.min(1, (t - start) / durationMs);
        // easeOutExpo — быстрый старт, мягкое торможение
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        setValue(Math.round(eased * target));
        if (p < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, delayMs);

    return () => { window.clearTimeout(timer); if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, durationMs, delayMs]);

  return value;
}
