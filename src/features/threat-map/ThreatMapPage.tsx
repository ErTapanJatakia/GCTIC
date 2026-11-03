import { useEffect, useRef, useState } from 'react';

import { appConfig } from '@/config/app.config';
import { GLOBE_HOME_VIEW, GLOBE_TEXTURE } from '@/config/globe.config';
import { formatCount } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { StatusDot } from '@/components/ui/StatusDot';
import type { StatusTone } from '@/components/ui/StatusDot';
import { GlobeCanvas } from './globe/GlobeCanvas';
import type { GlobeCanvasHandle, GlobeStatus } from './globe/GlobeCanvas';

const CAMERA_ALTITUDE_KM = Math.round(GLOBE_HOME_VIEW.height / 1000);

const STATUS_TONES: Readonly<Record<GlobeStatus, StatusTone>> = {
  loading: 'idle',
  ready: 'online',
  unsupported: 'degraded',
  failed: 'offline',
};

const STATUS_LABELS: Readonly<Record<GlobeStatus, string>> = {
  loading: 'Renderer starting',
  ready: 'Renderer active',
  unsupported: 'WebGL unavailable',
  failed: 'Renderer failed',
};

/**
 * The four location categories the platform must keep distinct. Only the
 * first two can ever describe where an observation was reported; a synthetic
 * coordinate is a test fixture and an unknown coordinate is simply unknown.
 */
const LOCATION_CATEGORIES = [
  {
    id: 'observed',
    title: 'Observed',
    description:
      'A source reported this coordinate with usable precision. The globe may plot it as an observation location — never as an attacker.',
  },
  {
    id: 'inferred',
    title: 'Inferred',
    description:
      'Derived from a GeoIP lookup or similar enrichment, with the derivation recorded. Inferred points are marked as such wherever they appear.',
  },
  {
    id: 'synthetic',
    title: 'Synthetic',
    description:
      'Generated for interface testing. Every coordinate in the bundled dataset is in this class, so none of them is plotted as a real location.',
  },
  {
    id: 'unknown',
    title: 'Unknown',
    description:
      'No usable position, or a position of unknown derivation. Rendered as text without a map reference rather than guessed.',
  },
] as const;

const DEFERRED_LAYERS = [
  'Threat markers and source attribution on the globe',
  'Marker clustering and density heat maps',
  'Connection arcs between infrastructure and events',
  'CZML time-dynamic playback of historical activity',
  'Live feed integration feeding any of the above',
] as const;

/**
 * Global Threat Map.
 *
 * This milestone delivers the geospatial surface only. The page states plainly
 * that no feed is connected and that the two synthetic coordinates in the
 * dataset are deliberately not plotted, because their precision is unknown and
 * they were invented for interface testing.
 */
