/**
 * CesiumJS lifecycle wrapper.
 *
 * This module is the only place in the application that touches Cesium. It
 * creates a single Viewer for a container, exposes the camera operations the
 * interface needs, and disposes every GPU resource it acquired. It knows
 * nothing about intelligence records: geospatial data layers are separate
 * milestones.
 *
 * Rendering is request-driven (`requestRenderMode`), so an idle globe does not
 * occupy the GPU. Imagery is the locally bundled Natural Earth II texture —
 * there is no Cesium ion token, no tile subscription and no external request.
 */

import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

import {
  GLOBE_HOME_VIEW,
  GLOBE_TEXTURE,
  GLOBE_TUNING,
  GLOBE_ZOOM_LIMITS,
  GLOBE_ZOOM_STEP,
} from '@/config/globe.config';
import type { GlobeCameraView } from '@/config/globe.config';

export interface GlobeControllerOptions {
  /** Element the Cesium widget is mounted into. */
  readonly container: HTMLElement;
  /** Element Cesium renders attribution into, styled by the host page. */
  readonly creditContainer: HTMLElement;
  /** Camera framing applied on creation and by `resetView`. */
  readonly homeView?: GlobeCameraView;
}

export interface GlobeController {
  /** The framing this controller resets to. */
  readonly homeView: GlobeCameraView;
  /** Return the camera to the configured global view. */
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Re-measure the container after a layout change. */
  resize: () => void;
  /** Release the WebGL context and Cesium resources. Safe to call twice. */
  destroy: () => void;
}

/**
 * Build the camera destination for a view. Kept separate so the controller
 * never re-derives framing from live camera state.
 */
function destinationFor(view: GlobeCameraView): Cesium.Cartesian3 {
  return Cesium.Cartesian3.fromDegrees(view.longitude, view.latitude, view.height);
}

export function createGlobeController(options: GlobeControllerOptions): GlobeController {
  const home: GlobeCameraView = options.homeView ?? GLOBE_HOME_VIEW;

  const viewer = new Cesium.Viewer(options.container, {
    // No imagery provider from Cesium ion: the bundled texture is added below.
    baseLayer: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    vrButton: false,
    creditContainer: options.creditContainer,
    scene3DOnly: true,
    // Render on demand: an untouched globe costs no frames.
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
  });

  const { scene } = viewer;

  scene.backgroundColor = Cesium.Color.fromCssColorString(GLOBE_TUNING.backgroundColor);
  scene.globe.baseColor = Cesium.Color.fromCssColorString(GLOBE_TUNING.baseColor);
  scene.globe.showGroundAtmosphere = true;

  const atmosphere = scene.skyAtmosphere;

  if (atmosphere) {
    atmosphere.show = true;
    atmosphere.hueShift = GLOBE_TUNING.atmosphereHueShift;
    atmosphere.saturationShift = GLOBE_TUNING.atmosphereSaturationShift;
    atmosphere.brightnessShift = GLOBE_TUNING.atmosphereBrightnessShift;
  }

  // Space stays empty: no star field or sun glare competing with the surface.
  if (scene.skyBox) {
    scene.skyBox.show = false;
  }

  if (scene.sun) {
    scene.sun.show = false;
  }

  if (scene.moon) {
    scene.moon.show = false;
  }

  scene.screenSpaceCameraController.minimumZoomDistance = GLOBE_ZOOM_LIMITS.minimumHeight;
  scene.screenSpaceCameraController.maximumZoomDistance = GLOBE_ZOOM_LIMITS.maximumHeight;

  // A double-click on the surface should select nothing and move nothing.
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
  );

  const applyHome = (): void => {
    viewer.camera.setView({
      destination: destinationFor(home),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(home.pitch),
        roll: 0,
      },
    });
    scene.requestRender();
  };

  applyHome();

  let disposed = false;

  // Imagery is added asynchronously. If the bundled texture is unavailable the
  // globe keeps its flat base colour instead of failing the whole view.
  void Cesium.TileMapServiceImageryProvider.fromUrl(GLOBE_TEXTURE.url, {
    maximumLevel: GLOBE_TEXTURE.maximumLevel,
    tileWidth: GLOBE_TEXTURE.tileWidth,
    tileHeight: GLOBE_TEXTURE.tileHeight,
  })
    .then((provider) => {
      if (disposed) {
        return;
      }

      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.brightness = GLOBE_TUNING.imageryBrightness;
      layer.contrast = GLOBE_TUNING.imageryContrast;
      layer.saturation = GLOBE_TUNING.imagerySaturation;
      layer.gamma = GLOBE_TUNING.imageryGamma;
      scene.requestRender();
    })
    .catch(() => {
      // Deliberately silent: the stylised base colour is a valid presentation.
    });

  const zoomBy = (direction: 1 | -1): void => {
    if (disposed) {
      return;
    }

    const height = viewer.camera.positionCartographic.height;
    const distance = height * GLOBE_ZOOM_STEP;

    if (direction > 0) {
      viewer.camera.zoomIn(distance);
    } else {
      viewer.camera.zoomOut(distance);
    }

    scene.requestRender();
  };

  return {
    homeView: home,
    resetView: () => {
      if (disposed) {
        return;
      }

      applyHome();
    },
    zoomIn: () => {
      zoomBy(1);
    },
    zoomOut: () => {
      zoomBy(-1);
    },
    resize: () => {
      if (disposed) {
        return;
      }

      viewer.resize();
      scene.requestRender();
    },
    destroy: () => {
      if (disposed) {
        return;
      }

      disposed = true;
      viewer.destroy();
    },
  };
}
