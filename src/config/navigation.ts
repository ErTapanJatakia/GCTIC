/**
 * Module registry driving navigation and readiness reporting.
 *
 * A module is `available` only when a real, implemented route exists. Anything
 * else must be `planned` or `unavailable` so the interface never implies
 * capability that has not been built.
 */

import type { NavigationGroup, NavigationItem } from '@/types/navigation';

export const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        id: 'overview',
        label: 'Command Overview',
        path: '/',
        status: 'available',
        icon: 'overview',
        summary: 'Mission statement, capability model and current build readiness.',
      },
      {
        id: 'threat-map',
        label: 'Global Threat Map',
        path: '/operations/threat-map',
        status: 'available',
        icon: 'globe',
        phase: 'Phase 2',
        summary:
          'Interactive CesiumJS globe: geospatial foundation with no threat layer plotted yet.',
        plannedCapabilities: [
          'Threat markers with source attribution',
          'Cluster, heat map and connection-arc layers',
          'CZML driven time-dynamic event playback',
        ],
      },
      {
        id: 'intel-stream',
        label: 'Intelligence Stream',
        path: '/operations/intel-stream',
        status: 'planned',
        icon: 'stream',
        phase: 'Phase 2',
        summary:
          'Normalised, time-ordered intelligence records from configured providers.',
        plannedCapabilities: [
          'Paginated, filterable record stream',
          'Source health and collection latency indicators',
          'Assessment grade and provenance on every record',
        ],
      },
    ],
  },
  {
    id: 'analysis',
    label: 'Analysis',
    items: [
      {
        id: 'indicators',
        label: 'IOC Explorer',
        path: '/analysis/indicators',
        status: 'available',
        icon: 'indicator',
        phase: 'Phase 1.5',
        summary:
          'Validated, normalised indicators from local datasets, with per-source provenance.',
      },
      {
        id: 'actors',
        label: 'Threat Actors',
        path: '/analysis/actors',
        status: 'planned',
        icon: 'actor',
        phase: 'Phase 4',
        summary:
          'Actor and intrusion-set profiles with sourcing and confidence per claim.',
        plannedCapabilities: [
          'Actor dossier with aliases and attribution caveats',
          'Infrastructure and tooling relationships',
          'Source-by-source evidence trail',
        ],
      },
      {
        id: 'campaigns',
        label: 'Campaign Tracking',
        path: '/analysis/campaigns',
        status: 'planned',
        icon: 'campaign',
        phase: 'Phase 4',
        summary:
          'Campaign timelines linking indicators, infrastructure and reporting.',
        plannedCapabilities: [
          'Campaign timeline reconstruction',
          'Indicator-to-campaign linkage with confidence grading',
          'Analyst annotations retained with provenance',
        ],
      },
      {
        id: 'analytics',
        label: 'Analytics & Reporting',
        path: '/analysis/analytics',
        status: 'planned',
        icon: 'analytics',
        phase: 'Phase 5',
        summary:
          'Apache ECharts analytical views and exportable intelligence reports.',
        plannedCapabilities: [
          'Temporal and geographic distribution analysis',
          'Report composition with provenance citations',
          'JSON / CSV export for research use',
        ],
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'sources',
        label: 'Intelligence Sources',
        path: '/system/sources',
        status: 'planned',
        icon: 'sources',
        phase: 'Phase 2',
        summary:
          'Provider configuration, ingestion scheduling and collection health.',
        plannedCapabilities: [
          'Provider adapter registry and capability matrix',
          'Server-side credential references (never browser-exposed)',
          'Collection audit log with retrieval timestamps',
        ],
      },
      {
        id: 'system-status',
        label: 'System Status',
        path: '/system/status',
        status: 'available',
        icon: 'system',
        summary:
          'Runtime configuration, provider adapter health and build integrity.',
      },
      {
        id: 'methodology',
        label: 'Methodology',
        path: '/methodology',
        status: 'available',
        icon: 'methodology',
        summary:
          'Assessment grades, provenance rules and intelligence handling principles.',
      },
    ],
  },
];

export const ALL_MODULES: readonly NavigationItem[] = NAVIGATION_GROUPS.flatMap(
  (group) => group.items,
);

export const MODULE_COUNTS = {
  total: ALL_MODULES.length,
  available: ALL_MODULES.filter((module) => module.status === 'available').length,
  planned: ALL_MODULES.filter((module) => module.status === 'planned').length,
  unavailable: ALL_MODULES.filter((module) => module.status === 'unavailable').length,
} as const;

export function findModuleByPath(path: string): NavigationItem | undefined {
  return ALL_MODULES.find((module) => module.path === path);
}

/** Modules that are declared but not implemented, used to route placeholders. */
export const PLANNED_MODULES: readonly NavigationItem[] = ALL_MODULES.filter(
  (module) => module.status !== 'available',
);
