import { Link } from 'react-router-dom';

import { APP_IDENTITY, FEATURE_FLAGS, appConfig } from '@/config/app.config';
import { ASSESSMENT_GRADES } from '@/config/assessment-grades';
import { ALL_MODULES, MODULE_COUNTS } from '@/config/navigation';
import { providerRegistry } from '@/services/intelligence/registry';
import { formatCount } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { ModuleIcon } from '@/components/ui/icons';
import type { ModuleStatus } from '@/types/navigation';

const CAPABILITY_MODEL = [
  {
    id: 'ingestion',
    title: 'Intelligence ingestion',
    phase: 'Phase 2',
    description:
      'Connector adapters for open-source, community and internal reporting, isolated behind a provider contract so sources can be replaced without touching the interface.',
  },
  {
    id: 'normalisation',
    title: 'Normalisation & validation',
    phase: 'Phase 2',
    description:
      'Every observable is validated, normalised and bounded before storage. Malformed or unsafe values are rejected at the boundary.',
  },
  {
    id: 'correlation',
    title: 'IOC enrichment & correlation',
    phase: 'Phase 3',
    description:
      'Corroboration across independent sources, with duplicate suppression and per-source provenance retained on every derived record.',
  },
  {
    id: 'geospatial',
    title: 'Geospatial intelligence',
    phase: 'Phase 3',
    description:
      'Geolocated observations rendered on a 3D globe, with coordinate precision and derivation stated wherever a location is shown.',
  },
  {
    id: 'analytics',
    title: 'Analytics & reporting',
    phase: 'Phase 5',
    description:
      'Temporal and geographic analysis, analyst-authored reports and exportable records that carry their citations.',
  },
  {
    id: 'history',
    title: 'Historical intelligence',
    phase: 'Phase 4',
    description:
      'Append-oriented storage of observations so that trend analysis and retro-hunting are possible without losing source context.',
  },
] as const;

function renderStatusBadge(status: ModuleStatus) {
  switch (status) {
    case 'available':
      return <Badge variant="success">Available</Badge>;
    case 'planned':
      return <Badge variant="neutral">Planned</Badge>;
    case 'unavailable':
      return <Badge variant="danger">Unavailable</Badge>;
  }
}

