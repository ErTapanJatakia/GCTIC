/**
 * WebGL capability probe.
 *
 * Cesium cannot initialise without a WebGL context, so the globe checks for one
 * before constructing a Viewer. The probe accepts an injectable document so the
 * unsupported path can be exercised without a real browser.
 */

export type WebGLSupport = 'supported' | 'unsupported';

type MinimalCanvas = {
  getContext: (contextId: string) => unknown;
};

type MinimalDocument = {
  createElement: (tagName: string) => MinimalCanvas;
};

function resolveDocument(candidate: Document | undefined): MinimalDocument | undefined {
  if (candidate) {
    return candidate as unknown as MinimalDocument;
  }

  return typeof document === 'undefined' ? undefined : (document as unknown as MinimalDocument);
}

/**
 * Returns `supported` only when a real context object is created. Anything
 * thrown by the browser (blocklisted GPU, disabled hardware acceleration,
 * exhausted context quota) is treated as unsupported rather than fatal.
 */
export function detectWebGLSupport(candidate?: Document): WebGLSupport {
  const doc = resolveDocument(candidate);

  if (!doc) {
    return 'unsupported';
  }

  try {
    const canvas = doc.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');

    if (!context) {
      return 'unsupported';
    }

    // Release the probe context immediately: browsers cap the number of live
    // WebGL contexts and the Viewer needs one of its own.
    const loseContext = (context as { getExtension?: (name: string) => unknown }).getExtension;
    const extension = loseContext?.call(context, 'WEBGL_lose_context') as
      | { loseContext?: () => void }
      | undefined;
    extension?.loseContext?.();

    return 'supported';
  } catch {
    return 'unsupported';
  }
}
