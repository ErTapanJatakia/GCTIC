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

export type SourceType =
  | 'open-source'
  | 'commercial'
  | 'internal'
  | 'community'
  | 'synthetic';

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
 * A threat indicator as held by GCTIC.
 *
 * Presence in this structure never asserts malicious intent. An indicator is
 * only ever an observation: it must not be described as an attacker, and
 * `assessment` must reflect the evidence available.
 */
export interface ThreatIndicator {
  readonly id: string;
  readonly iocType: IocType;
  readonly value: string;
  /** ISO 8601 UTC timestamp of first observation by any contributing source. */
  readonly firstSeen: string;
  /** ISO 8601 UTC timestamp of the most recent observation. */
  readonly lastSeen?: string;
  readonly assessment: Assessment;
  /** Analytic confidence, 0–100. Bounded and always displayed with its grade. */
  readonly confidence: number;
  readonly provenance: SourceProvenance;
  readonly tags: readonly string[];
  /** Reported location of observation, not attribution of an actor. */
  readonly geo?: GeoLocation;
}

/** Supported enrichment capabilities a provider may advertise. */
export type IntelCapability =
  | 'indicators'
  | 'actors'
  | 'campaigns'
  | 'geospatial'
  | 'history';
