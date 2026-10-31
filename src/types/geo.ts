/**
 * Geospatial value types.
 *
 * Coordinates are WGS84 decimal degrees. GCTIC records *where an observation
 * is reported to originate*, which is not the same as where an actor operates.
 * Any geospatial record must therefore carry the provenance and assessment
 * grade that produced it.
 */

export interface GeoPoint {
  /** WGS84 latitude in decimal degrees, -90..90. */
  readonly latitude: number;
  readonly longitude: number;
  /** Optional altitude in metres above the WGS84 ellipsoid. */
  readonly altitude?: number;
}

export type GeoPrecision =
  /** Rounded to country level; insufficient for city or facility claims. */
  | 'country'
  | 'region'
  | 'city'
  | 'facility'
  /** Provider-supplied coordinate of unknown derivation. */
  | 'unknown';

export interface GeoLocation {
  readonly point: GeoPoint;
  readonly precision: GeoPrecision;
  /** ISO 3166-1 alpha-2 where known. */
  readonly countryCode?: string;
  /** Free-text place label for display only; never used for logic. */
  readonly placeName?: string;
}

export function isGeoPoint(value: unknown): value is GeoPoint {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { latitude, longitude } = value as Partial<GeoPoint>;

  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}
