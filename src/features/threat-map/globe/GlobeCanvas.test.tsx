// @vitest-environment jsdom
import { createRef } from 'react';
import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobeCanvas } from './GlobeCanvas';
import type { GlobeCanvasHandle, GlobeStatus } from './GlobeCanvas';
import { fake } from './testing/fake-cesium';

vi.mock('cesium', async () => {
  const helper = await import('./testing/fake-cesium');
  return helper.fake.module();
});

const webgl = vi.hoisted(() => ({ support: 'supported' as 'supported' | 'unsupported' }));

vi.mock('./webgl', () => ({
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
    root.render(element);
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

function globeState(container: HTMLElement): string | null {
  return container.querySelector('.globe')?.getAttribute('data-status') ?? null;
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
  fake.reset();
  webgl.support = 'supported';
  delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
});

beforeEach(() => {
  fake.reset();
});

describe('globe canvas', () => {
  it('initialises one viewer, reports readiness and destroys it on unmount', () => {
    const statuses: GlobeStatus[] = [];
    const container = render(<GlobeCanvas onStatusChange={(status) => statuses.push(status)} />);

    expect(fake.Viewer).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(['loading', 'ready']);
    expect(globeState(container)).toBe('ready');
    expect(container.querySelector('.globe__viewport')?.getAttribute('role')).toBe('img');
    expect(container.querySelector('.globe__viewport')?.getAttribute('aria-label')).toMatch(
      /Drag to rotate/,
    );

    unmountAll();
    expect(fake.lastViewer().destroy).toHaveBeenCalledTimes(1);
  });

  it('renders an explicit fallback instead of a viewer when WebGL is unavailable', () => {
    webgl.support = 'unsupported';
    const statuses: GlobeStatus[] = [];

    const container = render(<GlobeCanvas onStatusChange={(status) => statuses.push(status)} />);

    expect(fake.Viewer).not.toHaveBeenCalled();
    expect(globeState(container)).toBe('unsupported');
    expect(statuses).toEqual(['loading', 'unsupported']);
    expect(container.textContent).toContain('3D rendering unavailable');
    expect(container.textContent).toContain('no intelligence is hidden behind the visualisation');
  });

  it('reports a failure and recovers when the globe is retried', () => {
    fake.failNextViewer = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const container = render(<GlobeCanvas />);

    expect(globeState(container)).toBe('failed');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Globe failed to initialise',
    );

    act(() => {
      button(container, 'Retry globe').click();
    });

    expect(fake.Viewer).toHaveBeenCalledTimes(2);
    expect(globeState(container)).toBe('ready');

    consoleError.mockRestore();
  });

  it('re-measures the viewer when the container resizes and stops observing on unmount', () => {
    class FakeResizeObserver {
      static readonly instances: FakeResizeObserver[] = [];
      readonly observe = vi.fn();
      readonly unobserve = vi.fn();
      readonly disconnect = vi.fn();

      constructor(readonly callback: ResizeObserverCallback) {
        FakeResizeObserver.instances.push(this);
      }
    }

    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = FakeResizeObserver;

    render(<GlobeCanvas />);

    const observer = FakeResizeObserver.instances[0];

    expect(observer).toBeDefined();

    act(() => {
      observer?.callback([], observer as unknown as ResizeObserver);
    });

    expect(fake.lastViewer().resize).toHaveBeenCalledTimes(1);

    unmountAll();
    expect(observer?.disconnect).toHaveBeenCalledTimes(1);
  });

  it('exposes the camera operations through its imperative handle', () => {
    const ref = createRef<GlobeCanvasHandle>();
    render(<GlobeCanvas ref={ref} />);

    const viewer = fake.lastViewer();

    act(() => {
      ref.current?.zoomIn();
      ref.current?.zoomOut();
      ref.current?.resetView();
    });

    expect(viewer.camera.zoomIn).toHaveBeenCalledTimes(1);
    expect(viewer.camera.zoomOut).toHaveBeenCalledTimes(1);
    expect(viewer.camera.setView).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the imperative handle is used after unmount', () => {
    const ref = createRef<GlobeCanvasHandle>();
    render(<GlobeCanvas ref={ref} />);

    const viewer = fake.lastViewer();
    unmountAll();

    act(() => {
      ref.current?.zoomIn();
      ref.current?.resetView();
    });

    expect(viewer.camera.zoomIn).not.toHaveBeenCalled();
    expect(viewer.camera.setView).toHaveBeenCalledTimes(1);
  });
});
