import { describe, expect, it } from 'vitest';

import { ingestDataset } from './ingest';

const RETRIEVED_AT = '2026-11-01T00:00:00.000Z';

interface FixtureSource {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceType: string;
  readonly sourceReference?: string;
  readonly license?: string;
  readonly notes?: string;
}

function source(overrides: Partial<FixtureSource> = {}): FixtureSource {
  return {
    sourceId: 'lab',
    sourceName: 'Lab Feed',
    sourceType: 'synthetic',
    sourceReference: 'https://example.org/synthetic/lab',
    license: 'CC0-1.0',
    notes: 'Fixture source for ingestion tests.',
    ...overrides,
  };
}

function observation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    recordId: 'obs-1',
    sourceId: 'lab',
    indicator: '192.0.2.10',
    category: 'scanning',
    firstSeen: '2026-10-01T00:00:00.000Z',
    assessment: 'synthetic',
    reliability: 'low',
    ...overrides,
  };
}

function dataset(
  observations: readonly unknown[],
  sources: readonly unknown[] = [source()],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    datasetId: 'fixture-dataset',
    generatedAt: '2026-10-31T00:00:00.000Z',
    sources,
    observations,
    ...extra,
  };
}

function ingest(input: unknown, geo?: unknown) {
  return ingestDataset({ dataset: input, geo, retrievedAt: RETRIEVED_AT });
}

