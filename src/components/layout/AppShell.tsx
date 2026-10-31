import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

/**
 * Main application layout: fixed header, module navigation rail and scrolling
 * content region. On tablet and below the navigation becomes an off-canvas
 * drawer controlled by the header toggle and dismissed with Escape.
 */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNavOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <AppHeader navOpen={navOpen} onToggleNav={() => setNavOpen((current) => !current)} />

      <div
        className="app-backdrop"
        data-open={navOpen}
        onClick={() => setNavOpen(false)}
        role="presentation"
      />

      <AppSidebar open={navOpen} onNavigate={() => setNavOpen(false)} />

      <main className="app-main" id="main-content" tabIndex={-1}>
        <div className="app-main__inner">
          <Outlet />
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
