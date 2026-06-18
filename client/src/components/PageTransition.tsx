import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Перезапускает enter-анимацию при каждой смене маршрута за счёт key={pathname}.
 * Лёгкий fade + slide-up, уважает prefers-reduced-motion (через глобальный media-query).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-page-enter">
      {children}
    </div>
  );
}
