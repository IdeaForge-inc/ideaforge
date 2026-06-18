import { useEffect, useRef } from 'react';

/**
 * Живой градиентный фон-«аврора»: крупные размытые blob'ы, медленно дрейфующие
 * за контентом + мягкий parallax за курсором (с инерцией).
 */
export function Aurora() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduce || !fine) return;

    let targetX = 0, targetY = 0, curX = 0, curY = 0, raf = 0;

    const onMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;  // -1..1
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const loop = () => {
      curX += (targetX - curX) * 0.05;  // инерция
      curY += (targetY - curY) * 0.05;
      el.style.setProperty('--px', curX.toFixed(3));
      el.style.setProperty('--py', curY.toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div ref={ref} aria-hidden className="aurora-root fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="aurora-blob aurora-blob--1" />
      <div className="aurora-blob aurora-blob--2" />
      <div className="aurora-blob aurora-blob--3" />
      <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />
    </div>
  );
}
