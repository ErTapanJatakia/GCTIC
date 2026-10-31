import { useCallback, useEffect, useState } from 'react';

import { collectProviderHealth, providerRegistry } from '@/services/intelligence/registry';
import type { ProviderHealth } from '@/services/intelligence/provider';

export type ProviderHealthState =
  | { readonly phase: 'loading' }
  | { readonly phase: 'ready'; readonly health: readonly ProviderHealth[] }
  | { readonly phase: 'error'; readonly message: string };

export interface UseProviderHealthResult {
  readonly state: ProviderHealthState;
  readonly reload: () => void;
}

/**
 * Resolve health for registered intelligence providers.
 *
 * The registry is empty in Phase 1, so the hook resolves to an empty result and
 * the UI renders an empty state. Failures surface as an error state with an
 * explicit retry rather than being hidden.
 */
export function useProviderHealth(): UseProviderHealthResult {
  const [state, setState] = useState<ProviderHealthState>({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setState({ phase: 'loading' });

    void (async () => {
      try {
        const health = await collectProviderHealth(providerRegistry.list(), controller.signal);

        if (active) {
          setState({ phase: 'ready', health });
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          phase: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Provider health check failed for an unknown reason.',
        });
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  return { state, reload };
}
