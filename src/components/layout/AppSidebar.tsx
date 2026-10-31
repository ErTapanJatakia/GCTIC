import { NavLink } from 'react-router-dom';

import { NAVIGATION_GROUPS } from '@/config/navigation';
import { APP_IDENTITY } from '@/config/app.config';
import { ModuleIcon } from '@/components/ui/icons';

interface AppSidebarProps {
  readonly open: boolean;
  readonly onNavigate: () => void;
}

/**
 * Module navigation. Entries are declared in the module registry, and any
 * module that is not implemented is visibly marked so the navigation never
 * implies capability that does not exist.
 */
export function AppSidebar({ open, onNavigate }: AppSidebarProps) {
  return (
    <aside className="app-sidebar" id="app-sidebar" data-open={open} aria-label="Module navigation">
      {NAVIGATION_GROUPS.map((group) => {
        const groupLabelId = `nav-group-${group.id}`;

        return (
          <nav key={group.id} className="app-sidebar__group" aria-labelledby={groupLabelId}>
            <span className="u-label app-sidebar__group-label" id={groupLabelId}>
              {group.label}
            </span>
            <ul className="app-sidebar__items">
              {group.items.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className="app-sidebar__link"
                    data-status={item.status}
                    onClick={onNavigate}
                  >
                    <ModuleIcon name={item.icon} className="app-sidebar__link-icon" />
                    <span className="app-sidebar__link-label">{item.label}</span>
                    {item.status === 'planned' ? (
                      <span className="app-sidebar__link-status">Planned</span>
                    ) : null}
                    {item.status === 'unavailable' ? (
                      <span className="app-sidebar__link-status" data-tone="danger">
                        Offline
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        );
      })}

      <div className="app-sidebar__footer">
        <div className="app-sidebar__footer-row">
          <span>
            {APP_IDENTITY.acronym} v{APP_IDENTITY.version}
          </span>
          <span>{APP_IDENTITY.license}</span>
        </div>
        <div className="app-sidebar__footer-row">
          <span>Build</span>
          <span>{APP_IDENTITY.phase}</span>
        </div>
      </div>
    </aside>
  );
}
