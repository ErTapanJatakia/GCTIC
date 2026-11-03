import { describe, expect, it } from 'vitest';

import { ALL_MODULES, MODULE_COUNTS, NAVIGATION_GROUPS, PLANNED_MODULES } from './navigation';

describe('module registry', () => {
  it('keeps identifiers and paths unique', () => {
    const ids = ALL_MODULES.map((module) => module.id);
    const paths = ALL_MODULES.map((module) => module.path);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((path) => path.startsWith('/'))).toBe(true);
  });

  it('derives counts from the modules actually declared', () => {
    expect(MODULE_COUNTS.total).toBe(ALL_MODULES.length);
    expect(MODULE_COUNTS.available + MODULE_COUNTS.planned).toBeLessThanOrEqual(
      MODULE_COUNTS.total,
    );
    expect(MODULE_COUNTS.available).toBe(
      ALL_MODULES.filter((module) => module.status === 'available').length,
    );
    expect(PLANNED_MODULES.every((module) => module.status !== 'available')).toBe(true);
  });

  it('preserves the existing routes', () => {
    const paths = ALL_MODULES.map((module) => module.path);

    expect(paths).toContain('/');
    expect(paths).toContain('/operations/threat-map');
    expect(paths).toContain('/analysis/indicators');
    expect(paths).toContain('/system/status');
    expect(paths).toContain('/methodology');
  });

  it('exposes the threat map as an available Phase 2 module', () => {
    const threatMap = ALL_MODULES.find((module) => module.id === 'threat-map');

    expect(threatMap?.status).toBe('available');
    expect(threatMap?.path).toBe('/operations/threat-map');
    expect(threatMap?.phase).toBe('Phase 2');
    expect(threatMap?.summary).toMatch(/no threat layer/i);
  });

  it('groups every module exactly once', () => {
    const grouped = NAVIGATION_GROUPS.flatMap((group) => group.items.map((module) => module.id));

    expect(grouped).toEqual(ALL_MODULES.map((module) => module.id));
  });
});
