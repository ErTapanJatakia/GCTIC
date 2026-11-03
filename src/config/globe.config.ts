/**
 * Geospatial view configuration.
 *
 * These values describe camera framing and rendering tuning only; they contain
 * no Cesium types so the constants stay usable from tests, the page copy and
 * the controller alike. Nothing here reaches an external service: imagery is
 * the locally bundled Natural Earth II texture, terrain is the WGS84 ellipsoid
 * and no Cesium ion token is involved.
 */

/**
 * URL prefix for Cesium's static runtime assets. The files are copied from
 * `node_modules/cesium` into `public/cesium` by `scripts/sync-cesium-assets.mjs`.
 */
export const GLOBE_ASSET_BASE_URL = '/cesium/';

export interface GlobeCameraView {
  /** WGS84 longitude in degrees. */
  readonly longitude: number;
  /** WGS84 latitude in degrees. */
  readonly latitude: number;
  /** Camera height above the ellipsoid, in metres. */
  readonly height: number;
  /** Camera pitch in degrees; -90 looks straight down at the surface. */
  readonly pitch: number;
}

/**
 * A framed view of the Atlantic basin: enough of Europe, Africa and the
 * Americas visible to read the planet as an operational surface without
 * implying any particular area of interest.
 */
export const GLOBE_HOME_VIEW: GlobeCameraView = {
  longitude: 12,
  latitude: 20,
  height: 23_500_000,
  pitch: -90,
};

/** Camera distance bounds in metres, applied to the mouse and touch controls. */
export const GLOBE_ZOOM_LIMITS = {
  minimumHeight: 1_200_000,
  maximumHeight: 44_000_000,
} as const;

/** Fraction of the current camera height applied per zoom action. */
export const GLOBE_ZOOM_STEP = 0.45;

/**
 * Locally bundled imagery. Natural Earth II is public domain (Natural Earth,
 * naturalearthdata.com) and ships inside the CesiumJS package, so the globe
 * renders without a token, a tile subscription or any network request.
 */
export const GLOBE_TEXTURE = {
  // The trailing slash matters: Cesium resolves `tilemapresource.xml` as a
  // sibling of this URL, so without it the request escapes the texture folder.
  url: `${GLOBE_ASSET_BASE_URL}Assets/Textures/NaturalEarthII/`,
  maximumLevel: 2,
  tileWidth: 256,
  tileHeight: 256,
  attribution: 'Imagery: Natural Earth II (public domain)',
} as const;

/**
 * Colour work applied to the default Natural Earth palette so the globe sits
 * inside the dark command interface instead of glowing like a daylight atlas.
 */
export const GLOBE_TUNING = {
  /** Shown while imagery loads, or if the bundled texture is unavailable. */
  baseColor: '#0b141b',
  backgroundColor: '#060809',
  imageryBrightness: 0.38,
  imageryContrast: 1.28,
  imagerySaturation: 0.18,
  imageryGamma: 0.82,
  atmosphereHueShift: -0.06,
  atmosphereSaturationShift: -0.55,
  atmosphereBrightnessShift: -0.25,
} as const;
