/**
 * Local file-backed intelligence provider.
 *
 * Implements the existing `ThreatIntelProvider` contract against a bundled
 * JSON dataset plus an optional GeoJSON FeatureCollection. No network request,
 * credential or paid service is involved, and the adapter can be replaced by a
 * remote implementation without touching a single component.
 *
 * Failure behaviour is deliberately non-fatal: loading is lazy and cached, and
 * an unavailable or malformed dataset surfaces as an `offline` or `degraded`
 * health status plus a bounded error state in the interface. The rest of the
 * application keeps working.
 */

import type { Assessment, ThreatCategory } from '@/types/intelligence';
import { ingestDataset } from './ingest';
import type { IngestedDataset } from './ingest';
import type {
  IndicatorPage,
  IndicatorQuery,
  ProviderDescriptor,
  ProviderHealth,
  ThreatIntelProvider,
} from './provider';

export const LOCAL_PROVIDER_ID = 'local-synthetic-dataset';

export interface LocalDatasetBundle {
  readonly dataset: unknown;
  readonly geo?: unknown;
}

export interface LocalFileProviderOptions {
  readonly load: () => Promise<LocalDatasetBundle>;
  readonly now?: () => Date;
  readonly defaultPageSize?: number;
  readonly maxPageSize?: number;
}

export interface LocalFileProvider extends ThreatIntelProvider {
  /** Parsed dataset, loading and caching it on first use. */
  snapshot(): Promise<IngestedDataset>;
}

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;
const MAX_MESSAGE_LENGTH = 240;

const DESCRIPTOR: ProviderDescriptor = {
  id: LOCAL_PROVIDER_ID,
  displayName: 'Local synthetic dataset',
  kind: 'local-file',
  capabilities: ['indicators', 'geospatial'],
  requiresCredentials: false,
  attribution:
    'GCTIC bundled synthetic demonstration dataset — generated for development, not observed in the wild',
};

function encodeCursor(offset: number): string {
  return `c1-${offset.toString(36)}`;
}

function decodeCursor(cursor: string | undefined): number {
  if (cursor === undefined) {
    return 0;
  }

  const match = /^c1-([0-9a-z]{1,8})$/.exec(cursor);
  const decoded = Number.parseInt(match?.[1] ?? '', 36);

  if (!Number.isInteger(decoded) || decoded < 0) {
    throw new TypeError('Invalid pagination cursor.');
  }

  return decoded;
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Dataset could not be loaded.';

  return message.slice(0, MAX_MESSAGE_LENGTH);
}

function matchesQuery(record: IngestedDataset['indicators'][number], query: IndicatorQuery): boolean {
  if (query.types !== undefined && query.types.length > 0 && !query.types.includes(record.iocType)) {
    return false;
  }

  if (
    query.categories !== undefined &&
    query.categories.length > 0 &&
    !query.categories.includes(record.threatCategory ?? 'unknown')
  ) {
    return false;
  }

  if (
    query.assessments !== undefined &&
    query.assessments.length > 0 &&
    !query.assessments.includes(record.assessment)
  ) {
    return false;
  }

  if (query.since !== undefined) {
    const threshold = Date.parse(query.since);

    if (Number.isFinite(threshold) && Date.parse(record.firstSeen) < threshold) {
      return false;
    }
  }

  const term = query.search?.trim().toLowerCase();

  if (term !== undefined && term.length > 0) {
    const haystack = [
      record.value,
      record.originalValue ?? '',
      record.threatCategory ?? '',
      ...record.tags,
      ...(record.observations ?? []).map((observation) => observation.sourceName),
    ]
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(term)) {
      return false;
    }
  }

  return true;
}

/**
 * Create a provider over a lazily loaded local dataset.
 *
 * `load` is injected so tests can supply malformed, empty or failing datasets
 * without touching the bundled files.
 */
