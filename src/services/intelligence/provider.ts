/**
 * Intelligence provider contract.
 *
 * The presentation layer depends only on this interface. A connector may be a
 * remote API client, a local JSON/GeoJSON file adapter or an in-browser mock —
 * each implementation is interchangeable and can be replaced without touching
 * any UI component.
 *
 * Security boundary: providers run on the trusted side of the data pipeline.
 * They must never receive, log or persist credentials from the browser, and
 * they must never automatically open, execute or download artefacts referenced
 * by an indicator.
 */

import type {
  Assessment,
  IocType,
  IntelCapability,
  ThreatCategory,
  ThreatIndicator,
} from '@/types/intelligence';

export type ProviderKind = 'remote-api' | 'local-file' | 'browser-mock';

export type ProviderStatus = 'online' | 'degraded' | 'offline' | 'unconfigured';

export interface ProviderDescriptor {
  readonly id: string;
  readonly displayName: string;
  readonly kind: ProviderKind;
  readonly capabilities: readonly IntelCapability[];
  /** True when the adapter requires a server-side credential to operate. */
  readonly requiresCredentials: boolean;
  /** Human-readable attribution string shown with every imported record. */
  readonly attribution: string;
  /** Public documentation reference, if any. */
  readonly documentationUrl?: string;
}

export interface ProviderHealth {
  readonly providerId: string;
  readonly status: ProviderStatus;
  /** ISO 8601 UTC timestamp of the health observation. */
  readonly checkedAt: string;
  readonly message?: string;
}

export interface IndicatorQuery {
  readonly limit: number;
  readonly cursor?: string;
  readonly types?: readonly IocType[];
  /** ISO 8601 UTC lower bound on first observation. */
  readonly since?: string;
  /** Free-text search over normalised and original values, tags and category. */
  readonly search?: string;
  readonly categories?: readonly ThreatCategory[];
  readonly assessments?: readonly Assessment[];
}

export interface IndicatorPage {
  readonly items: readonly ThreatIndicator[];
  readonly nextCursor?: string;
  /** Total number of records matching the query filters, before pagination. */
  readonly total?: number;
  /** Provenance of the page itself, retained on export. */
  readonly retrievedAt: string;
}

export interface ThreatIntelProvider {
  readonly descriptor: ProviderDescriptor;
  checkHealth(signal?: AbortSignal): Promise<ProviderHealth>;
  listIndicators(query: IndicatorQuery, signal?: AbortSignal): Promise<IndicatorPage>;
}

/**
 * Verify a descriptor before registration so a malformed connector cannot
 * poison the registry with duplicate or unsafe identifiers.
 */
export function assertValidDescriptor(descriptor: ProviderDescriptor): void {
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(descriptor.id)) {
    throw new TypeError(
      `Provider id "${descriptor.id}" must be kebab-case, 2–64 characters, and start with a letter or digit.`,
    );
  }

  if (descriptor.displayName.trim().length === 0) {
    throw new TypeError(`Provider "${descriptor.id}" must declare a display name.`);
  }

  if (descriptor.capabilities.length === 0) {
    throw new TypeError(`Provider "${descriptor.id}" must declare at least one capability.`);
  }
}
