/**
 * Navigation contract.
 *
 * The application shell is driven by a declarative module registry so that
 * route definitions, navigation entries and readiness reporting stay in sync.
 * A module may only be marked `available` when a real implementation exists.
 */

export type ModuleStatus = 'available' | 'planned' | 'unavailable';

export interface NavigationItem {
  /** Stable identifier used for analytics, tests and future permission scopes. */
  readonly id: string;
  readonly label: string;
  /** Absolute in-app path. */
  readonly path: string;
  readonly status: ModuleStatus;
  /** One-line purpose statement, shown in the shell and readiness tables. */
  readonly summary: string;
  /** Short glyph key resolved by the shell icon set. */
  readonly icon: IconKey;
  /** Delivery phase for modules that are not yet implemented. */
  readonly phase?: string;
  /** Capabilities this module is intended to provide once implemented. */
  readonly plannedCapabilities?: readonly string[];
}

export interface NavigationGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

export type IconKey =
  | 'overview'
  | 'globe'
  | 'stream'
  | 'indicator'
  | 'actor'
  | 'campaign'
  | 'analytics'
  | 'sources'
  | 'system'
  | 'methodology';
