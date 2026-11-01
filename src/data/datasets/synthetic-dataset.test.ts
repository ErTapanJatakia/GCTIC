import { describe, expect, it } from 'vitest';

import { ingestDataset } from '@/services/intelligence/ingest';
import type { ThreatIndicator } from '@/types/intelligence';
import dataset from './synthetic-indicators.json';
import geoRaw from './synthetic-geo.geojson?raw';

const RETRIEVED_AT = '2026-11-01T00:00:00.000Z';

const DOCUMENTATION_PREFIXES = ['192.0.2.', '198.51.100.', '203.0.113.'];

const RESERVED_HOST_SUFFIXES = [
  'example',
  'example.com',
  'example.org',
  'example.net',
];

const parsedDataset = dataset as {
  sources: { sourceId: string; sourceType: string }[];
  observations: { recordId: string; sourceId: string; indicator: string; assessment: string }[];
};

const ingested = ingestDataset({
  dataset,
  geo: JSON.parse(geoRaw) as unknown,
  retrievedAt: RETRIEVED_AT,
});

function hostOf(record: ThreatIndicator): string {
  return record.iocType === 'url' ? new URL(record.value).hostname : record.value;
}

function isReservedHost(host: string): boolean {
  return RESERVED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

describe('bundled synthetic dataset', () => {
  it('is labelled synthetic on every declared source', () => {
    expect(parsedDataset.sources.length).toBeGreaterThanOrEqual(2);

    for (const source of parsedDataset.sources) {
      expect(source.sourceType, source.sourceId).toBe('synthetic');
    }
  });

  it('labels every observation SYNTHETIC and never claims verification', () => {
    for (const observation of parsedDataset.observations) {
      expect(observation.assessment, observation.recordId).toBe('synthetic');
    }
  });

  it('ingests every observation without rejection or fabrication', () => {
    expect(ingested.issues).toEqual([]);
    expect(ingested.stats.observations).toBe(parsedDataset.observations.length);
    expect(ingested.stats.accepted).toBe(parsedDataset.observations.length);
    expect(ingested.stats.rejected).toBe(0);
    expect(ingested.stats.distinctSources).toBe(parsedDataset.sources.length);
    expect(ingested.indicators.length).toBeGreaterThan(0);
  });

  it('keeps every ingested record graded synthetic', () => {
    for (const record of ingested.indicators) {
      expect(record.assessment, record.value).toBe('synthetic');
    }
  });

  it('uses documentation-reserved IPv4 ranges only', () => {
    for (const record of ingested.indicators) {
      if (record.iocType !== 'ipv4') {
        continue;
      }

      expect(
        DOCUMENTATION_PREFIXES.some((prefix) => record.value.startsWith(prefix)),
        record.value,
      ).toBe(true);
    }
  });

  it('uses the IPv6 documentation prefix only', () => {
    for (const record of ingested.indicators) {
      if (record.iocType !== 'ipv6') {
        continue;
      }

      expect(record.value.toLowerCase().startsWith('2001:db8:'), record.value).toBe(true);
    }
  });

  it('uses reserved example namespaces for every domain and URL', () => {
    for (const record of ingested.indicators) {
      if (record.iocType !== 'domain' && record.iocType !== 'url') {
        continue;
      }

      expect(isReservedHost(hostOf(record)), record.value).toBe(true);
      expect(record.value.toLowerCase()).not.toContain('javascript:');
    }
  });

  it('uses repetition-pattern placeholders for every file hash', () => {
    const hashes = ingested.indicators.filter((record) =>
      ['md5', 'sha1', 'sha256'].includes(record.iocType),
    );

    expect(hashes).toHaveLength(3);

    for (const record of hashes) {
      expect(record.value, record.value).toMatch(/^(.)\1+$/);
    }
  });

  it('retains provenance and source distinction for merged observations', () => {
    const merged = ingested.indicators.find((record) => record.value === '192.0.2.14');

    expect(merged?.corroboration).toMatchObject({
      observations: 3,
      distinctSources: 2,
      multiSource: true,
      repeatedFromSameSource: 1,
    });
    expect(merged?.observations).toHaveLength(3);
    expect(merged?.provenance.sourceId).toBe('synthetic-lab');
  });

  it('normalises the uppercase trailing-dot observation onto the same record', () => {
    const merged = ingested.indicators.find((record) => record.value === 'update.example.org');

    expect(merged?.observations).toHaveLength(2);
    // The earliest observation already matched the canonical form, so no
    // divergent original value is duplicated onto the record.
    expect(merged?.originalValue).toBeUndefined();
    expect(merged?.observations?.map((entry) => entry.originalValue)).toContain(
      'UPDATE.example.org.',
    );
  });

  it('declares observation locations as synthetic and imprecise', () => {
    const geo = JSON.parse(geoRaw) as {
      features: { geometry: { coordinates: number[] }; properties: Record<string, unknown> }[];
    };

    expect(geo.features.length).toBeGreaterThan(0);

    for (const feature of geo.features) {
      expect(feature.properties.precision).toBe('unknown');
      expect(String(feature.properties.placeName)).toContain('Synthetic');
    }

    const located = ingested.indicators.filter((record) => record.geo !== undefined);

    expect(located).toHaveLength(geo.features.length);

    for (const record of located) {
      expect(record.geo?.precision).toBe('unknown');
    }
  });
});
