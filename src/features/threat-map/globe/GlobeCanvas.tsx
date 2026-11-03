import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { createGlobeController } from './globe-controller';
import type { GlobeController } from './globe-controller';
import { detectWebGLSupport } from './webgl';

export type GlobeStatus = 'loading' | 'ready' | 'unsupported' | 'failed';

export interface GlobeCanvasHandle {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface GlobeCanvasProps {
  /** Notified whenever the renderer enters a new lifecycle state. */
  readonly onStatusChange?: (status: GlobeStatus) => void;
}

/**
 * React boundary around the Cesium viewer.
 *
 * Exactly one Viewer exists per mounted instance: it is created in an effect,
 * re-measured through a ResizeObserver, and destroyed on unmount. WebGL
 * absence and initialisation failures render an explicit fallback instead of
 * an empty box, and the camera controls on the page stay available for the
 * rest of the interface.
 */
export const GlobeCanvas = forwardRef<GlobeCanvasHandle, GlobeCanvasProps>(function GlobeCanvas(
  { onStatusChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const creditRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<GlobeController | null>(null);
  const statusCallbackRef = useRef(onStatusChange);
  const [status, setStatus] = useState<GlobeStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    statusCallbackRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    const container = containerRef.current;
    const creditContainer = creditRef.current;

    if (!container || !creditContainer) {
      return;
    }

    const publish = (next: GlobeStatus): void => {
      setStatus(next);
      statusCallbackRef.current?.(next);
    };

    publish('loading');

    if (detectWebGLSupport() === 'unsupported') {
      publish('unsupported');
      return;
    }

    let controller: GlobeController;

    try {
      controller = createGlobeController({ container, creditContainer });
    } catch (error) {
      console.error(
        '[GCTIC] Globe initialisation failed',
        error instanceof Error ? error.message : 'unknown error',
      );
      publish('failed');
      return;
    }

    controllerRef.current = controller;
    publish('ready');

    let observer: ResizeObserver | undefined;

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        controller.resize();
      });
      observer.observe(container);
    }

    return () => {
      observer?.disconnect();
      controllerRef.current = null;
      controller.destroy();
    };
  }, [attempt]);

  useImperativeHandle(
    ref,
    () => ({
      resetView: () => controllerRef.current?.resetView(),
      zoomIn: () => controllerRef.current?.zoomIn(),
      zoomOut: () => controllerRef.current?.zoomOut(),
    }),
    [],
  );

  return (
    <div className="globe" data-status={status}>
      <div
        className="globe__viewport"
        ref={containerRef}
        role="img"
        aria-label="Interactive three-dimensional globe. Drag to rotate, scroll or pinch to zoom, or use the camera controls in the panel header."
      />
      <div className="globe__credit" ref={creditRef} />

      {status === 'loading' ? (
        <div className="globe__overlay">
          <LoadingState label="Initialising 3D globe" rows={2} />
        </div>
      ) : null}

      {status === 'unsupported' ? (
        <div className="globe__overlay">
          <EmptyState
            title="3D rendering unavailable"
            description="This browser could not provide a WebGL context, so the globe cannot be drawn. Every value on this page is still available without it: no intelligence is hidden behind the visualisation."
            hint="Enable hardware acceleration or use a WebGL-capable browser"
          />
        </div>
      ) : null}

      {status === 'failed' ? (
        <div className="globe__overlay">
          <ErrorState
            title="Globe failed to initialise"
            description="CesiumJS could not start in this browser session, so the geospatial surface was not drawn. No data was read, changed or transmitted."
            onRetry={() => setAttempt((current) => current + 1)}
            retryLabel="Retry globe"
          />
        </div>
      ) : null}
    </div>
  );
});
