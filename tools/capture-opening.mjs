// Screenshots the four moments of CLAUDE.md section 1's "The opening" —
// on load, mid cold start, end of cold start, and just into the drive —
// plus a console-error check. Playwright can't import scrollState.ts
// directly (it's not run through Vite), so HERO_PX/COLD_START_PX/ROUTE_PX
// are duplicated here; keep them in sync with scrollState.ts by hand if
// those budgets ever move.
//
// Usage: node tools/capture-opening.mjs [url]
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5174';
const HERO_PX = 700;
const COLD_START_PX = 2200;
const ROUTE_PX = 28000;

const targets = [
  { label: '0 scroll (hero, on load)', scrollY: 0, out: 'screenshots/opening-0-hero.png' },
  { label: 'mid cold start', scrollY: HERO_PX + COLD_START_PX * 0.5, out: 'screenshots/opening-1-midcoldstart.png' },
  { label: 'end of cold start', scrollY: HERO_PX + COLD_START_PX + 5, out: 'screenshots/opening-2-endcoldstart.png' },
  { label: '5% into the drive', scrollY: HERO_PX + COLD_START_PX + ROUTE_PX * 0.05, out: 'screenshots/opening-3-drive5pct.png' },
];

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__appReady === true, { timeout: 30000 });

  for (const t of targets) {
    await page.evaluate((y) => window.scrollTo(0, y), t.scrollY);
    await page.waitForTimeout(900);
    await page.screenshot({ path: t.out });
    console.log(`saved ${t.out} (${t.label}, scrollY=${Math.round(t.scrollY)})`);
  }

  console.log(errors.length ? `\nCONSOLE ERRORS:\n${errors.join('\n')}` : '\nNo console errors.');
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
