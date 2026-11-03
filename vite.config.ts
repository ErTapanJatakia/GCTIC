import { readFileSync } from 'node:fs';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version: string };

/** Installed CesiumJS version, shown in the geospatial view; never hard-coded. */
const cesiumVersion = (() => {
  try {
    const cesiumPackage = JSON.parse(
      readFileSync(new URL('./node_modules/cesium/package.json', import.meta.url), 'utf-8'),
    ) as { version?: string };

    return cesiumPackage.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
})();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
    __CESIUM_VERSION__: JSON.stringify(cesiumVersion),
  },
  server: {
    // Bind on all interfaces so the workspace preview proxy can reach the server.
    host: true,
    port: 3000,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
