import { describe, expect, it, vi } from 'vitest';

import { createLocalFileProvider } from './local-file-provider';
import type { LocalDatasetBundle } from './local-file-provider';

const NOW = new Date('2026-11-01T09:00:00.000Z');

function observation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    recordId: 'obs-1',
    sourceId: 'lab',
    indicator: '192.0.2.10',
    category: 'scanning',
    firstSeen: '2026-10-01T00:00:00.000Z',
    lastSeen: '2026-10-20T00:00:00.000Z',
    confidence: 40,
    assessment: 'synthetic',
    reliability: 'low',
    tags: ['demo'],
    ...overrides,
  };
}

function bundle(observations: readonly unknown[] = [observation()]): LocalDatasetBundle {
  return {
    dataset: {
      datasetId: 'fixture-dataset',
      generatedAt: '2026-10-31T00:00:00.000Z',
      sources: [
        { sourceId: 'lab', sourceName: 'Lab Feed', sourceType: 'synthetic' },
        { sourceId: 'mirror', sourceName: 'Mirror Feed', sourceType: 'synthetic' },
      ],
      observations,
    },
  };
}

function createProvider(load = vi.fn(async () => bundle())) {
  return { provider: createLocalFileProvider({ load, now: () => NOW }), load };
}

describe('local file provider', () => {
  it('reports health with record counts and dataset freshness', async () => {
    const { provider } = createProvider();
    const health = await provider.checkHealth();

    expect(health.status).toBe('online');
    expect(health.checkedAt).toBe(NOW.toISOString());
    expect(health.message).toContain('dataset generated 2026-10-31T00:00:00.000Z');
    expect(health.message).toContain('latest observation 2026-10-20T00:00:00.000Z');
  });

  it('reports degraded health for an empty dataset', async () => {
    const { provider } = createProvider(vi.fn(async () => bundle([])));
    const health = await provider.checkHealth();

    expect(health.status).toBe('degraded');
    expect(health.message).toContain('contained no valid records');
  });

  it('reports offline health instead of throwing when the dataset is unavailable', async () => {
    const { provider } = createProvider(
      vi.fn(async () => {
        throw new Error('dataset file missing');
      }),
    );

    const health = await provider.checkHealth();

    expect(health.status).toBe('offline');
    expect(health.message).toContain('dataset file missing');
    await expect(provider.listIndicators({ limit: 5 })).rejects.toThrow(/dataset file missing/);
  });

  it('loads the dataset lazily and caches it across calls', async () => {
    const { provider, load } = createProvider();

    expect(load).not.toHaveBeenCalled();

    await provider.listIndicators({ limit: 5 });
    await provider.checkHealth();
    await provider.listIndicators({ limit: 5 });

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('paginates deterministically with an opaque cursor and matching total', async () => {
    const observations = [
      observation({ recordId: 'obs-1', indicator: '192.0.2.1', lastSeen: '2026-10-01T00:00:00.000Z' }),
      observation({ recordId: 'obs-2', indicator: '192.0.2.2', lastSeen: '2026-10-02T00:00:00.000Z' }),
      observation({ recordId: 'obs-3', indicator: '192.0.2.3', lastSeen: '2026-10-03T00:00:00.000Z' }),
    ];
    const { provider } = createProvider(vi.fn(async () => bundle(observations)));

    const first = await provider.listIndicators({ limit: 2 });
    const second = await provider.listIndicators({
      limit: 2,
      ...(first.nextCursor !== undefined ? { cursor: first.nextCursor } : {}),
    });

    expect(first.total).toBe(3);
    expect(first.items.map((item) => item.value)).toEqual(['192.0.2.3', '192.0.2.2']);
    expect(first.nextCursor).toBeDefined();
    expect(second.items.map((item) => item.value)).toEqual(['192.0.2.1']);
    expect(second.nextCursor).toBeUndefined();
  });

  it('filters by type, category, grade and free-text search', async () => {
    const observations = [
      observation({ recordId: 'obs-1', indicator: '192.0.2.1', category: 'scanning' }),
      observation({ recordId: 'obs-2', indicator: '198.51.100.7', category: 'phishing' }),
      observation({ recordId: 'obs-3', indicator: 'login.example.com', category: 'phishing' }),
    ];
    const { provider } = createProvider(vi.fn(async () => bundle(observations)));

    const byType = await provider.listIndicators({ limit: 10, types: ['domain'] });
    const byCategory = await provider.listIndicators({ limit: 10, categories: ['phishing'] });
    const bySearch = await provider.listIndicators({ limit: 10, search: '198.51.100' });
    const byGrade = await provider.listIndicators({ limit: 10, assessments: ['verified'] });

    expect(byType.items.map((item) => item.value)).toEqual(['login.example.com']);
    expect(byCategory.items).toHaveLength(2);
    expect(bySearch.items.map((item) => item.value)).toEqual(['198.51.100.7']);
    expect(byGrade.total).toBe(0);
  });

  it('clamps page sizes into a sane range', async () => {
    const observations = [
      observation({ recordId: 'obs-1', indicator: '192.0.2.1' }),
      observation({ recordId: 'obs-2', indicator: '192.0.2.2' }),
    ];
    const { provider } = createProvider(vi.fn(async () => bundle(observations)));

    expect((await provider.listIndicators({ limit: 0 })).items).toHaveLength(1);
    expect((await provider.listIndicators({ limit: 10_000 })).items).toHaveLength(2);
  });

  it('rejects an unrecognised cursor', async () => {
    const { provider } = createProvider();

    await expect(provider.listIndicators({ limit: 5, cursor: 'nonsense' })).rejects.toThrow(
      /Invalid pagination cursor/,
    );
  });

  it('aborts an in-flight request when the signal is cancelled', async () => {
    const { provider } = createProvider();
    const controller = new AbortController();
    controller.abort();

    await expect(
      provider.listIndicators({ limit: 5 }, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    const health = await provider.checkHealth(controller.signal);

    expect(health.status).toBe('offline');
    expect(health.message).toContain('cancelled');
  });

  it('never lets a malformed dataset escape as an unhandled rejection', async () => {
    const { provider } = createProvider(vi.fn(async () => ({ dataset: { observations: [] } })));

    const health = await provider.checkHealth();

    expect(health.status).toBe('offline');
    expect(health.message).toMatch(/at least one usable source/);
  });
});