describe('ingestDataset', () => {
  it('merges repeated observations of one indicator into a single record', () => {
    const result = ingest(
      dataset([
        observation({ recordId: 'obs-1', lastSeen: '2026-10-05T00:00:00.000Z' }),
        observation({
          recordId: 'obs-2',
          indicator: '192.0.2.10',
          firstSeen: '2026-10-02T00:00:00.000Z',
          lastSeen: '2026-10-09T00:00:00.000Z',
        }),
      ]),
    );

    expect(result.indicators).toHaveLength(1);
    expect(result.stats).toMatchObject({
      observations: 2,
      accepted: 2,
      rejected: 0,
      indicators: 1,
      mergedObservations: 1,
      distinctSources: 1,
    });

    const record = result.indicators[0];

    expect(record?.corroboration).toEqual({
      observations: 2,
      distinctSources: 1,
      multiSource: false,
      repeatedFromSameSource: 1,
    });
    expect(record?.firstSeen).toBe('2026-10-01T00:00:00.000Z');
    expect(record?.lastSeen).toBe('2026-10-09T00:00:00.000Z');
  });

  it('does not treat repeated rows from one source as independent corroboration', () => {
    const result = ingest(
      dataset([
        observation({ recordId: 'obs-1', assessment: 'verified' }),
        observation({ recordId: 'obs-2', assessment: 'verified' }),
      ]),
    );

    // One source declaring "verified" cannot corroborate itself.
    expect(result.indicators[0]?.assessment).toBe('inferred');
    expect(result.indicators[0]?.corroboration?.multiSource).toBe(false);
  });

  it('marks a record verified only when two distinct sources each verify it', () => {
    const result = ingest(
      dataset(
        [
          observation({ recordId: 'obs-1', sourceId: 'lab', assessment: 'verified' }),
          observation({ recordId: 'obs-2', sourceId: 'mirror', assessment: 'verified' }),
        ],
        [source(), source({ sourceId: 'mirror', sourceName: 'Mirror Feed' })],
      ),
    );

    expect(result.indicators[0]?.assessment).toBe('verified');
    expect(result.indicators[0]?.corroboration).toMatchObject({
      distinctSources: 2,
      multiSource: true,
      repeatedFromSameSource: 0,
    });
  });

  it('never promotes synthetic observations into operational grades', () => {
    const result = ingest(
      dataset(
        [
          observation({ recordId: 'obs-1', sourceId: 'lab', assessment: 'verified' }),
          observation({ recordId: 'obs-2', sourceId: 'mirror', assessment: 'synthetic' }),
        ],
        [source(), source({ sourceId: 'mirror', sourceName: 'Mirror Feed' })],
      ),
    );

    expect(result.indicators[0]?.assessment).toBe('synthetic');
  });

  it('preserves original values, per-source observations and provenance', () => {
    const result = ingest(
      dataset([
        observation({ recordId: 'obs-1', indicator: 'UPDATE.example.ORG.' }),
        observation({ recordId: 'obs-2', indicator: 'update.example.org' }),
      ]),
    );

    const record = result.indicators[0];

    expect(record?.value).toBe('update.example.org');
    expect(record?.originalValue).toBe('UPDATE.example.ORG.');
    expect(record?.observations?.map((entry) => entry.originalValue)).toEqual([
      'UPDATE.example.ORG.',
      'update.example.org',
    ]);
    expect(record?.provenance).toMatchObject({
      sourceId: 'lab',
      sourceName: 'Lab Feed',
      sourceType: 'synthetic',
      retrievedAt: RETRIEVED_AT,
      license: 'CC0-1.0',
    });
    expect(record?.provenance.sourceUrl).toBe('https://example.org/synthetic/lab');
  });

  it('leaves absent metadata absent instead of fabricating it', () => {
    const result = ingest(dataset([observation()]));
    const record = result.indicators[0];

    expect(record).toBeDefined();
    expect(record?.confidence).toBeUndefined();
    expect(record?.lastSeen).toBeUndefined();
    expect(record?.geo).toBeUndefined();
    expect(record?.originalValue).toBeUndefined();
  });

  it('clamps declared confidence into the 0–100 range', () => {
    const result = ingest(
      dataset([
        observation({ recordId: 'obs-1', confidence: 140 }),
        observation({ recordId: 'obs-2', confidence: -20 }),
      ]),
    );

    expect(result.indicators[0]?.confidence).toBe(100);
  });

  it('rejects malformed observations individually and keeps the valid ones', () => {
    const result = ingest(
      dataset([
        observation({ recordId: 'obs-valid' }),
        observation({ recordId: 'obs-bad-indicator', indicator: 'not an indicator' }),
        observation({ recordId: 'obs-unknown-source', sourceId: 'missing-source' }),
        observation({ recordId: 'obs-bad-time', firstSeen: 'yesterday' }),
        observation({ recordId: 'obs-reversed', firstSeen: '2026-10-10T00:00:00.000Z', lastSeen: '2026-10-01T00:00:00.000Z' }),
        observation({ recordId: 'obs-bad-grade', assessment: 'confirmed' }),
        'not-an-object',
        null,
      ]),
    );

    expect(result.indicators).toHaveLength(1);
    expect(result.indicators[0]?.value).toBe('192.0.2.10');
    expect(result.stats.rejected).toBe(7);
    expect(result.stats.accepted).toBe(1);

    const codes = result.issues.map((issue) => issue.code);

    expect(codes).toEqual(
      expect.arrayContaining([
        'invalid-indicator',
        'unresolved-source',
        'invalid-first-seen',
        'inconsistent-timeline',
        'invalid-assessment',
        'invalid-record',
      ]),
    );
  });

  it('discards duplicate record identifiers', () => {
    const result = ingest(
      dataset([
        observation({ recordId: 'obs-1' }),
        observation({ recordId: 'obs-1', indicator: '198.51.100.9' }),
      ]),
    );

    expect(result.indicators).toHaveLength(1);
    expect(result.stats.rejected).toBe(1);
    expect(result.issues.some((issue) => issue.code === 'duplicate-record-id')).toBe(true);
  });

  it('drops an unsafe source reference without discarding the observation', () => {
    const result = ingest(
      dataset([observation({ sourceReference: 'javascript:alert(1)' })]),
    );

    expect(result.indicators).toHaveLength(1);
    expect(result.indicators[0]?.provenance.sourceUrl).toBe('https://example.org/synthetic/lab');
    expect(result.issues.some((issue) => issue.code === 'invalid-source-reference')).toBe(true);
  });

  it('attaches a location only to the matching validated indicator', () => {
    const geo = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-30.5, 20.25] },
          properties: { indicator: '192.0.2.10', precision: 'unknown' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [10, 10] },
          properties: { indicator: 'not valid', precision: 'country' },
        },
      ],
    };

    const result = ingest(
      dataset([observation(), observation({ recordId: 'obs-2', indicator: '203.0.113.5' })]),
      geo,
    );

    const located = result.indicators.find((record) => record.value === '192.0.2.10');
    const unlocated = result.indicators.find((record) => record.value === '203.0.113.5');

    expect(located?.geo).toEqual({
      point: { latitude: 20.25, longitude: -30.5 },
      precision: 'unknown',
    });
    expect(unlocated?.geo).toBeUndefined();
    expect(result.issues.some((issue) => issue.code === 'invalid-geo')).toBe(true);
  });

  it('handles an empty observation list as a degraded dataset, not a crash', () => {
    const result = ingest(dataset([]));

    expect(result.indicators).toEqual([]);
    expect(result.stats).toMatchObject({ observations: 0, accepted: 0, rejected: 0, indicators: 0 });
  });

  it('throws only when the dataset cannot be interpreted at all', () => {
    expect(() => ingest(null)).toThrow(/root must be an object/);
    expect(() => ingest({ sources: [source()] })).toThrow(/observations array/);
    expect(() => ingest({ datasetId: 'x', observations: [] })).toThrow(/at least one usable source/);
  });

  it('reports the dataset identity and declared generation time', () => {
    const result = ingest(dataset([observation()]));

    expect(result.datasetId).toBe('fixture-dataset');
    expect(result.generatedAt).toBe('2026-10-31T00:00:00.000Z');
  });
});
