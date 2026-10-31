/**
 * Runtime application configuration.
 *
 * Only public, non-secret values live here. Anything prefixed with `VITE_` is
 * compiled into the browser bundle, so credentials must never appear in this
 * file or in any environment variable consumed by the frontend.
 */

import { isHttpUrl } from '@/lib/validation';

export interface AppIdentity {
  readonly acronym: string;
  readonly fullName: string;
  readonly version: string;
  readonly buildTimestamp: string;
  readonly phase: string;
  readonly license: string;
  readonly missionStatement: string;
}

export const APP_IDENTITY: AppIdentity = {
  acronym: 'GCTIC',
  fullName: 'Global Cyber Threat Intelligence Command Centre',
  version: __APP_VERSION__,
  buildTimestamp: __BUILD_TIMESTAMP__,
  phase: 'Phase 1 — Foundation',
  license: 'Apache-2.0',
  missionStatement:
    'A geospatially enriched cyber threat intelligence platform that consolidates open-source threat reporting into a single operational picture for defensive security teams, analysts and researchers.',
};

export type DataMode = 'demo' | 'test' | 'live';

/**
 * Capability flags. Every flag except the shell itself is `false` in Phase 1:
 * the flags exist so that future modules can be enabled deliberately rather
 * than by accident, and so the interface can state honestly what is missing.
 */
export type FeatureFlag =
  | 'liveFeeds'
  | 'globe'
  | 'iocProcessing'
  | 'analytics'
  | 'historicalStore'
  | 'authentication';

export const FEATURE_FLAGS: Readonly<Record<FeatureFlag, boolean>> = {
  liveFeeds: false,
  globe: false,
  iocProcessing: false,
  analytics: false,
  historicalStore: false,
  authentication: false,
};

const configuredLabel = (import.meta.env.VITE_GCTIC_ENV_LABEL ?? '').trim();
const configuredApiBaseUrl = (import.meta.env.VITE_GCTIC_API_BASE_URL ?? '').trim();

/** Non-fatal configuration problems surfaced on the System Status page. */
export const CONFIGURATION_WARNINGS: readonly string[] = (() => {
  const warnings: string[] = [];

  if (configuredApiBaseUrl.length > 0 && !isHttpUrl(configuredApiBaseUrl)) {
    warnings.push(
      'VITE_GCTIC_API_BASE_URL is not a valid http(s) URL and has been ignored. ' +
        'Expected an absolute origin such as https://api.example.org.',
    );
  }

  if (configuredLabel.length > 32) {
    warnings.push(
      'VITE_GCTIC_ENV_LABEL exceeds 32 characters and was truncated for display.',
    );
  }

  return warnings;
})();

export interface RuntimeConfig {
  readonly mode: string;
  readonly isProduction: boolean;
  readonly environmentLabel: string;
  /** Null until a backend gateway is configured. */
  readonly apiBaseUrl: string | null;
  readonly dataMode: DataMode;
}

export const appConfig: RuntimeConfig = {
  mode: import.meta.env.MODE,
  isProduction: import.meta.env.PROD,
  environmentLabel: (
    configuredLabel.replace(/[^\w .:/-]/g, '').slice(0, 32) ||
    (import.meta.env.PROD ? 'PRODUCTION' : 'LOCAL DEVELOPMENT')
  ).toUpperCase(),
  apiBaseUrl:
    configuredApiBaseUrl.length > 0 && isHttpUrl(configuredApiBaseUrl)
      ? configuredApiBaseUrl.replace(/\/+$/, '')
      : null,
  // No live feed ingestion exists in Phase 1; any record shown is understood
  // to be demonstration data, not operational intelligence.
  dataMode: 'demo',
};

export const ENVIRONMENT_CODES: Readonly<Record<string, string>> = {
  development: 'DEV',
  production: 'PROD',
  test: 'TEST',
};
