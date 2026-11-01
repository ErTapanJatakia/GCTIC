/**
 * Core intelligence domain model.
 *
 * These types are the contract between the presentation layer and any future
 * ingestion backend. They deliberately encode provenance and assessment so
 * that unverified feed data can never be presented as established fact.
 */

import type { GeoLocation } from './geo';

/**
 * Normalised observable (indicator) classes supported by the platform.
 * Personal identifiers such as email addresses are intentionally excluded to
 * keep collection minimal.
 */
export type IocType = 'ipv4' | 'ipv6' | 'domain' | 'url' | 'md5' | 'sha1' | 'sha256';

export const IOC_TYPE_IDS = [
  'ipv4',
  'ipv6',
  'domain',
  'url',
  'md5',
  'sha1',
  'sha256',
] as const satisfies readonly IocType[];

/**
 * Assessment grade attached to every intelligence record.
 *
 * - `verified`   Corroborated by at least two independent sources or direct
 *                analyst confirmation. May be presented as established fact.
 * - `inferred`   Analytic judgement derived from partial evidence. Must be
 *                labelled as an assessment, never as fact.
 * - `synthetic`  Demonstration or test data. Never operational intelligence.
 * - `unverified` Single-source or unattributed. Requires validation.
 */
export type Assessment = 'verified' | 'inferred' | 'synthetic' | 'unverified';

export const ASSESSMENT_IDS = [
  'verified',
  'inferred',
  'synthetic',
  'unverified',
] as const satisfies readonly Assessment[];

export type SourceType =
  | 'open-source'
  | 'commercial'
  | 'internal'
  | 'community'
  | 'synthetic';

export const SOURCE_TYPE_IDS = [
  'open-source',
  'commercial',
  'internal',
  'community',
  'synthetic',
] as const satisfies readonly SourceType[];

/**
 * Reliability of the source that supplied an observation, independent of the
 * assessment grade of the record itself. A reliable source can still report an
 * unverified observation.
 */
export type SourceReliability = 'high' | 'moderate' | 'low' | 'unknown';

export const SOURCE_RELIABILITY_IDS = [
  'high',
  'moderate',
  'low',
  'unknown',
] as const satisfies readonly SourceReliability[];

/**
 * Analytic category describing what the observation was reported in the
 * context of. A category is a reported classification, never proof of intent.
 */
export type ThreatCategory =
  | 'command-and-control'
  | 'phishing'
  | 'credential-harvesting'
  | 'malware-distribution'
  | 'ransomware'
  | 'scanning'
  | 'botnet'
  | 'unknown';

export const THREAT_CATEGORY_IDS = [
  'command-and-control',
  'phishing',
  'credential-harvesting',
  'malware-distribution',
  'ransomware',
  'scanning',
  'botnet',
  'unknown',
] as const satisfies readonly ThreatCategory[];

/**
 * Provenance record. Attribution must survive every normalisation,
 * enrichment and storage step so that any displayed datum can be traced back
 * to the source that supplied it.
 */
export interface SourceProvenance {
  /** Stable identifier of the upstream source, e.g. a feed registry key. */
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceType: SourceType;
  /** ISO 8601 UTC timestamp of when GCTIC retrieved the record. */
  readonly retrievedAt: string;
  /** Public source reference. Must be http(s); never a credential-bearing URL. */
  readonly sourceUrl?: string;
  /** Licensing or terms note that governs redistribution of the record. */
  readonly license?: string;
  /** Analyst-facing note about collection method or known limitations. */
  readonly notes?: string;
}

/**
 * A single observation supplied by one source, retained verbatim alongside the
 * normalised indicator. Two observations from the same source are not two
 * independent sources, and neither observation is merged away.
 */
export interface SourceObservation {
  /** Identifier of the source record this observation came from. */
  readonly recordId: string;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceType: SourceType;
  /** Public reference for this specific record, restricted to http(s). */
  readonly sourceReference?: string;
  /** Exact value supplied by the source, preserved for audit. */
  readonly originalValue: string;
  /** ISO 8601 UTC timestamp of first observation by this source. */
  readonly firstSeen: string;
  readonly lastSeen?: string;
  readonly assessment: Assessment;
  /** Declared only when the source reported one. */
  readonly confidence?: number;
  readonly reliability: SourceReliability;
  readonly notes?: string;
}

/**
 * How many observations and distinct sources support a record.
 *
 * `multiSource` is true only when at least two *distinct* source identifiers
 * reported the indicator; repeated records from one source never constitute
 * corroboration.
 */
export interface CorroborationSummary {
  readonly observations: number;
  readonly distinctSources: number;
  readonly multiSource: boolean;
  /** Observations that duplicate a source already counted. */
  readonly repeatedFromSameSource: number;
}

/**
 * A threat indicator as held by GCTIC.
 *
 * Presence in this structure never asserts malicious intent. An indicator is
 * only ever an observation: it must not be described as an attacker, and
 * `assessment` must reflect the evidence available.
 */
export interface ThreatIndicator {
  /** Deterministic record identifier derived from type and normalised value. */
  readonly id: string;
  readonly iocType: IocType;
  /** Normalised value, used for correlation and display. */
  readonly value: string;
  /** Original value as supplied by the earliest contributing source. */
  readonly originalValue?: string;
  /** ISO 8601 UTC timestamp of first observation by any contributing source. */
  readonly firstSeen: string;
  /** ISO 8601 UTC timestamp of the most recent observation. */
  readonly lastSeen?: string;
  readonly assessment: Assessment;
  /**
   * Analytic confidence, 0–100. Omitted entirely when no contributing source
   * declared one: a missing value is never replaced with a fabricated number.
   */
  readonly confidence?: number;
  readonly provenance: SourceProvenance;
  readonly tags: readonly string[];
  /** Reported location of observation, not attribution of an actor. */
  readonly geo?: GeoLocation;
  /** Reported category context, when the source declared one. */
  readonly threatCategory?: ThreatCategory;
  /** Reliability of the primary (earliest) source. */
  readonly sourceReliability?: SourceReliability;
  /** Every retained observation, one per source record. */
  readonly observations?: readonly SourceObservation[];
  readonly corroboration?: CorroborationSummary;
}

/** Supported enrichment capabilities a provider may advertise. */
export type IntelCapability =
  | 'indicators'
  | 'actors'
  | 'campaigns'
  | 'geospatial'
  | 'history';
