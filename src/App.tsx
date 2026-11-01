import { BrowserRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';

import { ALL_MODULES } from '@/config/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { IocExplorerPage } from '@/features/indicators/IocExplorerPage';
import { MethodologyPage } from '@/features/methodology/MethodologyPage';
import { NotFoundPage } from '@/features/not-found/NotFoundPage';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { PlannedModulePage } from '@/features/planned/PlannedModulePage';
import { SystemStatusPage } from '@/features/system-status/SystemStatusPage';
import type { NavigationItem } from '@/types/navigation';

/**
 * Resolve a registry entry to its route element.
 *
 * A module marked `available` without a mapped view falls back to the explicit
 * placeholder, which keeps the interface honest if the registry gets ahead of
 * the implementation.
 */
function resolveModuleElement(module: NavigationItem): ReactElement {
  if (module.status === 'available') {
    switch (module.id) {
      case 'overview':
        return <OverviewPage />;
      case 'system-status':
        return <SystemStatusPage />;
      case 'methodology':
        return <MethodologyPage />;
      case 'indicators':
        return <IocExplorerPage />;
      default:
        return <PlannedModulePage module={module} />;
    }
  }

  return <PlannedModulePage module={module} />;
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            {ALL_MODULES.map((module) => (
              <Route
                key={module.id}
                path={module.path}
                element={resolveModuleElement(module)}
              />
            ))}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
