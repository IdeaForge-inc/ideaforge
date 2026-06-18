import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Aurora } from './components/Aurora';
import { PageTransition } from './components/PageTransition';
import { CommandPalette } from './components/CommandPalette';
import Generate from './pages/Generate';
import History from './pages/History';
import Profile from './pages/Profile';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Share from './pages/Share';
import { ToastProvider } from './lib/toast';
import { UserProvider } from './components/UserProvider';

export default function App() {
  // Глобально обновляем позицию «прожектора» на карточках с классом .spotlight
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('.spotlight') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <ToastProvider>
      <UserProvider>
        <Aurora />
        <Routes>
          <Route path="/share/:slug" element={<Share />} />
          <Route
            path="*"
            element={
              <div className="min-h-screen flex">
                <Sidebar />
                <CommandPalette />
                <main className="flex-1 p-5 pt-20 md:p-8 md:pt-8 max-w-7xl mx-auto w-full">
                  <PageTransition>
                    <Routes>
                      <Route path="/" element={<Generate />} />
                      <Route path="/history" element={<History />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/groups" element={<Groups />} />
                      <Route path="/groups/:id" element={<GroupDetail />} />
                    </Routes>
                  </PageTransition>
                </main>
              </div>
            }
          />
        </Routes>
      </UserProvider>
    </ToastProvider>
  );
}
