/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional public label rendered in the header environment badge. */
  readonly VITE_GCTIC_ENV_LABEL?: string;
  /** Optional base URL for a future intelligence API gateway. */
  readonly VITE_GCTIC_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by Vite from package.json at build time. */
declare const __APP_VERSION__: string;
/** Injected by Vite at build time. */
declare const __BUILD_TIMESTAMP__: string;
/** Installed CesiumJS version, injected by Vite from node_modules. */
declare const __CESIUM_VERSION__: string;

interface Window {
  /** Base URL Cesium resolves its static runtime assets against. */
  CESIUM_BASE_URL?: string;
}
