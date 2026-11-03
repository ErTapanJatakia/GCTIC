import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/globe.css';

import { GLOBE_ASSET_BASE_URL } from '@/config/globe.config';

/**
 * Cesium resolves its Workers, Assets and Widgets relative to this base and
 * reads it when its module initialises. The files are copied from the package
 * into `public/cesium` by `scripts/sync-cesium-assets.mjs`, so the globe never
 * requests anything from a CDN or a Cesium ion endpoint.
 */
window.CESIUM_BASE_URL = GLOBE_ASSET_BASE_URL;

const container = document.getElementById('root');

if (!container) {
  throw new Error('Application root element was not found in the document.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
