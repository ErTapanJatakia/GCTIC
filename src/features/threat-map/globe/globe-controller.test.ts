import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GLOBE_HOME_VIEW, GLOBE_TEXTURE, GLOBE_TUNING, GLOBE_ZOOM_LIMITS, GLOBE_ZOOM_STEP } from '@/config/globe.config';
import { createGlobeController } from './globe-controller';
import { fake } from './testing/fake-cesium';

vi.mock('cesium', async () => {
  const helper = await import('./testing/fake-cesium');
  return helper.fake.module();
});

function createController() {
  return createGlobeController({
    container: {} as HTMLElement,
    creditContainer: {} as HTMLElement,
  });
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('globe controller', () => {
  beforeEach(() => {
    fake.reset();
  });

  it('creates exactly one token-free viewer with on-demand rendering', () => {
    createController();

    expect(fake.Viewer).toHaveBeenCalledTimes(1);

    const options = fake.Viewer.mock.calls[0]?.[1] as Record<string, unknown>;

    expect(options.baseLayer).toBe(false);
    expect(options.requestRenderMode).toBe(true);
    expect(options.maximumRenderTimeChange).toBe(Infinity);
    expect(options.scene3DOnly).toBe(true);
    expect(options.geocoder).toBe(false);
    expect(options.baseLayerPicker).toBe(false);
    expect(options.timeline).toBe(false);
    expect(options.animation).toBe(false);
    expect(options.infoBox).toBe(false);
    // The only accepted imagery source: no ion token, asset id or terrain key.
    expect(JSON.stringify(options)).not.toMatch(/accessToken|assetId|"token"|terrainProvider/i);
  });

  it('frames the configured home view, looking straight down', () => {
    createController();

    const viewer = fake.lastViewer();
    const call = viewer.camera.setView.mock.calls[0]?.[0] as {
      destination: { longitude: number; latitude: number; height: number };
      orientation: { heading: number; pitch: number; roll: number };
    };

    expect(call.destination).toEqual({
      longitude: GLOBE_HOME_VIEW.longitude,
      latitude: GLOBE_HOME_VIEW.latitude,
      height: GLOBE_HOME_VIEW.height,
    });
    expect(call.orientation.pitch).toBeCloseTo((-90 * Math.PI) / 180, 6);
    expect(viewer.scene.requestRender).toHaveBeenCalled();
  });

  it('applies the dark surface treatment and the configured zoom limits', () => {
    createController();

    const viewer = fake.lastViewer();

    expect(viewer.scene.backgroundColor).toEqual({ css: GLOBE_TUNING.backgroundColor });
    expect(viewer.scene.globe.baseColor).toEqual({ css: GLOBE_TUNING.baseColor });
    expect(viewer.scene.skyBox.show).toBe(false);
    expect(viewer.scene.sun.show).toBe(false);
    expect(viewer.scene.moon.show).toBe(false);
    expect(viewer.scene.skyAtmosphere.saturationShift).toBe(
      GLOBE_TUNING.atmosphereSaturationShift,
    );
    expect(viewer.scene.screenSpaceCameraController.minimumZoomDistance).toBe(
      GLOBE_ZOOM_LIMITS.minimumHeight,
    );
    expect(viewer.scene.screenSpaceCameraController.maximumZoomDistance).toBe(
      GLOBE_ZOOM_LIMITS.maximumHeight,
    );
    // Double-click must not move the camera or select surface features.
    expect(fake.removeInputAction).toHaveBeenCalledTimes(1);
  });

  it('overlays the locally bundled texture and tints it for the dark interface', async () => {
    createController();
    await flushPromises();

    expect(fake.fromUrl).toHaveBeenCalledTimes(1);
    expect(fake.fromUrl.mock.calls[0]?.[0]).toBe(GLOBE_TEXTURE.url);
    expect(String(fake.fromUrl.mock.calls[0]?.[0])).not.toMatch(/^https?:/);

    expect(fake.addImageryProvider).toHaveBeenCalledTimes(1);
    const [layer] = fake.layers;

    expect(layer?.brightness).toBe(GLOBE_TUNING.imageryBrightness);
    expect(layer?.contrast).toBe(GLOBE_TUNING.imageryContrast);
    expect(layer?.saturation).toBe(GLOBE_TUNING.imagerySaturation);
    expect(layer?.gamma).toBe(GLOBE_TUNING.imageryGamma);
  });

  it('keeps the stylised base colour when the bundled texture is unavailable', async () => {
    fake.imagery = 'reject';

    expect(() => createController()).not.toThrow();
    await flushPromises();

    expect(fake.Viewer).toHaveBeenCalledTimes(1);
    expect(fake.addImageryProvider).not.toHaveBeenCalled();
  });

  it('ignores imagery that resolves after the viewer was destroyed', async () => {
    fake.imagery = 'pending';

    const controller = createController();
    controller.destroy();
    fake.releaseImagery();
    await flushPromises();

    expect(fake.addImageryProvider).not.toHaveBeenCalled();
  });

  it('zooms by a fraction of the current camera height', () => {
    const controller = createController();
    const viewer = fake.lastViewer();

    viewer.camera.positionCartographic.height = 10_000_000;

    controller.zoomIn();
    expect(viewer.camera.zoomIn).toHaveBeenCalledWith(10_000_000 * GLOBE_ZOOM_STEP);

    controller.zoomOut();
    expect(viewer.camera.zoomOut).toHaveBeenCalledWith(10_000_000 * GLOBE_ZOOM_STEP);
  });

  it('re-measures the viewer on resize and returns to the home view on reset', () => {
    const controller = createController();
    const viewer = fake.lastViewer();

    controller.resize();
    expect(viewer.resize).toHaveBeenCalledTimes(1);

    controller.resetView();
    expect(viewer.camera.setView).toHaveBeenCalledTimes(2);
  });

  it('destroys the viewer once and ignores commands after disposal', () => {
    const controller = createController();
    const viewer = fake.lastViewer();

    controller.destroy();
    controller.destroy();

    expect(viewer.destroy).toHaveBeenCalledTimes(1);

    controller.resetView();
    controller.zoomIn();
    controller.resize();

    expect(viewer.camera.setView).toHaveBeenCalledTimes(1);
    expect(viewer.camera.zoomIn).not.toHaveBeenCalled();
    expect(viewer.resize).not.toHaveBeenCalled();
  });
});
