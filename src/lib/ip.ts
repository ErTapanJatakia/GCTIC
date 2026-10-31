/**
 * IP address parsing, validation and scope classification.
 *
 * Scope classification matters for interpretation: a private, loopback,
 * documentation or reserved address observed in a feed is usually an artefact
 * of reporting, not an internet-facing adversary. Classification never asserts
 * intent — it only describes the address space.
 */

export type IpScope =
  | 'public'
  | 'private'
  | 'loopback'
  | 'link-local'
  | 'cgnat'
  | 'multicast'
  | 'documentation'
  | 'reserved'
  | 'unspecified';

const OCTET_PATTERN = /^(?:0|[1-9]\d{0,2})$/;

function parseIpv4Octets(value: string): readonly number[] | null {
  const parts = value.split('.');

  if (parts.length !== 4) {
    return null;
  }

  const octets: number[] = [];

  for (const part of parts) {
    if (!OCTET_PATTERN.test(part)) {
      return null;
    }

    const octet = Number(part);

    if (octet > 255) {
      return null;
    }

    octets.push(octet);
  }

  return octets;
}

export function isIpv4(value: unknown): boolean {
  return typeof value === 'string' && parseIpv4Octets(value.trim()) !== null;
}

/**
 * Pragmatic IPv6 validation: full form, compressed form and IPv4-embedded
 * tails are accepted; malformed group counts and illegal characters rejected.
 */
export function isIpv6(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const address = value.trim();

  if (!address.includes(':') || address.length > 45) {
    return false;
  }

  if (!/^[0-9a-f:.]+$/i.test(address)) {
    return false;
  }

  const compressionParts = address.split('::');

  if (compressionParts.length > 2) {
    return false;
  }

  const compressed = compressionParts.length === 2;
  const head = compressionParts[0] ?? '';
  const tail = compressionParts[1] ?? '';

  const groups = [
    ...(head.length > 0 ? head.split(':') : []),
    ...(tail.length > 0 ? tail.split(':') : []),
  ];

  if (groups.length === 0) {
    return false;
  }

  let groupCount = groups.length;
  const lastGroup = groups[groups.length - 1];

  if (lastGroup !== undefined && lastGroup.includes('.')) {
    if (!isIpv4(lastGroup)) {
      return false;
    }

    groups.pop();
    groupCount += 1; // An embedded IPv4 tail occupies two 16-bit groups.
  }

  if (groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) {
    return false;
  }

  return compressed ? groupCount < 8 : groupCount === 8;
}

/** Classify an IPv4 address by address space. Returns null for invalid input. */
export function classifyIpv4(address: string): IpScope | null {
  const octets = parseIpv4Octets(address.trim());

  if (octets === null) {
    return null;
  }

  const [first = -1, second = -1] = octets;

  if (first === 0) return 'unspecified';
  if (first === 10) return 'private';
  if (first === 127) return 'loopback';
  if (first === 100 && second >= 64 && second <= 127) return 'cgnat';
  if (first === 169 && second === 254) return 'link-local';
  if (first === 172 && second >= 16 && second <= 31) return 'private';
  if (first === 192 && second === 168) return 'private';
  if (first === 192 && second === 0 && octets[2] === 2) return 'documentation';
  if (first === 198 && second === 51 && octets[2] === 100) return 'documentation';
  if (first === 203 && second === 0 && octets[2] === 113) return 'documentation';
  if (first >= 224 && first <= 239) return 'multicast';
  if (first >= 240) return 'reserved';
  if (octets.every((octet) => octet === 255)) return 'reserved';

  return 'public';
}

/** True when the address is not globally routable on the public internet. */
export function isNonPublicIpv4(address: string): boolean {
  const scope = classifyIpv4(address);

  return scope !== null && scope !== 'public';
}

export const IP_SCOPE_LABELS: Readonly<Record<IpScope, string>> = {
  public: 'Public',
  private: 'Private (RFC 1918)',
  loopback: 'Loopback',
  'link-local': 'Link-local',
  cgnat: 'Carrier-grade NAT',
  multicast: 'Multicast',
  documentation: 'Documentation range',
  reserved: 'Reserved',
  unspecified: 'Unspecified',
};
