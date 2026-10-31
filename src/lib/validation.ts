/**
 * Input validation and sanitisation primitives.
 *
 * Every value crossing a trust boundary — a feed payload, a URL parameter,
 * an analyst note, a provider response — must pass through this module before
 * it is rendered, stored or correlated.
 *
 * Rendering note: React escapes text nodes by default. GCTIC additionally
 * forbids `dangerouslySetInnerHTML`; sanitisation here is defence in depth for
 * values that leave the UI (exports, logs, API requests).
 */

import type { IocType } from '@/types/intelligence';
import { isIpv4, isIpv6 } from './ip';

/**
 * C0 control characters and DEL. Written as an explicit code-point test rather
 * than a regular expression so the intent is auditable and lint-clean.
 */
function isControlCharacter(codePoint: number): boolean {
  return (
    codePoint <= 8 ||
    codePoint === 11 ||
    codePoint === 12 ||
    (codePoint >= 14 && codePoint <= 31) ||
    codePoint === 127
  );
}

function replaceControlCharacters(value: string): string {
  let output = '';

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    output += isControlCharacter(codePoint) ? ' ' : character;
  }

  return output;
}

/** True when a value contains whitespace or control characters. */
function containsUnsafeCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;

    if (isControlCharacter(codePoint) || /\s/.test(character)) {
      return true;
    }
  }

  return false;
}

const MAX_TEXT_LENGTH = 1_000;
const MAX_URL_LENGTH = 2_048;

const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const HASH_PATTERNS: Readonly<Record<'md5' | 'sha1' | 'sha256', RegExp>> = {
  md5: /^[a-f0-9]{32}$/i,
  sha1: /^[a-f0-9]{40}$/i,
  sha256: /^[a-f0-9]{64}$/i,
};

/**
 * Collapse untrusted text into a bounded, single-line plain string.
 * Control characters are removed, whitespace normalised and length capped.
 */
export function sanitisePlainText(input: unknown, maxLength = MAX_TEXT_LENGTH): string {
  if (typeof input !== 'string') {
    return '';
  }

  const limit = Number.isFinite(maxLength) ? Math.max(0, Math.trunc(maxLength)) : MAX_TEXT_LENGTH;

  return replaceControlCharacters(input.normalize('NFC'))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

/**
 * Parse an absolute http(s) URL.
 *
 * Rejects non-web schemes (`javascript:`, `data:`, `file:`), embedded
 * credentials and oversized inputs. GCTIC never dereferences a URL
 * automatically; parsing is for display, storage and validation only.
 */
export function parseHttpUrl(input: unknown): URL | null {
  if (typeof input !== 'string') {
    return null;
  }

  const candidate = input.trim();

  if (candidate.length === 0 || candidate.length > MAX_URL_LENGTH) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  if (parsed.hostname.length === 0) {
    return null;
  }

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return null;
  }

  return parsed;
}

export function isHttpUrl(value: unknown): boolean {
  return parseHttpUrl(value) !== null;
}

export interface ValidIoc {
  readonly type: IocType;
  /** Normalised representation safe for correlation and display. */
  readonly value: string;
}

export type IocValidationResult =
  | { readonly ok: true; readonly ioc: ValidIoc }
  | { readonly ok: false; readonly reason: string };

/** Determine the observable type of a value, or null if unsupported. */
export function detectIocType(input: unknown): IocType | null {
  if (typeof input !== 'string') {
    return null;
  }

  const value = input.trim();

  if (value.length === 0 || value.length > MAX_URL_LENGTH) {
    return null;
  }

  if (isIpv4(value)) {
    return 'ipv4';
  }

  if (isIpv6(value)) {
    return 'ipv6';
  }

  if (HASH_PATTERNS.sha256.test(value)) {
    return 'sha256';
  }

  if (HASH_PATTERNS.sha1.test(value)) {
    return 'sha1';
  }

  if (HASH_PATTERNS.md5.test(value)) {
    return 'md5';
  }

  // A single trailing dot denotes a fully-qualified name; it is stripped for
  // classification and again during normalisation.
  const domainCandidate = value.endsWith('.') ? value.slice(0, -1) : value;

  if (DOMAIN_PATTERN.test(domainCandidate) && !value.includes('://')) {
    return 'domain';
  }

  if (isHttpUrl(value)) {
    return 'url';
  }

  return null;
}

/**
 * Validate and normalise an indicator value.
 *
 * The result never asserts maliciousness — validation only establishes that a
 * value is a well-formed observable of a supported type.
 */
export function validateIoc(input: unknown): IocValidationResult {
  if (typeof input !== 'string') {
    return { ok: false, reason: 'Indicator value must be a string.' };
  }

  const value = input.trim();

  if (value.length === 0) {
    return { ok: false, reason: 'Indicator value is empty.' };
  }

  if (value.length > MAX_URL_LENGTH) {
    return { ok: false, reason: 'Indicator value exceeds the supported length.' };
  }

  if (containsUnsafeCharacters(value)) {
    return { ok: false, reason: 'Indicator value contains whitespace or control characters.' };
  }

  const type = detectIocType(value);

  if (type === null) {
    return {
      ok: false,
      reason: 'Unsupported observable type. Expected an IPv4/IPv6 address, domain, http(s) URL or file hash.',
    };
  }

  switch (type) {
    case 'domain':
      return { ok: true, ioc: { type, value: value.toLowerCase().replace(/\.$/, '') } };
    case 'md5':
    case 'sha1':
    case 'sha256':
      return { ok: true, ioc: { type, value: value.toLowerCase() } };
    case 'url':
      return { ok: true, ioc: { type, value: new URL(value).href } };
    case 'ipv4':
    case 'ipv6':
      return { ok: true, ioc: { type, value: value.toLowerCase() } };
  }
}

/**
 * ISO 8601 timestamp guard. Accepts only strings that parse to a valid date,
 * which prevents invalid temporal data entering correlation and timelines.
 */
export function isIsoTimestamp(input: unknown): input is string {
  if (typeof input !== 'string' || input.length < 10 || input.length > 40) {
    return false;
  }

  const timestamp = Date.parse(input);

  return Number.isFinite(timestamp);
}

/** Coerce a value into an ISO timestamp string, or null when invalid. */
export function toIsoTimestamp(input: unknown): string | null {
  if (!isIsoTimestamp(input)) {
    return null;
  }

  return new Date(input).toISOString();
}

/** Clamp an analytic confidence value to the supported 0–100 range. */
export function clampConfidence(input: unknown): number {
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(input)));
}
