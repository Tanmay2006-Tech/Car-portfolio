// One-off diagnostic: real FPS + renderer.info (draw calls, triangles) per
// debug camera mode (src/scene/DebugCameraRig.tsx), to find out what's
// actually driving the top-down/low-wide FPS regression rather than
// guessing from source. Reads window.__gl exposed by App.tsx's onCreated.
//
// Usage: node tools/diagnose-perf.mjs

import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5173';
const MODES = ['three-quarter', 'top-down', 'low-wide'];
const KEY = { 'three-quarter': '1', 'top-down': '2', 'low-wide': '3' };
const SAMPLE_MS = 8000;
const SETTLE_MS = 3000;

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__appReady === true, { timeout: 30000 });
  await page.waitForTimeout(1000);

  for (const mode of MODES) {
    await page.keyboard.press(KEY[mode]);
    await page.waitForFunction((m) => window.__debugCameraMode === m, mode, { timeout: 5000 });
    await page.waitForTimeout(SETTLE_MS);

    // EffectComposer (SMAA) does its own renderer.render() calls for the
    // post-process passes, each of which resets info.render (autoReset)
    // before doing its own tiny full-screen-quad draw — so a naive read
    // after the frame only sees the LAST pass (a 1-triangle fullscreen
    // trick), not the actual scene. Disable autoReset and reset manually
    // right before a frame, so the count accumulates across every
    // renderer.render() call within that frame (main scene + all
    // post-process passes) instead of being clobbered by the last one.
    const info = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const gl = window.__gl;
          gl.info.autoReset = false;
          gl.info.reset();
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const snapshot = {
                calls: gl.info.render.calls,
                triangles: gl.info.render.triangles,
                lines: gl.info.render.lines,
                points: gl.info.render.points,
              };
              gl.info.autoReset = true;
              resolve(snapshot);
            });
          });
        }),
    );

    const deltas = await page.evaluate(
      (sampleMs) =>
        new Promise((resolve) => {
          const samples = [];
          const start = performance.now();
          let last = start;
          function tick(now) {
            samples.push(now - last);
            last = now;
            if (now - start < sampleMs) requestAnimationFrame(tick);
            else resolve(samples);
          }
          requestAnimationFrame(tick);
        }),
      SAMPLE_MS,
    );
    const frameTimes = deltas.slice(1).sort((a, b) => a - b);
    const mean = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const p50 = frameTimes[Math.floor(frameTimes.length * 0.5)];

    console.log(`\n=== ${mode} ===`);
    console.log(`  draw calls: ${info.calls}, triangles: ${info.triangles}, lines: ${info.lines}, points: ${info.points}`);
    console.log(`  fps: mean ${(1000 / mean).toFixed(1)}, p50 ${(1000 / p50).toFixed(1)} (n=${frameTimes.length} over ${SAMPLE_MS / 1000}s)`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
