/**
 * Intelligence dataset ingestion.
 *
 * The pipeline is deliberately one-directional and deterministic:
 *
 *   raw dataset → schema inspection → observable normalisation → per-source
 *   observations → deduplication by observable → ThreatIndicator records
 *
 * Design rules enforced here:
 *
 * - A record without a resolvable source and retrieval timestamp is rejected,
 *   because unattributable data is not intelligence.
 * - Malformed observations are rejected individually with a bounded reason;
 *   one bad row never aborts the dataset or crashes the application.
 * - Observations are retained per source. Repeated rows from the same source
 *   never count as independent corroboration, and the declared assessment is
 *   never silently promoted to `verified`.
 * - Missing metadata stays missing: no timestamps, confidences or locations
 *   are invented to fill gaps.
 */

import type {
  Assessment,
  SourceObservation,
  SourceProvenance,
  SourceType,
  ThreatCategory,
  ThreatIndicator,
} from '@/types/intelligence';
import {
  ASSESSMENT_IDS,
  SOURCE_RELIABILITY_IDS,
  SOURCE_TYPE_IDS,
  THREAT_CATEGORY_IDS,
} from '@/types/intelligence';
import { isGeoPoint, isGeoPrecision } from '@/types/geo';
import type { GeoLocation } from '@/types/geo';
import type { ValidIoc } from '@/lib/validation';
import { clampConfidence, sanitisePlainText, toIsoTimestamp } from '@/lib/validation';
import { isHttpUrl } from '@/lib/validation';
import { normaliseObservable, observableKey } from './normalisation';

export type IngestionSeverity = 'warning' | 'error';

export interface IngestionIssue {
  /** Source record identifier when the issue concerns a specific record. */
  readonly recordId?: string;
  readonly code: string;
  readonly severity: IngestionSeverity;
  /** Bounded explanation; never contains the rejected value itself. */
  readonly message: string;
}

export interface IngestionStats {
  readonly observations: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly indicators: number;
  /** Accepted observations merged into an existing indicator. */
  readonly mergedObservations: number;
  readonly distinctSources: number;
}

export interface IngestedDataset {
  readonly datasetId: string;
  readonly description?: string;
  /** Dataset build timestamp declared by the producer, when present. */
  readonly generatedAt?: string;
  readonly indicators: readonly ThreatIndicator[];
  readonly issues: readonly IngestionIssue[];
  readonly stats: IngestionStats;
}

export interface IngestOptions {
  readonly dataset: unknown;
  /** Optional GeoJSON FeatureCollection supplying observation locations. */
  readonly geo?: unknown;
  /** ISO 8601 UTC timestamp recorded by GCTIC when the dataset was read. */
  readonly retrievedAt: string;
}

interface DatasetSource {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceType: SourceType;
  readonly sourceReference?: string;
  readonly license?: string;
  readonly notes?: string;
}

interface ParsedObservation {
  readonly ioc: ValidIoc;
  readonly category: ThreatCategory;
  readonly tags: readonly string[];
  readonly observation: SourceObservation;
}

const RECORD_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/i;
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const MAX_TAGS = 8;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(value: unknown, maxLength = 200): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const text = sanitisePlainText(value, maxLength);

  return text.length > 0 ? text : null;
}

