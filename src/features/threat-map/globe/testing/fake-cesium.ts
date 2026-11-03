/**
 * Test double for the CesiumJS module surface the globe actually uses.
 *
 * The real viewer requires WebGL, a DOM container and a sizeable runtime, none
 * of which belong in a unit test. This fake records construction and every
 * camera or resource call so lifecycle behaviour can be asserted directly.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

export type ImageryBehaviour = 'resolve' | 'reject' | 'pending';
export type WebGLSupport = 'supported' | 'unsupported';

export interface FakeLayer {
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
}

export interface FakeViewer {
  scene: {
    backgroundColor: unknown;
    globe: { baseColor: unknown; showGroundAtmosphere: boolean };
    skyAtmosphere: {
      show: boolean;
      hueShift: number;
      saturationShift: number;
      brightnessShift: number;
    };
    skyBox: { show: boolean };
    sun: { show: boolean };
    moon: { show: boolean };
    screenSpaceCameraController: { minimumZoomDistance: number; maximumZoomDistance: number };
    requestRender: Mock;
  };
  camera: {
    positionCartographic: { height: number };
    setView: Mock;
    zoomIn: Mock;
    zoomOut: Mock;
  };
  cesiumWidget: { screenSpaceEventHandler: { removeInputAction: Mock } };
  imageryLayers: { addImageryProvider: Mock };
  resize: Mock;
  destroy: Mock;
}

export interface FakeCesium {
  readonly viewers: FakeViewer[];
  readonly layers: FakeLayer[];
  readonly Viewer: Mock;
  readonly fromUrl: Mock;
  readonly addImageryProvider: Mock;
  readonly removeInputAction: Mock;
  /** When true the next `new Viewer(...)` throws, simulating a failed context. */
  failNextViewer: boolean;
  imagery: ImageryBehaviour;
  /** Resolve a `pending` imagery request created by the last `fromUrl` call. */
  releaseImagery: () => void;
  reset: () => void;
  lastViewer: () => FakeViewer;
  module: () => Record<string, unknown>;
}

export function createFakeCesium(): FakeCesium {
  const viewers: FakeViewer[] = [];
  const layers: FakeLayer[] = [];
  let pendingResolve: (() => void) | null = null;

  const addImageryProvider = vi.fn(() => {
    const layer: FakeLayer = { brightness: 1, contrast: 1, saturation: 1, gamma: 1 };
    layers.push(layer);
    return layer;
  });

  const fake: FakeCesium = {
    viewers,
    layers,
    Viewer: vi.fn(),
    fromUrl: vi.fn(),
    addImageryProvider,
    removeInputAction: vi.fn(),
    failNextViewer: false,
    imagery: 'resolve',
    releaseImagery: () => {
      pendingResolve?.();
      pendingResolve = null;
    },
    reset: () => {
      viewers.length = 0;
      layers.length = 0;
      pendingResolve = null;
      fake.failNextViewer = false;
      fake.imagery = 'resolve';
      fake.Viewer.mockReset();
      fake.fromUrl.mockReset();
      addImageryProvider.mockClear();
      fake.removeInputAction.mockClear();
      // A regular function so `new Cesium.Viewer(...)` works in tests.
      fake.Viewer.mockImplementation(function fakeViewerConstructor() {
        if (fake.failNextViewer) {
          fake.failNextViewer = false;
          throw new Error('Unable to create WebGL context');
        }

        const viewer: FakeViewer = {
          scene: {
            backgroundColor: null,
            globe: { baseColor: null, showGroundAtmosphere: false },
            skyAtmosphere: {
              show: true,
              hueShift: 0,
              saturationShift: 0,
              brightnessShift: 0,
            },
            skyBox: { show: true },
            sun: { show: true },
            moon: { show: true },
            screenSpaceCameraController: { minimumZoomDistance: 1, maximumZoomDistance: 1 },
            requestRender: vi.fn(),
          },
          camera: {
            positionCartographic: { height: 10_000_000 },
            setView: vi.fn(),
            zoomIn: vi.fn(),
            zoomOut: vi.fn(),
          },
          cesiumWidget: { screenSpaceEventHandler: { removeInputAction: fake.removeInputAction } },
          imageryLayers: { addImageryProvider },
          resize: vi.fn(),
          destroy: vi.fn(),
        };

        viewers.push(viewer);
        return viewer;
      });

      fake.fromUrl.mockImplementation(() => {
        if (fake.imagery === 'reject') {
          return Promise.reject(new Error('Bundled texture unavailable'));
        }

        if (fake.imagery === 'pending') {
          return new Promise((resolve) => {
            pendingResolve = () => {
              resolve({ kind: 'tile-map-service' });
            };
          });
        }

        return Promise.resolve({ kind: 'tile-map-service' });
      });
    },
    lastViewer: () => {
      const viewer = viewers[viewers.length - 1];

      if (!viewer) {
        throw new Error('No fake Viewer was constructed');
      }

      return viewer;
    },
    module: () => ({
      Viewer: fake.Viewer,
      Cartesian3: {
        fromDegrees: (longitude: number, latitude: number, height: number) => ({
          longitude,
          latitude,
          height,
        }),
      },
      Color: {
        fromCssColorString: (css: string) => ({ css }),
      },
      Math: {
        toRadians: (degrees: number) => (degrees * Math.PI) / 180,
      },
      ScreenSpaceEventType: {
        LEFT_DOUBLE_CLICK: 257,
      },
      TileMapServiceImageryProvider: {
        fromUrl: fake.fromUrl,
      },
    }),
  };

  fake.reset();

  return fake;
}

/** Shared instance: the `vi.mock` factory and the test file must agree on it. */
export const fake = createFakeCesium();
