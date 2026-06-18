import { useRef, ReactNode, CSSProperties } from 'react';

const canTilt = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Карточка с 3D-наклоном по позиции курсора и бликом-glare.
 * На тач-устройствах и при reduced-motion ведёт себя как обычный div.
 */
export function TiltCard({
  children, className = '', max = 8, style,
}: { children: ReactNode; className?: string; max?: number; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const enabled = useRef(canTilt());

  const onMove = (e: React.MouseEvent) => {
    if (!enabled.current || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;   // 0..1
    const py = (e.clientY - r.top) / r.height;   // 0..1
    const rx = (0.5 - py) * (max * 2);
    const ry = (px - 0.5) * (max * 2);
    ref.current.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.012)`;
    if (glareRef.current) {
      glareRef.current.style.opacity = '1';
      glareRef.current.style.background = `radial-gradient(220px circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.18), transparent 60%)`;
    }
  };

  const reset = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
    if (glareRef.current) glareRef.current.style.opacity = '0';
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ transformStyle: 'preserve-3d', transition: 'transform 250ms cubic-bezier(0.16,1,0.3,1)', ...style }}
      className={`relative ${className}`}
    >
      {children}
      <div ref={glareRef} aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200" />
    </div>
  );
}
