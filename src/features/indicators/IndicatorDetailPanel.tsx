import { getAssessmentGrade } from '@/config/assessment-grades';
import { IOC_TYPE_LABELS, getThreatCategoryLabel } from '@/config/threat-taxonomy';
import { formatUtcDateTime } from '@/lib/format';
import { isHttpUrl } from '@/lib/validation';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import type { GeoPrecision } from '@/types/geo';
import type { ThreatIndicator } from '@/types/intelligence';

const GEO_PRECISION_LABELS: Readonly<Record<GeoPrecision, string>> = {
  country: 'Country level — not a facility or operator location',
  region: 'Region level',
  city: 'City level — coarse, not a facility claim',
  facility: 'Facility level as reported by the source',
  unknown: 'Unknown precision — coordinate derivation not stated',
};

const RELIABILITY_LABELS: Readonly<Record<string, string>> = {
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  unknown: 'Unknown',
};

interface IndicatorDetailPanelProps {
  readonly record: ThreatIndicator;
  readonly onClose: () => void;
}

/**
 * Full record view.
 *
 * Every field is rendered as a text node. Source references are inert text
 * unless they were validated as absolute http(s) URLs, and even then they are
 * never opened automatically: the analyst must click deliberately.
 */
export function IndicatorDetailPanel({ record, onClose }: IndicatorDetailPanelProps) {
  const grade = getAssessmentGrade(record.assessment);
  const corroboration = record.corroboration;
  const reference = record.provenance.sourceUrl;
  const observations = record.observations ?? [];

  return (
    <Panel
      label="RECORD DETAIL"
      title={<span className="u-mono record-detail__title">{record.value}</span>}
      description="One normalised observable with every retained source observation and its provenance."
      actions={
        <button type="button" className="btn btn--sm" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="page-header__meta record-detail__badges">
        <Badge variant="neutral">{IOC_TYPE_LABELS[record.iocType]}</Badge>
        <Badge variant={grade.tone === 'neutral' ? 'neutral' : grade.tone}>{grade.label}</Badge>
        <Badge variant="neutral">
          {getThreatCategoryLabel(record.threatCategory ?? 'unknown')}
        </Badge>
      </div>

      {record.assessment === 'synthetic' ? (
        <div className="notice" data-tone="warning">
          <div>
            <p className="notice__title">Synthetic record — not observed in the wild</p>
            <p className="notice__body">
              This record was generated for GCTIC development. It describes no real host, sample or
              campaign and must never be used as operational intelligence.
            </p>
          </div>
        </div>
      ) : null}

      <dl className="definition-list">
        <dt>Record ID</dt>
        <dd className="u-mono">{record.id}</dd>
        <dt>Normalised value</dt>
        <dd className="u-mono record-detail__value">{record.value}</dd>
        {record.originalValue !== undefined ? (
          <>
            <dt>Original value</dt>
            <dd className="u-mono record-detail__value">{record.originalValue}</dd>
          </>
        ) : null}
        <dt>Category</dt>
        <dd>{getThreatCategoryLabel(record.threatCategory ?? 'unknown')}</dd>
        <dt>Assessment</dt>
        <dd>
          <Badge variant={grade.tone === 'neutral' ? 'neutral' : grade.tone}>{grade.label}</Badge>{' '}
          <span className="u-text-tertiary">{grade.handlingRule}</span>
        </dd>
        <dt>Confidence</dt>
        <dd>
          {record.confidence !== undefined
            ? `${record.confidence}% — declared by the contributing source`
            : 'Not reported by any contributing source'}
        </dd>
        <dt>Source reliability</dt>
        <dd>{RELIABILITY_LABELS[record.sourceReliability ?? 'unknown'] ?? 'Unknown'}</dd>
        <dt>First seen</dt>
        <dd className="u-mono">{formatUtcDateTime(record.firstSeen)}</dd>
        <dt>Last seen</dt>
        <dd className="u-mono">
          {record.lastSeen !== undefined ? formatUtcDateTime(record.lastSeen) : 'Not reported'}
        </dd>
        <dt>Corroboration</dt>
        <dd>
          {corroboration
            ? `${corroboration.distinctSources} distinct source${
                corroboration.distinctSources === 1 ? '' : 's'
              } across ${corroboration.observations} observation${
                corroboration.observations === 1 ? '' : 's'
              }. ${
                corroboration.multiSource
                  ? 'Multiple sources reported this observable; grade still follows declared evidence.'
                  : 'Single-source observation. Repeated rows from one source are not corroboration.'
              }`
            : 'Not computed for this record.'}
        </dd>
      </dl>

      <section className="record-detail__section" aria-labelledby="provenance-heading">
        <p className="u-label" id="provenance-heading">
          Provenance
        </p>
        <dl className="definition-list">
          <dt>Source</dt>
          <dd>
            {record.provenance.sourceName}{' '}
            <span className="u-mono u-text-tertiary">{record.provenance.sourceId}</span>
          </dd>
          <dt>Source class</dt>
          <dd>{record.provenance.sourceType}</dd>
          <dt>Retrieved</dt>
          <dd className="u-mono">{formatUtcDateTime(record.provenance.retrievedAt)}</dd>
          <dt>Source reference</dt>
          <dd>
            {reference !== undefined && isHttpUrl(reference) ? (
              <a href={reference} target="_blank" rel="noopener noreferrer nofollow">
                {reference}
              </a>
            ) : (
              'Not reported'
            )}
          </dd>
          <dt>Licence</dt>
          <dd>{record.provenance.license ?? 'Not declared'}</dd>
          <dt>Collection note</dt>
          <dd>{record.provenance.notes ?? 'Not declared'}</dd>
        </dl>
        <p className="record-detail__hint">
          References are never opened, resolved or downloaded by this interface. Following a link is
          a deliberate analyst action outside GCTIC.
        </p>
      </section>

      <section className="record-detail__section" aria-labelledby="observations-heading">
        <p className="u-label" id="observations-heading">
          Observations — {observations.length}
        </p>
        {observations.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table data-table--compact">
              <caption className="u-visually-hidden">
                Source observations retained for this indicator
              </caption>
              <thead>
                <tr>
                  <th scope="col">Source record</th>
                  <th scope="col">Original value</th>
                  <th scope="col">First seen</th>
                  <th scope="col">Last seen</th>
                  <th scope="col">Grade</th>
                  <th scope="col">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((observation) => (
                  <tr key={`${observation.sourceId}:${observation.recordId}`}>
                    <th scope="row" className="data-table__rowhead">
                      <span className="data-table__rowlabel">{observation.sourceName}</span>
                      <span className="data-table__mono">{observation.recordId}</span>
                    </th>
                    <td className="u-mono record-detail__value">{observation.originalValue}</td>
                    <td className="data-table__mono">{formatUtcDateTime(observation.firstSeen)}</td>
                    <td className="data-table__mono">
                      {observation.lastSeen !== undefined
                        ? formatUtcDateTime(observation.lastSeen)
                        : 'Not reported'}
                    </td>
                    <td>{observation.assessment}</td>
                    <td className="data-table__mono">
                      {observation.confidence !== undefined
                        ? `${observation.confidence}%`
                        : 'Not reported'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="u-text-secondary">No per-source observations are retained on this record.</p>
        )}
      </section>

      {record.geo !== undefined ? (
        <section className="record-detail__section" aria-labelledby="geo-heading">
          <p className="u-label" id="geo-heading">
            Reported observation location
          </p>
          <dl className="definition-list">
            <dt>Coordinates</dt>
            <dd className="u-mono">
              {record.geo.point.latitude.toFixed(4)}, {record.geo.point.longitude.toFixed(4)}
            </dd>
            <dt>Precision</dt>
            <dd>{GEO_PRECISION_LABELS[record.geo.precision]}</dd>
            <dt>Place label</dt>
            <dd>{record.geo.placeName ?? 'Not provided'}</dd>
            <dt>Country</dt>
            <dd>{record.geo.countryCode ?? 'Not provided'}</dd>
          </dl>
          <p className="record-detail__hint">
            A location describes where an observation was reported, not where an operator sits.
            Withhold judgement where precision is unknown or country-level.
          </p>
        </section>
      ) : null}
    </Panel>
  );
}