export function createLocalFileProvider(options: LocalFileProviderOptions): LocalFileProvider {
  const now = options.now ?? (() => new Date());
  const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const maxPageSize = options.maxPageSize ?? MAX_PAGE_SIZE;

  let cached: IngestedDataset | null = null;
  let inflight: Promise<IngestedDataset> | null = null;

  const loadDataset = async (): Promise<IngestedDataset> => {
    if (cached !== null) {
      return cached;
    }

    if (inflight !== null) {
      return inflight;
    }

    inflight = (async () => {
      const bundle = await options.load();
      const ingested = ingestDataset({
        dataset: bundle.dataset,
        geo: bundle.geo,
        retrievedAt: now().toISOString(),
      });

      cached = ingested;

      return ingested;
    })();

    try {
      return await inflight;
    } finally {
      inflight = null;
    }
  };

  return {
    descriptor: DESCRIPTOR,

    snapshot: loadDataset,

    async checkHealth(signal?: AbortSignal): Promise<ProviderHealth> {
      const checkedAt = now().toISOString();

      if (signal?.aborted === true) {
        return {
          providerId: LOCAL_PROVIDER_ID,
          status: 'offline',
          checkedAt,
          message: 'Health check was cancelled before it completed.',
        };
      }

      try {
        const snapshot = await loadDataset();
        const { stats } = snapshot;
        const errors = snapshot.issues.filter((issue) => issue.severity === 'error').length;
        const latest = snapshot.indicators
          .map((indicator) => indicator.lastSeen ?? indicator.firstSeen)
          .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

        const freshness = [
          snapshot.generatedAt !== undefined
            ? `dataset generated ${snapshot.generatedAt}`
            : 'dataset generation time not declared',
          latest !== undefined ? `latest observation ${latest}` : 'no observations',
        ].join(' · ');

        if (stats.indicators === 0) {
          return {
            providerId: LOCAL_PROVIDER_ID,
            status: 'degraded',
            checkedAt,
            message: `Dataset loaded but contained no valid records (${stats.rejected} rejected). ${freshness}.`,
          };
        }

        if (errors > 0) {
          return {
            providerId: LOCAL_PROVIDER_ID,
            status: 'degraded',
            checkedAt,
            message: `${stats.indicators} indicators from ${stats.accepted} observations; ${errors} records rejected. ${freshness}.`,
          };
        }

        return {
          providerId: LOCAL_PROVIDER_ID,
          status: 'online',
          checkedAt,
          message: `${stats.indicators} indicators from ${stats.accepted} observations across ${stats.distinctSources} sources. ${freshness}.`,
        };
      } catch (error) {
        return {
          providerId: LOCAL_PROVIDER_ID,
          status: 'offline',
          checkedAt,
          message: describeError(error),
        };
      }
    },

    async listIndicators(query: IndicatorQuery, signal?: AbortSignal): Promise<IndicatorPage> {
      if (signal?.aborted === true) {
        throw new DOMException('The indicator request was cancelled.', 'AbortError');
      }

      const snapshot = await loadDataset();
      const limit = Math.min(
        maxPageSize,
        Math.max(1, Math.trunc(Number.isFinite(query.limit) ? query.limit : defaultPageSize)),
      );
      const offset = decodeCursor(query.cursor);

      const matching = snapshot.indicators.filter((record) => matchesQuery(record, query));
      const sorted = [...matching].sort((a, b) => {
        const aRecency = Date.parse(a.lastSeen ?? a.firstSeen);
        const bRecency = Date.parse(b.lastSeen ?? b.firstSeen);

        return bRecency - aRecency || a.value.localeCompare(b.value) || a.id.localeCompare(b.id);
      });

      const items = sorted.slice(offset, offset + limit);
      const nextOffset = offset + items.length;

      return {
        items,
        total: sorted.length,
        retrievedAt: now().toISOString(),
        ...(nextOffset < sorted.length ? { nextCursor: encodeCursor(nextOffset) } : {}),
      };
    },
  };
}

/**
 * Load the bundled synthetic dataset.
 *
 * Both files are bundled build inputs, so this never touches the network. The
 * GeoJSON document is imported as text and parsed explicitly so an invalid
 * document fails through the provider's health reporting instead of breaking
 * the build.
 */
export async function loadBundledSyntheticDataset(): Promise<LocalDatasetBundle> {
  const [datasetModule, geoModule] = await Promise.all([
    import('@/data/datasets/synthetic-indicators.json'),
    import('@/data/datasets/synthetic-geo.geojson?raw'),
  ]);

  return {
    dataset: datasetModule.default,
    geo: JSON.parse(geoModule.default) as unknown,
  };
}

// Re-exported for callers that build queries without importing the domain module.
export type { Assessment, ThreatCategory };
