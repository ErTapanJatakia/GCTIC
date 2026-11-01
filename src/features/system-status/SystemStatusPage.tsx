import { APP_IDENTITY, CONFIGURATION_WARNINGS, FEATURE_FLAGS, appConfig } from '@/config/app.config';
import { formatUtcDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { ProviderHealthPanel } from './ProviderHealthPanel';

const ARCHITECTURE_LAYERS = [
  {
    id: 'presentation',
    layer: 'Presentation',
    responsibility: 'Shell, navigation, design system, feature views',
    status: 'Implemented',
  },
  {
    id: 'domain',
    layer: 'Domain model',
    responsibility: 'Intelligence records, provenance, assessment grading, geospatial values',
    status: 'Implemented',
  },
  {
    id: 'validation',
    layer: 'Validation',
    responsibility: 'Observable validation, canonicalisation, URL safety, IP scope classification',
    status: 'Implemented',
  },
  {
    id: 'ingestion',
    layer: 'Ingestion',
    responsibility: 'Local JSON/GeoJSON parsing, per-source observations, deduplication',
    status: 'Implemented — local datasets',
  },
  {
    id: 'providers',
    layer: 'Provider adapters',
    responsibility: 'Connector contract, registry and local file-backed adapter',
    status: 'Implemented — 1 local adapter',
  },
  {
    id: 'enrichment',
    layer: 'Enrichment & correlation',
    responsibility: 'External enrichment, cross-source correlation, derived records',
    status: 'Not implemented',
  },
  {
    id: 'storage',
    layer: 'Historical storage',
    responsibility: 'Append-oriented observation store with provenance',
    status: 'Not implemented',
  },
  {
    id: 'geospatial',
    layer: 'Geospatial',
    responsibility: 'CesiumJS globe, CZML event playback',
    status: 'Not implemented',
  },
] as const;

const FEATURE_LABELS: Readonly<Record<keyof typeof FEATURE_FLAGS, string>> = {
  liveFeeds: 'Live feed ingestion',
  globe: '3D globe visualisation',
  iocProcessing: 'Local IOC validation and deduplication',
  analytics: 'Analytics and reporting',
  historicalStore: 'Historical intelligence store',
  authentication: 'Authentication and accounts',
};

export function SystemStatusPage() {
  const featureEntries = Object.entries(FEATURE_FLAGS) as readonly [
    keyof typeof FEATURE_FLAGS,
    boolean,
  ][];

  return (
    <>
      <PageHeader
        eyebrow="SYSTEM // DIAGNOSTICS"
        title="System status"
        description="Runtime configuration, adapter registration and build integrity for this deployment. Values are read from the running build, not hard-coded."
        meta={<Badge variant="success">Foundation build healthy</Badge>}
      />

      {CONFIGURATION_WARNINGS.length > 0 ? (
        <div className="notice" data-tone="warning">
          <div>
            <p className="notice__title">Configuration warnings</p>
            <ul className="notice__list">
              {CONFIGURATION_WARNINGS.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="split-grid">
        <Panel label="RUNTIME" title="Build configuration">
          <dl className="definition-list">
            <dt>Application</dt>
            <dd>
              {APP_IDENTITY.acronym} — {APP_IDENTITY.fullName}
            </dd>
            <dt>Version</dt>
            <dd className="u-mono">v{APP_IDENTITY.version}</dd>
            <dt>Build timestamp</dt>
            <dd className="u-mono">{formatUtcDateTime(APP_IDENTITY.buildTimestamp)}</dd>
            <dt>Environment label</dt>
            <dd className="u-mono">{appConfig.environmentLabel}</dd>
            <dt>Vite mode</dt>
            <dd className="u-mono">{appConfig.mode}</dd>
            <dt>API gateway</dt>
            <dd className="u-mono">
              {appConfig.apiBaseUrl ?? 'Not configured — frontend renders local foundation state'}
            </dd>
            <dt>Data mode</dt>
            <dd>
              <Badge variant="warning">{appConfig.dataMode.toUpperCase()}</Badge>
            </dd>
            <dt>Licence</dt>
            <dd className="u-mono">{APP_IDENTITY.license}</dd>
          </dl>
        </Panel>

        <Panel
          label="CAPABILITY"
          title="Feature flags"
          description="Deliberately disabled until the corresponding module is implemented and reviewed."
        >
          <ul className="flag-list">
            {featureEntries.map(([flag, enabled]) => (
              <li key={flag} className="flag-list__item">
                <span className="flag-list__name">{FEATURE_LABELS[flag]}</span>
                <span className="flag-list__state" data-enabled={enabled}>
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <ProviderHealthPanel />

      <Panel
        label="ARCHITECTURE"
        title="Layer status"
        description="The layers the platform is designed around, and what exists today."
        className="panel--flush"
      >
        <div className="table-scroll">
          <table className="data-table">
            <caption className="u-visually-hidden">Architecture layer implementation status</caption>
            <thead>
              <tr>
                <th scope="col">Layer</th>
                <th scope="col">Responsibility</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {ARCHITECTURE_LAYERS.map((layer) => (
                <tr key={layer.id}>
                  <th scope="row" className="data-table__rowhead">
                    {layer.layer}
                  </th>
                  <td>{layer.responsibility}</td>
                  <td>
                    <span
                      className="layer-status"
                      data-implemented={layer.status.startsWith('Implemented')}
                    >
                      {layer.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
