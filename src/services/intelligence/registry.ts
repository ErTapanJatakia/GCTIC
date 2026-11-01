/**
 * Provider registry.
 *
 * Exactly one connector is registered in this build: the local JSON/GeoJSON
 * adapter, which reads a bundled synthetic demonstration dataset. No external
 * feed is integrated, no credential exists and no network collection occurs.
 * The registry remains the seam through which further connectors attach, and
 * the UI reports whatever is registered rather than assuming a fixed list.
 */

import { assertValidDescriptor } from './provider';
import type { ProviderHealth, ProviderStatus, ThreatIntelProvider } from './provider';
import {
  LOCAL_PROVIDER_ID,
  createLocalFileProvider,
  loadBundledSyntheticDataset,
} from './local-file-provider';

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
 * The bundled local dataset adapter. Its loader is lazy, so importing this
 * module performs no I/O and cannot delay first paint.
 */
export const localDatasetProvider = createLocalFileProvider({
  load: loadBundledSyntheticDataset,
});

/**
 * The application-wide registry. Registration happens here, never from
 * presentation components.
 */
export const providerRegistry: ProviderRegistry = createProviderRegistry([
  localDatasetProvider,
]);

export { LOCAL_PROVIDER_ID };

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
