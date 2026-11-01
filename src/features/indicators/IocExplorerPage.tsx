import { useState } from 'react';

import { ASSESSMENT_GRADES, getAssessmentGrade } from '@/config/assessment-grades';
import {
  IOC_TYPE_LABELS,
  THREAT_CATEGORIES,
  getThreatCategoryLabel,
} from '@/config/threat-taxonomy';
import { EXPLORER_PAGE_SIZE, useIndicatorExplorer } from '@/hooks/useIndicatorExplorer';
import { formatCount, formatUtcDateTime } from '@/lib/format';
import { IOC_TYPE_IDS } from '@/types/intelligence';
import type { Assessment, IocType, ThreatCategory, ThreatIndicator } from '@/types/intelligence';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { StatusDot } from '@/components/ui/StatusDot';
import { IndicatorDetailPanel } from './IndicatorDetailPanel';

const HEALTH_TONES = {
  online: 'online',
  degraded: 'degraded',
  offline: 'offline',
  unconfigured: 'idle',
} as const;

export function IocExplorerPage() {
  const explorer = useIndicatorExplorer();
  const [selected, setSelected] = useState<ThreatIndicator | null>(null);

  const { filters, setFilters } = explorer;
  const items = explorer.state.phase === 'ready' ? explorer.state.items : [];
  const total = explorer.state.phase === 'ready' ? explorer.state.total : 0;

  return (
    <>
      <PageHeader
        eyebrow="ANALYSIS // IOC EXPLORER"
        title="Indicator explorer"
        description="Validated, normalised indicators from locally ingested datasets, with per-source observations and provenance on every record. Presence here is an observation, never a verdict."
        meta={
          <>
            <Badge variant="success">Local dataset adapter</Badge>
            <Badge variant="warning">Synthetic data only</Badge>
            <Badge variant="neutral">No live feeds</Badge>
            {explorer.health ? (
              <StatusDot
                tone={HEALTH_TONES[explorer.health.status]}
                label={`Source: ${explorer.health.status}`}
              />
            ) : null}
          </>
        }
      />

      <div className="notice" data-tone="warning">
        <div>
          <p className="notice__title">Demonstration dataset — every record is synthetic</p>
          <p className="notice__body">
            Records are read from a bundled JSON and GeoJSON dataset generated for this project. All
            addresses come from documentation-reserved ranges, all domains sit under reserved example
            namespaces, and all hashes are repetition patterns. Nothing here was reported by a real
            source or observed in operational telemetry.
          </p>
        </div>
      </div>

      <Panel
        label="QUERY"
        title="Filter indicators"
        description="Filters are applied server-side by the provider, then paginated with opaque cursors."
        actions={
          explorer.hasActiveFilters ? (
            <button type="button" className="btn btn--sm" onClick={explorer.resetFilters}>
              Reset filters
            </button>
          ) : null
        }
      >
        <form
          className="filter-bar"
          onSubmit={(event) => {
            event.preventDefault();
          }}
          role="search"
          aria-label="Filter intelligence indicators"
        >
          <label className="field field--grow">
            <span className="u-label">Search</span>
            <input
              className="input"
              type="search"
              value={filters.search}
              maxLength={120}
              placeholder="Value, tag or source name"
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            />
          </label>

          <label className="field">
            <span className="u-label">Indicator type</span>
            <select
              className="select"
              value={filters.type}
              onChange={(event) =>
                setFilters({ ...filters, type: event.target.value as IocType | 'all' })
              }
            >
              <option value="all">All types</option>
              {IOC_TYPE_IDS.map((id) => (
                <option key={id} value={id}>
                  {IOC_TYPE_LABELS[id]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="u-label">Threat category</span>
            <select
              className="select"
              value={filters.category}
              onChange={(event) =>
                setFilters({ ...filters, category: event.target.value as ThreatCategory | 'all' })
              }
            >
              <option value="all">All categories</option>
              {THREAT_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="u-label">Verification status</span>
            <select
              className="select"
              value={filters.assessment}
              onChange={(event) =>
                setFilters({ ...filters, assessment: event.target.value as Assessment | 'all' })
              }
            >
              <option value="all">All grades</option>
              {ASSESSMENT_GRADES.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.label}
                </option>
              ))}
            </select>
          </label>
        </form>

        {explorer.health?.message !== undefined ? (
          <p className="filter-summary">
            <span>{explorer.providerLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{explorer.health.message}</span>
          </p>
        ) : null}
      </Panel>

      <div className="split-grid">
        <Panel
          label="RESULTS"
          title="Normalised indicators"
          description={
            explorer.state.phase === 'ready'
              ? `${formatCount(total)} matching record${total === 1 ? '' : 's'} · page ${explorer.pageNumber} of ${explorer.pageCount}`
              : 'Records matching the current query.'
          }
          className="panel--flush"
        >
          {explorer.state.phase === 'loading' ? (
            <div className="panel__body">
              <LoadingState label="Loading indicators from the local dataset" rows={4} />
            </div>
          ) : null}

          {explorer.state.phase === 'error' ? (
            <div className="panel__body">
              <ErrorState
                title="Indicators unavailable"
                description={`The local dataset could not be read: ${explorer.state.message}`}
                onRetry={explorer.reload}
              />
            </div>
          ) : null}

          {explorer.state.phase === 'ready' && items.length === 0 ? (
            <div className="panel__body">
              <EmptyState
                title={explorer.hasActiveFilters ? 'No indicators match this query' : 'Dataset is empty'}
                description={
                  explorer.hasActiveFilters
                    ? 'No record satisfies the current search and filter combination. Widen the query or reset the filters.'
                    : 'The dataset was read successfully but contains no records that passed validation.'
                }
                hint={
                  explorer.hasActiveFilters
                    ? 'Filters are applied before pagination'
                    : 'Nothing is fabricated to fill this view'
                }
                action={
                  explorer.hasActiveFilters ? (
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() => explorer.resetFilters()}
                    >
                      Reset filters
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : null}

          {explorer.state.phase === 'ready' && items.length > 0 ? (
            <>
              <ul className="record-list">
                {items.map((item) => {
                  const grade = getAssessmentGrade(item.assessment);
                  const sources = item.corroboration?.distinctSources ?? 1;
                  const isSelected = selected?.id === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="record"
                        data-selected={isSelected}
                        aria-pressed={isSelected}
                        onClick={() => setSelected(item)}
                      >
                        <span className="record__head">
                          <span className="record__value">{item.value}</span>
                          <Badge variant="neutral">{IOC_TYPE_LABELS[item.iocType]}</Badge>
                          <Badge variant={grade.tone === 'neutral' ? 'neutral' : grade.tone}>
                            {grade.label}
                          </Badge>
                        </span>
                        <span className="record__meta">
                          <span>{getThreatCategoryLabel(item.threatCategory ?? 'unknown')}</span>
                          <span aria-hidden="true">·</span>
                          <span>First seen {formatUtcDateTime(item.firstSeen)}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Last seen{' '}
                            {item.lastSeen !== undefined
                              ? formatUtcDateTime(item.lastSeen)
                              : 'not reported'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {sources} source{sources === 1 ? '' : 's'}
                          </span>
                          {item.confidence !== undefined ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{item.confidence}% confidence</span>
                            </>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="pagination">
                <p className="pagination__info" role="status">
                  Showing {formatCount(items.length)} of {formatCount(total)} ·{' '}
                  {EXPLORER_PAGE_SIZE} per page
                </p>
                <div className="pagination__controls">
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={explorer.previousPage}
                    disabled={!explorer.canGoBack}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={explorer.nextPage}
                    disabled={!explorer.hasNextPage}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </Panel>

        {selected !== null ? (
          <IndicatorDetailPanel record={selected} onClose={() => setSelected(null)} />
        ) : (
          <Panel label="RECORD DETAIL" title="No record selected">
            <EmptyState
              title="Select an indicator to inspect its provenance"
              description="Choosing a record shows its normalised and original values, every retained source observation, declared confidence and any reported location."
              hint="Records never assert malicious intent on their own"
              action={
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    setSelected(items[0] ?? null);
                  }}
                  disabled={items.length === 0}
                >
                  Open first record
                </button>
              }
            />
          </Panel>
        )}
      </div>

      <Panel label="HANDLING" title="How to read this view">
        <div className="control-grid">
          <div className="control">
            <span className="u-label">Observation, not verdict</span>
            <p>
              An indicator recorded here is an address, name or digest that a source reported in some
              context. It is never described as an attacker, and category labels repeat what the
              source claimed.
            </p>
          </div>
          <div className="control">
            <span className="u-label">Corroboration</span>
            <p>
              Repeated rows from one source are merged but never counted as independent corroboration.
              A record reaches <code>verified</code> only when two distinct sources each declared it
              verified.
            </p>
          </div>
          <div className="control">
            <span className="u-label">Confidence</span>
            <p>
              Confidence is shown only when a contributing source declared it. A missing value stays
              missing rather than being rendered as zero or estimated by the interface.
            </p>
          </div>
          <div className="control">
            <span className="u-label">Filter defaults</span>
            <p>
              The explorer opens on the complete dataset. Filters narrow the provider query, and the
              result count always reflects the filtered set, not a fabricated total.
            </p>
          </div>
        </div>
      </Panel>

      <p className="u-text-tertiary">
        Query state is local to this view. No search term, filter or record selection is transmitted
        anywhere, and the dataset is read from bundled files without a network request.
        {explorer.state.phase === 'ready'
          ? ` Page retrieved ${formatUtcDateTime(explorer.state.retrievedAt)}.`
          : ''}
      </p>
    </>
  );
}

