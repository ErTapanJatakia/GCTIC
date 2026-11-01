/**
 * Taxonomy presentation metadata.
 *
 * Labels and descriptions for observable types and reported threat categories.
 * The identifiers themselves live in the domain model so that filtering logic
 * never depends on display strings.
 */

import type { IocType, ThreatCategory } from '@/types/intelligence';

export const IOC_TYPE_LABELS: Readonly<Record<IocType, string>> = {
  ipv4: 'IPv4',
  ipv6: 'IPv6',
  domain: 'Domain',
  url: 'URL',
  md5: 'MD5',
  sha1: 'SHA-1',
  sha256: 'SHA-256',
};

export interface ThreatCategoryDefinition {
  readonly id: ThreatCategory;
  readonly label: string;
  readonly description: string;
}

export const THREAT_CATEGORIES: readonly ThreatCategoryDefinition[] = [
  {
    id: 'command-and-control',
    label: 'Command and control',
    description: 'Infrastructure reported as command-and-control or beaconing endpoint.',
  },
  {
    id: 'phishing',
    label: 'Phishing',
    description: 'Observable reported in the context of a phishing lure or landing page.',
  },
  {
    id: 'credential-harvesting',
    label: 'Credential harvesting',
    description: 'Observable reported as collecting or proxying credentials.',
  },
  {
    id: 'malware-distribution',
    label: 'Malware distribution',
    description: 'Observable reported as hosting or delivering a malicious payload reference.',
  },
  {
    id: 'ransomware',
    label: 'Ransomware',
    description: 'Observable reported in ransomware staging or extortion activity.',
  },
  {
    id: 'scanning',
    label: 'Scanning',
    description: 'Observable reported as reconnaissance or service enumeration.',
  },
  {
    id: 'botnet',
    label: 'Botnet',
    description: 'Observable reported as botnet infrastructure or a peer address.',
  },
  {
    id: 'unknown',
    label: 'Unknown',
    description: 'The source declared no usable category, or sources disagreed.',
  },
];

export function getThreatCategoryLabel(id: ThreatCategory): string {
  return THREAT_CATEGORIES.find((category) => category.id === id)?.label ?? 'Unknown';
}