export function ThreatMapPage() {
  const globeRef = useRef<GlobeCanvasHandle | null>(null);
  const expandButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef(false);
  const [globeStatus, setGlobeStatus] = useState<GlobeStatus>('loading');
  const [expanded, setExpanded] = useState(false);

  const rendererReady = globeStatus === 'ready';

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  useEffect(() => {
    if (expanded || !restoreFocusRef.current) {
      return;
    }

    restoreFocusRef.current = false;
    expandButtonRef.current?.focus();
  }, [expanded]);

  const toggleExpanded = () => {
    restoreFocusRef.current = true;
    setExpanded((current) => !current);
  };

  return (
    <>
      <PageHeader
        eyebrow="OPERATIONS // GEOSPATIAL"
        title="Global threat map"
        description="An interactive three-dimensional Earth rendered locally with CesiumJS. This milestone establishes the geospatial surface only: no threat layer, marker, heat map, arc or live feed is plotted on it yet."
        meta={
          <>
            <Badge variant="success">3D globe foundation</Badge>
            <Badge variant="warning">No live threat feed</Badge>
            <Badge variant="neutral">CesiumJS {__CESIUM_VERSION__}</Badge>
            <Badge variant="neutral">Local imagery — no keys</Badge>
          </>
        }
      />

      <div className="notice" data-tone="warning">
        <div>
          <p className="notice__title">No live feed is connected, and no location is plotted</p>
          <p className="notice__body">
            GCTIC has no sensor network, no real-time collection and no global telemetry. The
            bundled dataset holds two coordinates that were invented for interface testing and are
            declared at <code>unknown</code> precision, so they are deliberately withheld from the
            globe: drawing them would present fictional points as observed activity. When a marker
            does appear in a later milestone it will represent an observation a source reported,
            never an attacker&rsquo;s location.
          </p>
        </div>
      </div>

      <div className="globe-layout" data-expanded={expanded}>
        <div className="globe-stage">
          <Panel
            label="GEOSPATIAL VIEW"
            title="Operational globe"
            description="Drag to rotate the planet, scroll or pinch to zoom. The camera is constrained to a sane operational range and renders only when something changes."
            className="panel--flush"
            actions={
              <div className="globe-toolbar" role="group" aria-label="Globe camera controls">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => globeRef.current?.zoomOut()}
                  disabled={!rendererReady}
                >
                  Zoom out
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => globeRef.current?.zoomIn()}
                  disabled={!rendererReady}
                >
                  Zoom in
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => globeRef.current?.resetView()}
                  disabled={!rendererReady}
                >
                  Reset view
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  ref={expandButtonRef}
                  onClick={toggleExpanded}
                  aria-pressed={expanded}
                >
                  {expanded ? 'Exit expanded' : 'Expand view'}
                </button>
              </div>
            }
          >
            <GlobeCanvas ref={globeRef} onStatusChange={setGlobeStatus} />

            <div className="globe__footer">
              <StatusDot tone={STATUS_TONES[globeStatus]} label={STATUS_LABELS[globeStatus]} />
              <span aria-hidden="true">·</span>
              <span>{GLOBE_TEXTURE.attribution}</span>
              <span aria-hidden="true">·</span>
              <span>Terrain: WGS84 ellipsoid</span>
              <span aria-hidden="true">·</span>
              <span>External requests: none</span>
            </div>
          </Panel>
        </div>

        <div className="globe-brief">
          <Panel
            label="DATA STATUS"
            title="Operational picture"
            actions={<Badge variant="warning">{appConfig.dataMode.toUpperCase()}</Badge>}
          >
            <dl className="definition-list">
              <dt>Threat markers</dt>
              <dd>None plotted — no geospatial layer exists yet</dd>
              <dt>Live feed</dt>
              <dd>Not implemented</dd>
              <dt>Coordinates in dataset</dt>
              <dd>
                {formatCount(2)} synthetic points at unknown precision, intentionally not drawn
              </dd>
              <dt>Geolocation source</dt>
              <dd>None — no GeoIP or enrichment service is queried</dd>
              <dt>Home view</dt>
              <dd className="u-mono">
                {GLOBE_HOME_VIEW.latitude}°N {GLOBE_HOME_VIEW.longitude}°E ·{' '}
                {formatCount(CAMERA_ALTITUDE_KM)} km · pitch {GLOBE_HOME_VIEW.pitch}°
              </dd>
              <dt>Renderer</dt>
              <dd className="u-mono">CesiumJS {__CESIUM_VERSION__} · Apache-2.0</dd>
              <dt>Imagery licence</dt>
              <dd>Natural Earth II — public domain, bundled with the build</dd>
            </dl>
          </Panel>

          <Panel
            label="LOCATION CONFIDENCE"
            title="What a point may claim"
            description="The globe must never blur these categories. Nothing below is drawn in this build; the legend defines the vocabulary the next milestone has to honour."
          >
            <ul className="globe-legend">
              {LOCATION_CATEGORIES.map((category) => (
                <li className="globe-legend__item" key={category.id}>
                  <span
                    className="globe-legend__swatch"
                    data-kind={category.id}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="globe-legend__title">{category.title}</span>
                    {category.description}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            label="DEFERRED"
            title="Not in this milestone"
            description="Declared in the roadmap, deliberately absent from the build."
          >
            <ol className="capability-list">
              {DEFERRED_LAYERS.map((layer, index) => (
                <li key={layer} className="capability-list__item">
                  <span className="capability-list__index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{layer}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>

      <p className="u-text-tertiary">
        The globe is rendered by CesiumJS from a locally bundled Natural Earth II texture and the
        WGS84 ellipsoid: no tile server, terrain provider, geocoder or Cesium ion token is
        contacted, and camera state stays in this browser tab. Camera operations are available as
        buttons, so the view is never keyboard-inaccessible.
      </p>
    </>
  );
}
