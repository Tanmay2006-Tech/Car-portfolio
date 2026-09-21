// Measures real frame rate against a running dev server using Playwright.
//
// Headed, not headless: headless Chromium falls back to SwiftShader
// (software rasterizer) unless a GPU-enabled headless mode is explicitly
// configured, and SwiftShader numbers don't reflect what a user's GPU will
// actually deliver. Headed mode uses the real GPU/ANGLE path.
//
// Usage: node tools/measure-fps.mjs [url]

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const URL = process.argv[2] ?? 'http://localhost:5173';
const SAMPLE_MS = 10_000;
const LOAD_TIMEOUT_MS = 30_000;
const WARMUP_MS = 2_000; // let shader compile / first-frame hitches settle before sampling
const SCREENSHOT_PATH = 'screenshots/step2.png';

function percentile(sortedAsc, p) {
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length));
  return sortedAsc[idx];
}

async function main() {
  await mkdir(path.dirname(SCREENSHOT_PATH), { recursive: true });

  console.log(`Launching headed Chromium ...`);
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    console.log(`Loading ${URL} ...`);
    await page.goto(URL, { waitUntil: 'load' });

    console.log('Waiting for the model to finish loading (window.__appReady) ...');
    await page.waitForFunction(() => window.__appReady === true, {
      timeout: LOAD_TIMEOUT_MS,
    });

    console.log(`Warming up for ${WARMUP_MS}ms (shader compile / first-frame hitches) ...`);
    await page.waitForTimeout(WARMUP_MS);

    console.log(`Sampling requestAnimationFrame deltas for ${SAMPLE_MS / 1000}s ...`);
    const deltas = await page.evaluate(
      (sampleMs) =>
        new Promise((resolve) => {
          const samples = [];
          const start = performance.now();
          let last = start;
          function tick(now) {
            samples.push(now - last);
            last = now;
            if (now - start < sampleMs) {
              requestAnimationFrame(tick);
            } else {
              resolve(samples);
            }
          }
          requestAnimationFrame(tick);
        }),
      SAMPLE_MS,
    );

    console.log(`Saving screenshot to ${SCREENSHOT_PATH} ...`);
    await page.screenshot({ path: SCREENSHOT_PATH });

    const frameTimesMs = deltas.slice(1).sort((a, b) => a - b); // drop the first sample (delta from warm-up idle, not a real frame)
    const fps = (ms) => 1000 / ms;

    const p50ms = percentile(frameTimesMs, 50);
    const p95ms = percentile(frameTimesMs, 95);
    const p99ms = percentile(frameTimesMs, 99);
    const worstMs = frameTimesMs[frameTimesMs.length - 1];
    const meanMs = frameTimesMs.reduce((a, b) => a + b, 0) / frameTimesMs.length;

    console.log('\n' + '='.repeat(60));
    console.log('FPS REPORT');
    console.log('='.repeat(60));
    console.log(`Frames sampled: ${frameTimesMs.length} over ${SAMPLE_MS / 1000}s`);
    console.log(`Mean:  ${fps(meanMs).toFixed(1)} fps  (${meanMs.toFixed(2)} ms/frame)`);
    console.log(`p50:   ${fps(p50ms).toFixed(1)} fps  (${p50ms.toFixed(2)} ms/frame)`);
    console.log(`p95:   ${fps(p95ms).toFixed(1)} fps  (${p95ms.toFixed(2)} ms/frame)  <- 95% of frames were at least this fast`);
    console.log(`p99:   ${fps(p99ms).toFixed(1)} fps  (${p99ms.toFixed(2)} ms/frame)  <- 99% of frames were at least this fast`);
    console.log(`Worst frame: ${worstMs.toFixed(2)} ms  (${fps(worstMs).toFixed(1)} fps)`);
    console.log('='.repeat(60));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
