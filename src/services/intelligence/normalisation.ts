/**
 * Observable normalisation.
 *
 * Normalisation is a pure, deterministic transformation applied after
 * validation and before storage or correlation. It never contacts the network,
 * never dereferences a URL and never upgrades an observation into a verdict.
 *
 * Original values are preserved by callers alongside the normalised value so
 * that any correlation decision can be audited against what the source
 * actually published.
 */

import { parseHttpUrl, validateIoc } from '@/lib/validation';
import type { ValidIoc } from '@/lib/validation';

export interface NormalisedObservable {
  /** Normalised type and value, safe for correlation and display. */
  readonly ioc: ValidIoc;
  /** Exact value supplied by the source, trimmed but otherwise untouched. */
  readonly original: string;
}

export type NormalisationResult =
  | { readonly ok: true; readonly observable: NormalisedObservable }
  | { readonly ok: false; readonly reason: string };

/**
 * Expand an IPv6 address into eight 16-bit groups.
 *
 * Returns null when the address cannot be expanded. IPv4-embedded tails
 * (`::ffff:192.0.2.1`) are converted into two hexadecimal groups.
 */
function expandIpv6Groups(address: string): readonly string[] | null {
  const value = address.toLowerCase();
  const separatorIndex = value.indexOf('::');
  const compressed = separatorIndex !== -1;

  const headPart = compressed ? value.slice(0, separatorIndex) : value;
  const tailPart = compressed ? value.slice(separatorIndex + 2) : '';

  const head = headPart.length > 0 ? headPart.split(':') : [];
  const tail = tailPart.length > 0 ? tailPart.split(':') : [];

  const groups: string[] = [];

  for (const group of [...head, ...tail]) {
    if (group.includes('.')) {
      const octets = group.split('.').map((octet) => Number(octet));

      if (
        octets.length !== 4 ||
        octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
      ) {
        return null;
      }

      const [a = 0, b = 0, c = 0, d = 0] = octets;

      groups.push(((a << 8) | b).toString(16), ((c << 8) | d).toString(16));
    } else {
      groups.push(group.replace(/^0+(?=.)/, ''));
    }
  }

  const missing = 8 - groups.length;

  if (missing < 0) {
    return null;
  }

  if (compressed) {
    return [...groups.slice(0, head.length), ...Array.from({ length: missing }, () => '0'), ...groups.slice(head.length)];
  }

  return missing === 0 ? groups : null;
}

/**
 * Canonical RFC 5952 text form: lowercase, leading zeros removed and the
 * longest run of zero groups compressed once (leftmost on a tie).
 *
 * An address that cannot be parsed is returned lowercased unchanged; callers
 * only reach this after validation has already accepted the value.
 */
export function canonicaliseIpv6(address: string): string {
  const fallback = address.trim().toLowerCase();
  const groups = expandIpv6Groups(fallback);

  if (groups === null) {
    return fallback;
  }

  let bestStart = -1;
  let bestLength = 0;
  let runStart = -1;
  let runLength = 0;

  groups.forEach((group, index) => {
    if (group === '0') {
      if (runStart === -1) {
        runStart = index;
      }

      runLength += 1;

      if (runLength > bestLength) {
        bestLength = runLength;
        bestStart = runStart;
      }
    } else {
      runStart = -1;
      runLength = 0;
    }
  });

  if (bestLength < 2) {
    return groups.join(':');
  }

  const before = groups.slice(0, bestStart).join(':');
  const after = groups.slice(bestStart + bestLength).join(':');

  return `${before}::${after}`;
}

/** Stable correlation key for an observable. */
export function observableKey(ioc: ValidIoc): string {
  return `${ioc.type}:${ioc.value}`;
}

/**
 * Validate and canonicalise a single observable.
 *
 * Rejections carry a bounded reason so the ingestion layer can record why a
 * source record was discarded without echoing the rejected value.
 */
export function normaliseObservable(input: unknown): NormalisationResult {
  const validation = validateIoc(input);

  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  const original = typeof input === 'string' ? input.trim() : '';
  const { type, value } = validation.ioc;

  if (type === 'ipv6') {
    return { ok: true, observable: { ioc: { type, value: canonicaliseIpv6(value) }, original } };
  }

  if (type === 'url') {
    const parsed = parseHttpUrl(value);

    if (!parsed) {
      return { ok: false, reason: 'URL could not be canonicalised.' };
    }

    // Fragments are client-side state, not part of the observed resource, so
    // they are dropped to keep correlation stable. The URL is never fetched.
    parsed.hash = '';

    return { ok: true, observable: { ioc: { type, value: parsed.href }, original } };
  }

  return { ok: true, observable: { ioc: validation.ioc, original } };
}