function readIdentifier(value: unknown, pattern: RegExp = RECORD_ID_PATTERN): string | null {
  const text = readText(value, 64);

  return text !== null && pattern.test(text) ? text : null;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function readHttpReference(value: unknown): string | null {
  const text = readText(value, 2_048);

  return text !== null && isHttpUrl(text) ? text : null;
}

function readTags(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const tags = new Set<string>();

  for (const entry of value) {
    const tag = readText(entry, 40);

    if (tag !== null) {
      tags.add(tag.toLowerCase());
    }

    if (tags.size >= MAX_TAGS) {
      break;
    }
  }

  return [...tags].sort();
}

function parseSources(rawSources: unknown, issues: IngestionIssue[]): Map<string, DatasetSource> {
  const sources = new Map<string, DatasetSource>();

  if (!Array.isArray(rawSources)) {
    issues.push({
      code: 'missing-sources',
      severity: 'error',
      message: 'Dataset declares no sources array; provenance cannot be established.',
    });

    return sources;
  }

  for (const entry of rawSources) {
    const record = asRecord(entry);
    const sourceId = record ? readIdentifier(record.sourceId, SOURCE_ID_PATTERN) : null;
    const sourceName = record ? readText(record.sourceName, 120) : null;
    const sourceType = record ? readEnum(record.sourceType, SOURCE_TYPE_IDS) : null;

    if (!record || !sourceId || !sourceName || !sourceType) {
      issues.push({
        code: 'invalid-source',
        severity: 'warning',
        message: 'A source declaration was discarded because it lacks an identifier, name or type.',
      });
      continue;
    }

    const sourceReference = readHttpReference(record.sourceReference);
    const license = readText(record.license, 160);
    const notes = readText(record.notes, 240);

    sources.set(sourceId, {
      sourceId,
      sourceName,
      sourceType,
      ...(sourceReference !== null ? { sourceReference } : {}),
      ...(license !== null ? { license } : {}),
      ...(notes !== null ? { notes } : {}),
    });
  }

  return sources;
}

function parseObservation(
  raw: unknown,
  sources: ReadonlyMap<string, DatasetSource>,
  issues: IngestionIssue[],
  seenRecordIds: Set<string>,
): ParsedObservation | null {
  const record = asRecord(raw);

  if (!record) {
    issues.push({
      code: 'invalid-record',
      severity: 'error',
      message: 'An observation entry was discarded because it is not an object.',
    });

    return null;
  }

  const recordId = readIdentifier(record.recordId);

  const reject = (code: string, message: string): null => {
    issues.push({
      code,
      severity: 'error',
      ...(recordId !== null ? { recordId } : {}),
      message,
    });

    return null;
  };

  if (recordId === null) {
    return reject('missing-record-id', 'Observation has no usable record identifier.');
  }

  if (seenRecordIds.has(recordId)) {
    return reject('duplicate-record-id', 'Duplicate record identifier; the later entry was discarded.');
  }

  seenRecordIds.add(recordId);

  const sourceId = readIdentifier(record.sourceId, SOURCE_ID_PATTERN);
  const source = sourceId !== null ? sources.get(sourceId) : undefined;

  if (!source) {
    return reject('unresolved-source', 'Observation references a source identifier that is not declared.');
  }

  const normalised = normaliseObservable(record.indicator);

  if (!normalised.ok) {
    return reject('invalid-indicator', normalised.reason);
  }

  const firstSeen = toIsoTimestamp(record.firstSeen);

  if (firstSeen === null) {
    return reject('invalid-first-seen', 'Observation has no valid first-seen timestamp.');
  }

  const lastSeen = record.lastSeen === undefined ? null : toIsoTimestamp(record.lastSeen);

  if (record.lastSeen !== undefined && lastSeen === null) {
    return reject('invalid-last-seen', 'Observation declares an unparseable last-seen timestamp.');
  }

  if (lastSeen !== null && Date.parse(lastSeen) < Date.parse(firstSeen)) {
    return reject('inconsistent-timeline', 'Observation was last seen before it was first seen.');
  }

  const assessment = readEnum(record.assessment, ASSESSMENT_IDS);

  if (!assessment) {
    return reject('invalid-assessment', 'Observation has no valid assessment grade.');
  }

  let confidence: number | undefined;

  if (record.confidence !== undefined) {
    if (typeof record.confidence !== 'number' || !Number.isFinite(record.confidence)) {
      return reject('invalid-confidence', 'Observation declares a non-numeric confidence value.');
    }

    confidence = clampConfidence(record.confidence);
  }

  // A bad reference is not a reason to discard an otherwise sound observation,
  // but it must not be retained as a link either.
  const declaredReference = record.sourceReference;
  const sourceReference = declaredReference === undefined ? null : readHttpReference(declaredReference);

  if (declaredReference !== undefined && sourceReference === null) {
    issues.push({
      code: 'invalid-source-reference',
      severity: 'warning',
      recordId,
      message: 'Source reference was discarded because it is not an absolute http(s) URL.',
    });
  }

  const category = readEnum(record.category, THREAT_CATEGORY_IDS) ?? 'unknown';
  const reliability = readEnum(record.reliability, SOURCE_RELIABILITY_IDS) ?? 'unknown';
  const notes = readText(record.notes, 280);
  const tags = readTags(record.tags);

  return {
    ioc: normalised.observable.ioc,
    category,
    tags,
    observation: {
      recordId,
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      sourceType: source.sourceType,
      ...(sourceReference !== null ? { sourceReference } : {}),
      originalValue: normalised.observable.original,
      firstSeen,
      ...(lastSeen !== null ? { lastSeen } : {}),
      assessment,
      ...(confidence !== undefined ? { confidence } : {}),
      reliability,
      ...(notes !== null ? { notes } : {}),
    },
  };
}

function parseGeoFeatures(raw: unknown, issues: IngestionIssue[]): Map<string, GeoLocation> {
  const locations = new Map<string, GeoLocation>();
  const root = asRecord(raw);

  if (root === null) {
    return locations;
  }

  const features = root.features;

  if (!Array.isArray(features)) {
    issues.push({
      code: 'invalid-geo',
      severity: 'warning',
      message: 'GeoJSON input has no features array and was ignored.',
    });

    return locations;
  }

  for (const feature of features) {
    const record = asRecord(feature);
    const geometry = record ? asRecord(record.geometry) : null;
    const properties = record ? asRecord(record.properties) : null;

    if (!record || !geometry || !properties || geometry.type !== 'Point') {
      issues.push({
        code: 'invalid-geo',
        severity: 'warning',
        message: 'A GeoJSON feature was ignored because it is not a point observation.',
      });
      continue;
    }

    const coordinates = geometry.coordinates;
    const [longitude, latitude, altitude] = Array.isArray(coordinates) ? coordinates : [];
    const point = {
      latitude,
      longitude,
      ...(typeof altitude === 'number' ? { altitude } : {}),
    };

    if (typeof longitude !== 'number' || typeof latitude !== 'number' || !isGeoPoint(point)) {
      issues.push({
        code: 'invalid-geo',
        severity: 'warning',
        message: 'A GeoJSON feature was ignored because its coordinates are not a valid WGS84 point.',
      });
      continue;
    }

    const indicator = normaliseObservable(properties.indicator);

    if (!indicator.ok) {
      issues.push({
        code: 'invalid-geo',
        severity: 'warning',
        message: 'A GeoJSON feature was ignored because it references no supported observable.',
      });
      continue;
    }

    const key = observableKey(indicator.observable.ioc);

    if (locations.has(key)) {
      continue;
    }

    const precision = isGeoPrecision(properties.precision) ? properties.precision : 'unknown';
    const countryCode =
      typeof properties.countryCode === 'string' && /^[A-Z]{2}$/.test(properties.countryCode)
        ? properties.countryCode
        : null;
    const placeName = readText(properties.placeName, 120);

    locations.set(key, {
      point,
      precision,
      ...(countryCode !== null ? { countryCode } : {}),
      ...(placeName !== null ? { placeName } : {}),
    });
  }

  return locations;
}

/**
 * Resolve a record grade from its observations.
 *
 * - Any synthetic observation makes the record synthetic: synthetic data can
 *   never be promoted into operational intelligence.
 * - `verified` requires at least two distinct sources that each declared
 *   verified. A single source declaring `verified` is clamped to `inferred`,
 *   because one source cannot corroborate itself.
 * - Everything else keeps its strongest declared analytic grade.
 */
function resolveAssessment(observations: readonly SourceObservation[]): Assessment {
  if (observations.some((observation) => observation.assessment === 'synthetic')) {
    return 'synthetic';
  }

  const verifiedSources = new Set(
    observations
      .filter((observation) => observation.assessment === 'verified')
      .map((observation) => observation.sourceId),
  );

  if (verifiedSources.size >= 2) {
    return 'verified';
  }

  if (
    observations.some(
      (observation) =>
        observation.assessment === 'verified' || observation.assessment === 'inferred',
    )
  ) {
    return 'inferred';
  }

  return 'unverified';
}

function resolveCategory(entries: readonly ParsedObservation[]): ThreatCategory {
  const categories = new Set(entries.map((entry) => entry.category));

  return categories.size === 1 ? (entries[0]?.category ?? 'unknown') : 'unknown';
}

function compareObservations(a: ParsedObservation, b: ParsedObservation): number {
  return (
    Date.parse(a.observation.firstSeen) - Date.parse(b.observation.firstSeen) ||
    a.observation.recordId.localeCompare(b.observation.recordId)
  );
}

function buildRecord(
  entries: readonly ParsedObservation[],
  sources: ReadonlyMap<string, DatasetSource>,
  geo: GeoLocation | undefined,
  retrievedAt: string,
): ThreatIndicator | null {
  const sorted = [...entries].sort(compareObservations);
  const primary = sorted[0];

  if (!primary) {
    return null;
  }

  const observations = sorted.map((entry) => entry.observation);
  const sourceIds = new Set(observations.map((observation) => observation.sourceId));
  const primarySource = sources.get(primary.observation.sourceId);

  const declaredConfidences = observations
    .map((observation) => observation.confidence)
    .filter((value): value is number => typeof value === 'number');

  const lastSeenValues = observations
    .map((observation) => observation.lastSeen)
    .filter((value): value is string => typeof value === 'string')
    .sort((a, b) => Date.parse(b) - Date.parse(a));

  const tags = [...new Set(sorted.flatMap((entry) => entry.tags))].sort();
  const sourceUrl = primary.observation.sourceReference ?? primarySource?.sourceReference;
  const license = primarySource?.license;
  const notes = primarySource?.notes;

  const provenance: SourceProvenance = {
    sourceId: primary.observation.sourceId,
    sourceName: primary.observation.sourceName,
    sourceType: primary.observation.sourceType,
    retrievedAt,
    ...(sourceUrl !== undefined ? { sourceUrl } : {}),
    ...(license !== undefined ? { license } : {}),
    ...(notes !== undefined ? { notes } : {}),
  };

  return {
    id: `ioc:${primary.ioc.type}:${primary.ioc.value}`,
    iocType: primary.ioc.type,
    value: primary.ioc.value,
    ...(primary.observation.originalValue !== primary.ioc.value
      ? { originalValue: primary.observation.originalValue }
      : {}),
    firstSeen: primary.observation.firstSeen,
    ...(lastSeenValues[0] !== undefined ? { lastSeen: lastSeenValues[0] } : {}),
    assessment: resolveAssessment(observations),
    ...(declaredConfidences.length > 0
      ? { confidence: Math.max(...declaredConfidences) }
      : {}),
    provenance,
    tags,
    ...(geo !== undefined ? { geo } : {}),
    threatCategory: resolveCategory(sorted),
    sourceReliability: primary.observation.reliability,
    observations,
    corroboration: {
      observations: observations.length,
      distinctSources: sourceIds.size,
      multiSource: sourceIds.size >= 2,
      repeatedFromSameSource: observations.length - sourceIds.size,
    },
  };
}

/**
 * Ingest a raw JSON dataset (plus optional GeoJSON) into normalised records.
 *
 * Throws only when the dataset itself cannot be interpreted at all. Individual
 * malformed observations are rejected and reported through `issues`, so a
 * partially damaged dataset still yields every record it can justify.
 */
export function ingestDataset(options: IngestOptions): IngestedDataset {
  const issues: IngestionIssue[] = [];
  const root = asRecord(options.dataset);

  if (root === null) {
    throw new TypeError('Intelligence dataset root must be an object.');
  }

  const rawObservations = root.observations;

  if (!Array.isArray(rawObservations)) {
    throw new TypeError('Intelligence dataset must contain an observations array.');
  }

  const sources = parseSources(root.sources, issues);

  if (sources.size === 0) {
    throw new TypeError('Intelligence dataset must declare at least one usable source.');
  }

  const geo = parseGeoFeatures(options.geo, issues);
  const observations: ParsedObservation[] = [];
  const seenRecordIds = new Set<string>();
  let rejected = 0;

  for (const raw of rawObservations) {
    const parsed = parseObservation(raw, sources, issues, seenRecordIds);

    if (parsed === null) {
      rejected += 1;
      continue;
    }

    observations.push(parsed);
  }

  const groups = new Map<string, ParsedObservation[]>();

  for (const parsed of observations) {
    const key = observableKey(parsed.ioc);
    const group = groups.get(key);

    if (group) {
      group.push(parsed);
    } else {
      groups.set(key, [parsed]);
    }
  }

  const indicators: ThreatIndicator[] = [];

  for (const [key, entries] of groups) {
    const record = buildRecord(entries, sources, geo.get(key), options.retrievedAt);

    if (record !== null) {
      indicators.push(record);
    }
  }

  indicators.sort((a, b) => a.id.localeCompare(b.id));

  const distinctSources = new Set(observations.map((entry) => entry.observation.sourceId));
  const generatedAt = toIsoTimestamp(root.generatedAt) ?? undefined;
  const datasetId = readText(root.datasetId, 80) ?? 'unnamed-dataset';
  const description = readText(root.description, 280) ?? undefined;

  return {
    datasetId,
    ...(description !== undefined ? { description } : {}),
    ...(generatedAt !== undefined ? { generatedAt } : {}),
    indicators,
    issues,
    stats: {
      observations: rawObservations.length,
      accepted: observations.length,
      rejected,
      indicators: indicators.length,
      mergedObservations: observations.length - indicators.length,
      distinctSources: distinctSources.size,
    },
  };
}