export function OverviewPage() {
  const providerCount = providerRegistry.size();
  const plannedFeatureCount = Object.values(FEATURE_FLAGS).filter((enabled) => !enabled).length;

  return (
    <>
      <PageHeader
        hero
        eyebrow="COMMAND // GLOBAL OVERVIEW"
        title={APP_IDENTITY.fullName}
        description={APP_IDENTITY.missionStatement}
        meta={
          <>
            <Badge variant="success">{APP_IDENTITY.phase}</Badge>
            <Badge variant="neutral">Environment: {appConfig.environmentLabel}</Badge>
            <Badge variant="warning" title="No intelligence providers are configured">
              No live feeds connected
            </Badge>
            <Badge variant="neutral">Data mode: DEMO</Badge>
          </>
        }
      />

      <div className="notice" data-tone="warning">
        <div>
          <p className="notice__title">Foundation build — not an operational intelligence system</p>
          <p className="notice__body">
            This deployment establishes the application shell, domain contracts and design system
            for GCTIC. No threat feeds are collected, no indicator processing runs and no geospatial
            visualisation is active. Nothing displayed by this build should inform a live security
            decision.
          </p>
          <ul className="notice__list">
            <li>Intelligence providers configured: {formatCount(providerCount)}</li>
            <li>
              Capability areas declared but not implemented: {formatCount(plannedFeatureCount)} of{' '}
              {formatCount(Object.keys(FEATURE_FLAGS).length)}
            </li>
            <li>Records are never presented as verified without stated corroboration</li>
          </ul>
        </div>
      </div>

      <Panel
        label="FOUNDATION STATUS"
        title="Build readiness"
        description="Live counts read from the module registry and provider registry at render time."
      >
        <div className="metric-grid">
          <div className="metric">
            <span className="u-label">Modules registered</span>
            <span className="metric__value">{formatCount(MODULE_COUNTS.total)}</span>
            <span className="metric__hint">Declared in the navigation registry</span>
          </div>
          <div className="metric" data-state="success">
            <span className="u-label">Available now</span>
            <span className="metric__value">{formatCount(MODULE_COUNTS.available)}</span>
            <span className="metric__hint">Routes with a real implementation</span>
          </div>
          <div className="metric" data-state="warning">
            <span className="u-label">Planned modules</span>
            <span className="metric__value">{formatCount(MODULE_COUNTS.planned)}</span>
            <span className="metric__hint">Clearly marked as unavailable in navigation</span>
          </div>
          <div className="metric" data-state="warning">
            <span className="u-label">Provider adapters</span>
            <span className="metric__value">{formatCount(providerCount)}</span>
            <span className="metric__hint">External intelligence sources connected</span>
          </div>
        </div>
      </Panel>

      <Panel
        label="CAPABILITY MODEL"
        title="Intelligence architecture domains"
        description="The platform is organised around six intelligence domains. Each is a separate feature module behind a defined contract."
      >
        <div className="capability-grid">
          {CAPABILITY_MODEL.map((capability, index) => (
            <article className="capability" key={capability.id}>
              <div className="capability__head">
                <span className="capability__index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Badge variant="neutral">Planned</Badge>
              </div>
              <h3 className="capability__title">{capability.title}</h3>
              <p className="capability__description">{capability.description}</p>
              <p className="capability__footer">
                <span>{capability.phase}</span>
                <span aria-hidden="true">·</span>
                <span>Not implemented</span>
              </p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel
        label="MODULE REGISTRY"
        title="Module readiness"
        description="Every declared module with its current implementation state. Planned modules render an explicit placeholder, never fabricated content."
        className="panel--flush"
        actions={
          <Badge variant="neutral">
            {formatCount(MODULE_COUNTS.available)} / {formatCount(MODULE_COUNTS.total)} available
          </Badge>
        }
      >
        <div className="table-scroll">
          <table className="data-table">
            <caption className="u-visually-hidden">Module readiness and implementation status</caption>
            <thead>
              <tr>
                <th scope="col">Module</th>
                <th scope="col">Purpose</th>
                <th scope="col">Status</th>
                <th scope="col">Phase</th>
              </tr>
            </thead>
            <tbody>
              {ALL_MODULES.map((module) => (
                <tr key={module.id}>
                  <th scope="row" className="data-table__rowhead">
                    <span className="data-table__rowlabel">
                      <ModuleIcon name={module.icon} className="data-table__icon" />
                      {module.label}
                    </span>
                    <span className="data-table__mono">{module.path}</span>
                  </th>
                  <td>{module.summary}</td>
                  <td>{renderStatusBadge(module.status)}</td>
                  <td className="data-table__mono">{module.phase ?? 'Phase 1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="split-grid">
        <Panel
          label="ASSESSMENT GRADES"
          title="How intelligence is labelled"
          description="Every record must carry exactly one grade. The grade governs what an analyst is permitted to claim."
          actions={<Link className="btn btn--sm" to="/methodology">Read methodology</Link>}
        >
          <ul className="grade-grid">
            {ASSESSMENT_GRADES.map((grade) => (
              <li className="grade" data-grade={grade.id} key={grade.id}>
                <Badge variant={grade.tone === 'neutral' ? 'neutral' : grade.tone}>
                  {grade.label}
                </Badge>
                <p className="grade__definition">{grade.definition}</p>
                <p className="grade__rule">{grade.handlingRule}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          label="SCOPE"
          title="Implemented vs deferred"
          description="Current scope of this repository, stated precisely."
        >
          <div className="scope-grid">
            <div>
              <p className="u-label scope-grid__heading">Implemented</p>
              <ul className="scope-list">
                <li>
                  <span className="scope-list__mark" aria-hidden="true">
                    +
                  </span>
                  Application shell, routing and responsive navigation
                </li>
                <li>
                  <span className="scope-list__mark" aria-hidden="true">
                    +
                  </span>
                  Design token system and reusable component library
                </li>
                <li>
                  <span className="scope-list__mark" aria-hidden="true">
                    +
                  </span>
                  Intelligence domain types with provenance and grading
                </li>
                <li>
                  <span className="scope-list__mark" aria-hidden="true">
                    +
                  </span>
                  Validation, URL safety and IP scope classification utilities
                </li>
                <li>
                  <span className="scope-list__mark" aria-hidden="true">
                    +
                  </span>
                  Provider adapter contract and registry seam
                </li>
              </ul>
            </div>
            <div>
              <p className="u-label scope-grid__heading">Deferred</p>
              <ul className="scope-list" data-tone="muted">
                <li>
                  <span className="scope-list__mark" aria-hidden="true">
                    −
                  </span>
                  External threat feed connectors and ingestion schedules
                </li>
                <li>
                  <span className="scope-list__mark" aria-hidden="true">
                    −
                  </span>
                  IOC processing, enrichment and correlation engine
                </li>
                <li>
                  <span className="scope-list__mark" aria-hidden="true">
                    −
                  </span>
                  CesiumJS globe and CZML time-dynamic playback
                </li>
                <li>
                  <span className="scope-list__mark" aria-hidden="true">
                    −
                  </span>
                  ECharts analytics and reporting exports
                </li>
                <li>
                  <span className="scope-list__mark" aria-hidden="true">
                    −
                  </span>
                  Historical storage, authentication and analyst accounts
                </li>
              </ul>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
