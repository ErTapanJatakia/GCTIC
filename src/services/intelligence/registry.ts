/**
 * Provider registry.
 *
 * Phase 1 registers no connectors: no external threat feed is integrated, no
 * credentials exist and no network collection occurs. The registry is the seam
 * through which Phase 2 connectors will be attached, and the UI reports the
 * empty state honestly rather than fabricating data.
 */

import { assertValidDescriptor } from './provider';
import type { ProviderHealth, ProviderStatus, ThreatIntelProvider } from './provider';

export interface ProviderRegistry {
  list(): readonly ThreatIntelProvider[];
  get(id: string): ThreatIntelProvider | undefined;
  register(provider: ThreatIntelProvider): void;
  size(): number;
}

export function createProviderRegistry(
  initialProviders: readonly ThreatIntelProvider[] = [],
): ProviderRegistry {
  const providers = new Map<string, ThreatIntelProvider>();

  const register = (provider: ThreatIntelProvider): void => {
    assertValidDescriptor(provider.descriptor);

    if (providers.has(provider.descriptor.id)) {
      throw new TypeError(
        `A provider with id "${provider.descriptor.id}" is already registered.`,
      );
    }

    providers.set(provider.descriptor.id, provider);
  };

  for (const provider of initialProviders) {
    register(provider);
  }

  return {
    list: () => [...providers.values()],
    get: (id: string) => providers.get(id),
    register,
    size: () => providers.size,
  };
}

/**
 * The application-wide registry. Phase 1 intentionally leaves it empty.
 * Registration will occur in the intelligence-sources module (Phase 2), never
 * from presentation components.
 */
export const providerRegistry: ProviderRegistry = createProviderRegistry();

/**
 * Collect health for every registered provider.
 *
 * A failing provider must not take down reporting for the others, so failures
 * are converted into an `offline` status carrying a bounded diagnostic message.
 * The error itself is still surfaced to the caller through the status, never
 * silently swallowed.
 */
export async function collectProviderHealth(
  providers: readonly ThreatIntelProvider[],
  signal?: AbortSignal,
): Promise<readonly ProviderHealth[]> {
  const results = await Promise.all(
    providers.map(async (provider): Promise<ProviderHealth> => {
      try {
        return await provider.checkHealth(signal);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Health check failed.';
        const status: ProviderStatus = 'offline';

        return {
          providerId: provider.descriptor.id,
          status,
          checkedAt: new Date().toISOString(),
          message: message.slice(0, 240),
        };
      }
    }),
  );

  return results;
}
