// Captures the three debug-camera views added for judging the route shape
// (PROMPTS.md step 3) via the '1'/'2'/'3' keyboard toggle in
// src/scene/DebugCameraRig.tsx. Headed, not headless — same reasoning as
// tools/measure-fps.mjs: headless Chromium falls back to SwiftShader.
//
// Usage: node tools/capture-debug-views.mjs [url]

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const URL = process.argv[2] ?? 'http://localhost:5173';
const LOAD_TIMEOUT_MS = 30_000;
const SETTLE_MS = 500;
const OUT_DIR = 'screenshots';

const VIEWS = [
  { key: '1', mode: 'three-quarter', file: 'step3-threequarter.png' },
  { key: '2', mode: 'top-down', file: 'step3-topdown.png' },
  { key: '3', mode: 'low-wide', file: 'step3-lowwide.png' },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log('Launching headed Chromium ...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    console.log(`Loading ${URL} ...`);
    await page.goto(URL, { waitUntil: 'load' });

    console.log('Waiting for the model to finish loading (window.__appReady) ...');
    await page.waitForFunction(() => window.__appReady === true, { timeout: LOAD_TIMEOUT_MS });

    for (const view of VIEWS) {
      console.log(`Switching to ${view.mode} (pressing "${view.key}") ...`);
      await page.keyboard.press(view.key);
      await page.waitForFunction((mode) => window.__debugCameraMode === mode, view.mode, {
        timeout: 5_000,
      });
      await page.waitForTimeout(SETTLE_MS);

      const outPath = path.join(OUT_DIR, view.file);
      await page.screenshot({ path: outPath });
      console.log(`  -> ${outPath}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
