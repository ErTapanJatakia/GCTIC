import { useProviderHealth } from '@/hooks/useProviderHealth';
import { formatUtcDateTime } from '@/lib/format';
import { providerRegistry } from '@/services/intelligence/registry';
import type { ProviderStatus } from '@/services/intelligence/provider';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Panel } from '@/components/ui/Panel';
import { StatusDot } from '@/components/ui/StatusDot';
import type { StatusTone } from '@/components/ui/StatusDot';

const STATUS_TONES: Readonly<Record<ProviderStatus, StatusTone>> = {
  online: 'online',
  degraded: 'degraded',
  offline: 'offline',
  unconfigured: 'idle',
};

const STATUS_LABELS: Readonly<Record<ProviderStatus, string>> = {
  online: 'Online',
  degraded: 'Degraded',
  offline: 'Offline',
  unconfigured: 'Unconfigured',
};

export function ProviderHealthPanel() {
  const { state, reload } = useProviderHealth();
  const registered = providerRegistry.list();

  return (
    <Panel
      label="COLLECTION"
      title="Intelligence provider adapters"
      description="Registered adapters and their reported health, including dataset freshness where the adapter can report it."
      actions={
        state.phase === 'ready' ? (
          <Badge variant={state.health.length === 0 ? 'neutral' : 'success'}>
            {state.health.length} reporting
          </Badge>
        ) : null
      }
    >
      {state.phase === 'loading' ? <LoadingState label="Checking provider health" rows={2} /> : null}

      {state.phase === 'error' ? (
        <ErrorState
          title="Provider health unavailable"
          description={`The provider registry could not be queried: ${state.message}`}
          onRetry={reload}
        />
      ) : null}

      {state.phase === 'ready' && state.health.length === 0 ? (
        <EmptyState
          title="No provider adapters registered"
          description="No intelligence provider is registered in this build. Connectors attach through the provider contract, never from presentation components."
          hint="Registry is empty"
        />
      ) : null}

      {state.phase === 'ready' && state.health.length > 0 ? (
        <div className="table-scroll">
          <table className="data-table">
            <caption className="u-visually-hidden">Registered intelligence provider health</caption>
            <thead>
              <tr>
                <th scope="col">Provider</th>
                <th scope="col">Kind</th>
                <th scope="col">Status</th>
                <th scope="col">Checked (UTC)</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>
              {state.health.map((health) => {
                const descriptor = registered.find(
                  (provider) => provider.descriptor.id === health.providerId,
                );

                return (
                  <tr key={health.providerId}>
                    <th scope="row" className="data-table__rowhead">
                      <span className="data-table__rowlabel">
                        {descriptor?.descriptor.displayName ?? health.providerId}
                      </span>
                      <span className="data-table__mono">{health.providerId}</span>
                    </th>
                    <td className="data-table__mono">
                      {descriptor?.descriptor.kind ?? 'unknown'}
                    </td>
                    <td>
                      <StatusDot
                        tone={STATUS_TONES[health.status]}
                        label={STATUS_LABELS[health.status]}
                      />
                    </td>
                    <td className="data-table__mono">{formatUtcDateTime(health.checkedAt)}</td>
                    <td>{health.message ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}
