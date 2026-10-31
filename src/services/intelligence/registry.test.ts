import { describe, expect, it } from 'vitest';

import { collectProviderHealth, createProviderRegistry } from './registry';
import type { ProviderHealth, ThreatIntelProvider } from './provider';

function createFixtureProvider(
  id: string,
  checkHealth: () => Promise<ProviderHealth> = async () => ({
    providerId: id,
    status: 'online',
    checkedAt: '2026-10-31T20:00:00.000Z',
  }),
): ThreatIntelProvider {
  return {
    descriptor: {
      id,
      displayName: `Fixture ${id}`,
      kind: 'local-file',
      capabilities: ['indicators'],
      requiresCredentials: false,
      attribution: 'Test fixture — synthetic data only',
    },
    checkHealth,
    listIndicators: async () => ({
      items: [],
      retrievedAt: '2026-10-31T20:00:00.000Z',
    }),
  };
}

describe('provider registry', () => {
  it('starts empty — no connectors are registered in Phase 1', () => {
    const registry = createProviderRegistry();

    expect(registry.size()).toBe(0);
    expect(registry.list()).toEqual([]);
    expect(registry.get('any-provider')).toBeUndefined();
  });

  it('registers and resolves a provider', () => {
    const registry = createProviderRegistry();
    registry.register(createFixtureProvider('fixture-a'));

    expect(registry.size()).toBe(1);
    expect(registry.get('fixture-a')?.descriptor.displayName).toBe('Fixture fixture-a');
  });

  it('rejects duplicate provider identifiers', () => {
    const registry = createProviderRegistry();
    registry.register(createFixtureProvider('fixture-a'));

    expect(() => registry.register(createFixtureProvider('fixture-a'))).toThrow(
      /already registered/,
    );
  });

  it('rejects malformed descriptors', () => {
    const registry = createProviderRegistry();
    const invalid = createFixtureProvider('fixture-a');
    const malformed: ThreatIntelProvider = {
      ...invalid,
      descriptor: { ...invalid.descriptor, id: 'Invalid ID' },
    };

    expect(() => registry.register(malformed)).toThrow(/kebab-case/);
  });
});

describe('collectProviderHealth', () => {
  it('returns health for each registered provider', async () => {
    const providers = [createFixtureProvider('fixture-a'), createFixtureProvider('fixture-b')];
    const health = await collectProviderHealth(providers);

    expect(health).toHaveLength(2);
    expect(health.every((entry) => entry.status === 'online')).toBe(true);
  });

  it('isolates a failing provider without dropping the others', async () => {
    const providers = [
      createFixtureProvider('healthy'),
      createFixtureProvider('failing', async () => {
        throw new Error('upstream timeout');
      }),
    ];

    const health = await collectProviderHealth(providers);
    const failing = health.find((entry) => entry.providerId === 'failing');

    expect(health).toHaveLength(2);
    expect(failing?.status).toBe('offline');
    expect(failing?.message).toContain('upstream timeout');
  });
});
