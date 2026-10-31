import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import type { NavigationItem } from '@/types/navigation';

interface PlannedModulePageProps {
  readonly module: NavigationItem;
}

/**
 * Honest placeholder for a module that is declared in the registry but not yet
 * implemented. It states the module's intended scope and does not simulate
 * functionality, sample telemetry or fabricated intelligence.
 */
export function PlannedModulePage({ module }: PlannedModulePageProps) {
  const isPlanned = module.status === 'planned';

  return (
    <>
      <PageHeader
        eyebrow={`MODULE // ${module.status.toUpperCase()}`}
        title={module.label}
        description={module.summary}
        meta={
          <>
            <Badge variant={isPlanned ? 'warning' : 'danger'}>
              {isPlanned ? 'Planned — not implemented' : 'Unavailable'}
            </Badge>
            {module.phase ? <Badge variant="neutral">{module.phase}</Badge> : null}
            <Badge variant="neutral">Path: {module.path}</Badge>
          </>
        }
      />

      <div className="notice" data-tone="warning">
        <div>
          <p className="notice__title">
            {isPlanned
              ? 'This module is scheduled but does not exist yet'
              : 'This module is currently unavailable'}
          </p>
          <p className="notice__body">
            No data, controls or visualisations are shown here because none have been implemented.
            GCTIC does not render demonstration telemetry in place of real capability, and this view
            will not be populated with synthetic intelligence to appear complete.
          </p>
        </div>
      </div>

      <Panel
        label="INTENDED SCOPE"
        title="Planned capabilities"
        description="The responsibilities this module will assume once implemented and reviewed."
      >
        {module.plannedCapabilities && module.plannedCapabilities.length > 0 ? (
          <ol className="capability-list">
            {module.plannedCapabilities.map((capability, index) => (
              <li key={capability} className="capability-list__item">
                <span className="capability-list__index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{capability}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="u-text-secondary">
            No capability breakdown has been declared for this module yet.
          </p>
        )}
      </Panel>

      <Panel label="NAVIGATION" title="Available in this build">
        <div className="link-row">
          <Link className="btn btn--primary" to="/">
            Command overview
          </Link>
          <Link className="btn" to="/system/status">
            System status
          </Link>
          <Link className="btn" to="/methodology">
            Methodology
          </Link>
        </div>
      </Panel>
    </>
  );
}
