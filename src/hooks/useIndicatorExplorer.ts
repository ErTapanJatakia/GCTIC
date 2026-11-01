import { useCallback, useEffect, useState } from 'react';

import { LOCAL_PROVIDER_ID, providerRegistry } from '@/services/intelligence/registry';
import type { ProviderHealth } from '@/services/intelligence/provider';
import type { Assessment, IocType, ThreatCategory, ThreatIndicator } from '@/types/intelligence';

export type IndicatorTypeFilter = IocType | 'all';
export type CategoryFilter = ThreatCategory | 'all';
export type AssessmentFilter = Assessment | 'all';

export interface ExplorerFilters {
  readonly search: string;
  readonly type: IndicatorTypeFilter;
  readonly category: CategoryFilter;
  readonly assessment: AssessmentFilter;
}

export const INITIAL_FILTERS: ExplorerFilters = {
  search: '',
  type: 'all',
  category: 'all',
  assessment: 'all',
};

export type ExplorerState =
  | { readonly phase: 'loading' }
  | {
      readonly phase: 'ready';
      readonly items: readonly ThreatIndicator[];
      readonly total: number;
      readonly retrievedAt: string;
    }
  | { readonly phase: 'error'; readonly message: string };

export interface IndicatorExplorer {
  readonly state: ExplorerState;
  readonly health: ProviderHealth | null;
  readonly providerLabel: string;
  readonly filters: ExplorerFilters;
  readonly setFilters: (next: ExplorerFilters) => void;
  readonly resetFilters: () => void;
  readonly hasActiveFilters: boolean;
  readonly pageNumber: number;
  readonly pageCount: number;
  readonly hasNextPage: boolean;
  readonly canGoBack: boolean;
  readonly nextPage: () => void;
  readonly previousPage: () => void;
  readonly reload: () => void;
}

export const EXPLORER_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Read indicators from the registered local provider.
 *
 * Requests are aborted when filters change, so a slow or failing dataset can
 * never leave stale records on screen. Pagination uses opaque provider cursors
 * and keeps a stack so the analyst can step back without re-querying offsets.
 */
export function useIndicatorExplorer(): IndicatorExplorer {
  const provider = providerRegistry.get(LOCAL_PROVIDER_ID);

  const [filters, setFiltersState] = useState<ExplorerFilters>(INITIAL_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<readonly (string | undefined)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ExplorerState>({ phase: 'loading' });
  const [health, setHealth] = useState<ProviderHealth | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    if (!provider) {
      setState({ phase: 'error', message: 'No intelligence provider is registered in this build.' });
      return;
    }

    let active = true;

    void (async () => {
      try {
        const result = await provider.checkHealth();

        if (active) {
          setHealth(result);
        }
      } catch (error) {
        if (active) {
          setHealth({
            providerId: LOCAL_PROVIDER_ID,
            status: 'offline',
            checkedAt: new Date().toISOString(),
            message: error instanceof Error ? error.message.slice(0, 240) : 'Health check failed.',
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [provider, attempt]);

  useEffect(() => {
    if (!provider) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    setState({ phase: 'loading' });

    void (async () => {
      try {
        const page = await provider.listIndicators(
          {
            limit: EXPLORER_PAGE_SIZE,
            ...(cursor !== undefined ? { cursor } : {}),
            ...(debouncedSearch.length > 0 ? { search: debouncedSearch } : {}),
            ...(filters.type !== 'all' ? { types: [filters.type] } : {}),
            ...(filters.category !== 'all' ? { categories: [filters.category] } : {}),
            ...(filters.assessment !== 'all' ? { assessments: [filters.assessment] } : {}),
          },
          controller.signal,
        );

        if (!active) {
          return;
        }

        setNextCursor(page.nextCursor);
        setState({
          phase: 'ready',
          items: page.items,
          total: page.total ?? page.items.length,
          retrievedAt: page.retrievedAt,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setState({
          phase: 'error',
          message:
            error instanceof Error ? error.message : 'Indicators could not be loaded.',
        });
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [provider, debouncedSearch, filters.type, filters.category, filters.assessment, cursor, attempt]);

  const setFilters = useCallback((next: ExplorerFilters) => {
    setFiltersState(next);
    setCursor(undefined);
    setHistory([]);
    setNextCursor(undefined);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(INITIAL_FILTERS);
    setCursor(undefined);
    setHistory([]);
    setNextCursor(undefined);
  }, []);

  const nextPage = useCallback(() => {
    if (nextCursor === undefined) {
      return;
    }

    setHistory((stack) => [...stack, cursor]);
    setCursor(nextCursor);
  }, [cursor, nextCursor]);

  const previousPage = useCallback(() => {
    if (history.length === 0) {
      return;
    }

    setHistory(history.slice(0, -1));
    setCursor(history[history.length - 1]);
  }, [history]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  const total = state.phase === 'ready' ? state.total : 0;
  const pageCount = Math.max(1, Math.ceil(total / EXPLORER_PAGE_SIZE));
  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.type !== 'all' ||
    filters.category !== 'all' ||
    filters.assessment !== 'all';

  return {
    state,
    health,
    providerLabel: provider?.descriptor.displayName ?? 'Unavailable',
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    pageNumber: history.length + 1,
    pageCount,
    hasNextPage: nextCursor !== undefined,
    canGoBack: history.length > 0,
    nextPage,
    previousPage,
    reload,
  };
}
