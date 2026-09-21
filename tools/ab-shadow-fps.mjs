// A/B fps comparison of shadow.autoUpdate true vs false, each in a fresh
// page load (not a live toggle mid-session) so neither sample carries
// warm-up or GC state from the other. Headed Chromium per
// tools/measure-fps.mjs's rationale (headless falls back to SwiftShader).
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5174';
const SAMPLE_MS = 8_000;
const WARMUP_MS = 2_000;

function percentile(sortedAsc, p) {
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length));
  return sortedAsc[idx];
}

async function sampleFrames(page, driving) {
  return page.evaluate(
    ({ sampleMs, driving }) =>
      new Promise((resolve) => {
        const samples = [];
        const start = performance.now();
        let last = start;
        let scrollDir = 1;
        function tick(now) {
          samples.push(now - last);
          last = now;
          if (driving) {
            // Keep the page (and so the mutable `scroll` progress) actually
            // moving for the whole sampling window, both directions, so
            // this reflects real driving rather than one jump then idle.
            window.scrollBy(0, 6 * scrollDir);
            if (window.scrollY <= 0) scrollDir = 1;
            if (window.scrollY >= document.body.scrollHeight - window.innerHeight) scrollDir = -1;
          }
          if (now - start < sampleMs) requestAnimationFrame(tick);
          else resolve(samples);
        }
        requestAnimationFrame(tick);
      }),
    { sampleMs: SAMPLE_MS, driving },
  );
}

async function run(browser, { autoUpdate, driving, label }) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__appReady === true, { timeout: 30000 });
  await page.evaluate((v) => {
    window.__sunLight.shadow.autoUpdate = v;
    if (!v) window.__sunLight.shadow.needsUpdate = true;
  }, autoUpdate);
  await page.waitForTimeout(WARMUP_MS);

  const deltas = await sampleFrames(page, driving);
  const ms = deltas.slice(1).sort((a, b) => a - b);
  const fps = (x) => 1000 / x;
  const mean = ms.reduce((a, b) => a + b, 0) / ms.length;
  console.log(
    `[${label}] mean ${fps(mean).toFixed(1)}fps (${mean.toFixed(2)}ms)  p50 ${fps(percentile(ms, 50)).toFixed(1)}fps  p95 ${fps(percentile(ms, 95)).toFixed(1)}fps  p99 ${fps(percentile(ms, 99)).toFixed(1)}fps  worst ${fps(ms[ms.length - 1]).toFixed(1)}fps`,
  );
  await page.close();
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  await run(browser, { autoUpdate: false, driving: false, label: 'autoUpdate=false, idle      ' });
  await run(browser, { autoUpdate: true, driving: false, label: 'autoUpdate=true,  idle      ' });
  await run(browser, { autoUpdate: false, driving: true, label: 'autoUpdate=false, driving   ' });
  await run(browser, { autoUpdate: true, driving: true, label: 'autoUpdate=true,  driving   ' });
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
