/**
 * Copy the static runtime assets CesiumJS requests by URL into `public/cesium`.
 *
 * Cesium resolves workers, textures and widget assets from `CESIUM_BASE_URL` at
 * runtime rather than through the bundler, so they have to exist as real files
 * next to the built application. The directory is generated, never committed.
 *
 * The copy is skipped when the marker file already records the installed
 * Cesium version, which keeps `npm install`, `npm run dev` and `npm run build`
 * cheap on repeat runs.
 */

import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const cesiumRoot = path.join(projectRoot, 'node_modules', 'cesium');
const sourceRoot = path.join(cesiumRoot, 'Build', 'Cesium');
const targetRoot = path.join(projectRoot, 'public', 'cesium');
const markerPath = path.join(targetRoot, '.cesium-assets.json');

/** Directories Cesium fetches at runtime. `index.js` itself is bundled by Vite. */
const ASSET_DIRECTORIES = ['Assets', 'ThirdParty', 'Widgets', 'Workers'];

async function readVersion() {
  const packageJson = JSON.parse(
    await readFile(path.join(cesiumRoot, 'package.json'), 'utf-8'),
  );

  return typeof packageJson.version === 'string' ? packageJson.version : null;
}

async function isCurrent(version) {
  if (!existsSync(markerPath)) {
    return false;
  }

  try {
    const marker = JSON.parse(await readFile(markerPath, 'utf-8'));

    return (
      marker.version === version &&
      ASSET_DIRECTORIES.every((directory) => existsSync(path.join(targetRoot, directory)))
    );
  } catch {
    return false;
  }
}

async function main() {
  if (!existsSync(sourceRoot)) {
    // Dependencies are not installed yet; nothing to copy and nothing to fail.
    console.warn('[cesium] Build assets not found; skipping static asset sync.');
    return;
  }

  const version = await readVersion();

  if (await isCurrent(version)) {
    return;
  }

  await mkdir(targetRoot, { recursive: true });

  for (const directory of ASSET_DIRECTORIES) {
    await cp(path.join(sourceRoot, directory), path.join(targetRoot, directory), {
      recursive: true,
      force: true,
    });
  }

  await writeFile(
    markerPath,
    `${JSON.stringify({ version, syncedAt: new Date().toISOString() }, null, 2)}\n`,
  );

  console.warn(`[cesium] Synced static assets for CesiumJS ${version ?? 'unknown'} into public/cesium.`);
}

await main();
