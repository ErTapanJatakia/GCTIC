import { Link } from 'react-router-dom';

import { APP_IDENTITY, appConfig } from '@/config/app.config';
import { useUtcClock } from '@/hooks/useUtcClock';
import { formatUtcTime } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { BrandMark, MenuIcon } from '@/components/ui/icons';

interface AppHeaderProps {
  readonly navOpen: boolean;
  readonly onToggleNav: () => void;
}

export function AppHeader({ navOpen, onToggleNav }: AppHeaderProps) {
  const now = useUtcClock();

  return (
    <header className="app-header">
      <button
        type="button"
        className="app-header__nav-toggle"
        onClick={onToggleNav}
        aria-expanded={navOpen}
        aria-controls="app-sidebar"
        aria-label={navOpen ? 'Close module navigation' : 'Open module navigation'}
      >
        <MenuIcon />
      </button>

      <Link to="/" className="app-header__brand">
        <BrandMark className="app-header__mark" />
        <span className="app-header__wordmark">
          <span className="app-header__acronym">{APP_IDENTITY.acronym}</span>
          <span className="app-header__name">{APP_IDENTITY.fullName}</span>
        </span>
      </Link>

      <span className="app-header__divider" aria-hidden="true" />

      <div className="app-header__telemetry">
        <Badge variant="neutral" title="Runtime environment">
          {appConfig.environmentLabel}
        </Badge>
        <Badge
          variant="warning"
          title="No intelligence providers are configured in this build"
        >
          No live feeds
        </Badge>
        <div className="app-header__clock">
          <span className="u-label app-header__clock-label">UTC</span>
          <time className="app-header__clock-value" dateTime={now.toISOString()}>
            {formatUtcTime(now)}
          </time>
        </div>
      </div>
    </header>
  );
}
