import { APP_IDENTITY, appConfig } from '@/config/app.config';
import { formatUtcDateTime } from '@/lib/format';

export function AppFooter() {
  return (
    <footer className="app-footer">
      <span>
        {APP_IDENTITY.acronym} v{APP_IDENTITY.version} · {APP_IDENTITY.license}
      </span>
      <span>Data mode: {appConfig.dataMode.toUpperCase()} — no operational intelligence</span>
      <span className="app-footer__spacer" aria-hidden="true" />
      <span>Build {formatUtcDateTime(APP_IDENTITY.buildTimestamp)}</span>
    </footer>
  );
}
