// Verifies the scroll-height <-> driving-speed mapping documented in
// scrollState.ts's PLACEHOLDER_PAGE_HEIGHT_PX comment: a normal, steady
// scroll pace should read ~50-70 km/h on the HUD, not the ~1800 km/h the
// original 800vh placeholder produced.
//
// Dispatches synthetic WheelEvents from a single in-page rAF loop (not
// Playwright round-trips per tick — those have enough IPC overhead per
// call that a naive "call page.mouse.wheel() every 50ms" loop only
// achieved ~55% of its intended rate, which is a test-harness artifact,
// not a real scrolling behaviour). This still goes through the real
// wheel -> Lenis -> ScrollTrigger -> scroll.progress -> Car.tsx pipeline;
// only the event source is synthetic.
//
// Usage: node tools/measure-speed.mjs [url]
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5174';

function readHud(page) {
  return page.evaluate(() => document.body.innerText.split('\n').slice(0, 8).join(' | '));
}

// Drives a steady wheel rate for `ms` milliseconds from inside the page.
function driveScroll(page, pxPerSecond, ms) {
  return page.evaluate(
    ({ pxPerSecond, ms }) =>
      new Promise((resolve) => {
        const start = performance.now();
        let last = start;
        function tick(now) {
          const dt = (now - last) / 1000;
          last = now;
          window.dispatchEvent(new WheelEvent('wheel', { deltaY: pxPerSecond * dt, bubbles: true, cancelable: true }));
          if (now - start < ms) requestAnimationFrame(tick);
          else resolve(undefined);
        }
        requestAnimationFrame(tick);
      }),
    { pxPerSecond, ms },
  );
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__appReady === true, { timeout: 30000 });
  await page.waitForTimeout(500);

  // scrollState.ts's derivation: ~490px/s for a ~16.7 m/s (60km/h) cruise
  // against ROUTE_PX's 28,000px.
  const CRUISE_PX_PER_SEC = 490;

  // CLAUDE.md section 1's opening now puts HERO_PX + COLD_START_PX (700 +
  // 2200 = 2900px, scrollState.ts) of static-landing-page and ignition-
  // sequence runway BEFORE the route starts — the car doesn't move at all
  // until scroll clears that. Jump straight past it so this test still
  // measures the thing it's actually for (the ROUTE_PX calibration), not
  // however many bursts it takes to clear the new runway first.
  await page.evaluate(() => window.scrollTo(0, 2900));
  await page.waitForTimeout(300);

  // Read speed mid-drive, in short back-to-back bursts, not after the loop
  // stops — Lenis keeps easing (decelerating) for a moment once input
  // stops, so a read taken even 200ms after the last event already shows a
  // decayed number, not the sustained cruise speed.
  console.log('--- steady cruise on the opening straight (sampled mid-drive) ---');
  for (let i = 0; i < 4; i++) {
    await driveScroll(page, CRUISE_PX_PER_SEC, 2000);
    console.log(await readHud(page));
  }

  console.log('\n--- continuing through the first bend (roll should show up, ~10s) ---');
  let peakRoll = 0;
  for (let i = 0; i < 5; i++) {
    await driveScroll(page, CRUISE_PX_PER_SEC, 2000);
    const rollText = await page.evaluate(() => {
      const el = [...document.querySelectorAll('div')].find((d) => d.textContent?.startsWith('roll'));
      return el?.textContent ?? '';
    });
    const val = Math.abs(parseFloat(rollText.replace('roll', '')));
    if (!Number.isNaN(val)) peakRoll = Math.max(peakRoll, val);
  }
  console.log(await readHud(page));
  console.log(`peak |roll| observed while sampling through the bend: ${peakRoll.toFixed(2)}°`);

  console.log('\n--- hard stop (braking: pitch dive + tail-light glow) ---');
  console.log('just before stop:', await readHud(page));
  await page.waitForTimeout(150);
  console.log('150ms after stop:', await readHud(page));
  await page.waitForTimeout(400);
  console.log('550ms after stop:', await readHud(page));
  await page.waitForTimeout(1500);
  console.log('2s after stop (should be back to 0):', await readHud(page));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
