// @vitest-environment jsdom
import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThreatMapPage } from './ThreatMapPage';
import { fake } from './globe/testing/fake-cesium';

vi.mock('cesium', async () => {
  const helper = await import('./globe/testing/fake-cesium');
  return helper.fake.module();
});

const webgl = vi.hoisted(() => ({ support: 'supported' as 'supported' | 'unsupported' }));

vi.mock('./globe/webgl', () => ({
  detectWebGLSupport: () => webgl.support,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<{ root: Root; container: HTMLDivElement }> = [];

function render(element: ReactElement): HTMLDivElement {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });

  act(() => {
    root.render(<MemoryRouter>{element}</MemoryRouter>);
  });

  return container;
}

function unmountAll(): void {
  for (const { root, container } of mounted) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }

  mounted.length = 0;
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
  const match = Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );

  if (!(match instanceof HTMLButtonElement)) {
    throw new Error(`No button labelled "${label}"`);
  }

  return match;
}

afterEach(() => {
  unmountAll();
  document.body.style.overflow = '';
  fake.reset();
  webgl.support = 'supported';
});

describe('threat map page', () => {
  it('renders the geospatial view as a single document heading', () => {
    const container = render(<ThreatMapPage />);

    const headings = container.querySelectorAll('h1');

    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe('Global threat map');
    expect(container.textContent).toContain('OPERATIONS // GEOSPATIAL');
    expect(container.querySelector('.globe')).not.toBeNull();
  });

  it('states that no live feed exists and that synthetic coordinates are withheld', () => {
    const container = render(<ThreatMapPage />);
    const text = container.textContent ?? '';

    expect(text).toContain('No live feed is connected, and no location is plotted');
    expect(text).toContain('deliberately withheld from the globe');
    expect(text).toContain('never an attacker');
    expect(text).toContain('Not implemented');
    // The location-confidence vocabulary must survive on the page.
    expect(text).toContain('Observed');
    expect(text).toContain('Inferred');
    expect(text).toContain('Synthetic');
    expect(text).toContain('Unknown');
  });

  it('wires zoom and reset controls to the viewer', () => {
    const container = render(<ThreatMapPage />);
    const viewer = fake.lastViewer();

    act(() => {
      button(container, 'Zoom in').click();
    });
    expect(viewer.camera.zoomIn).toHaveBeenCalledTimes(1);

    act(() => {
      button(container, 'Zoom out').click();
    });
    expect(viewer.camera.zoomOut).toHaveBeenCalledTimes(1);

    act(() => {
      button(container, 'Reset view').click();
    });
    expect(viewer.camera.setView).toHaveBeenCalledTimes(2);
  });

  it('expands the view, locks page scrolling and exits on Escape with focus restored', () => {
    const container = render(<ThreatMapPage />);
    const layout = container.querySelector('.globe-layout');
    const expand = button(container, 'Expand view');

    act(() => {
      expand.click();
    });

    expect(layout?.getAttribute('data-expanded')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(button(container, 'Exit expanded').getAttribute('aria-pressed')).toBe('true');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(layout?.getAttribute('data-expanded')).toBe('false');
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(button(container, 'Expand view'));
  });

  it('keeps the operational panel and camera controls available without WebGL', () => {
    webgl.support = 'unsupported';

    const container = render(<ThreatMapPage />);
    const text = container.textContent ?? '';

    expect(text).toContain('3D rendering unavailable');
    expect(text).toContain('Operational picture');
    expect(text).toContain('WebGL unavailable');
    expect(button(container, 'Zoom in').disabled).toBe(true);
    expect(button(container, 'Reset view').disabled).toBe(true);
  });
});
