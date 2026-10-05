// Screenshots every beat of the route, from the hero to the cabin and the
// footer, plus a console-error check. Budgets duplicated from
// src/scene/scrollState.ts (Playwright doesn't run through Vite) — keep in
// sync by hand.
//
// Usage: node tools/capture-legs.mjs [url] [--mobile] [--only=name,name]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const URL = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5174'
const MOBILE = args.includes('--mobile')
const ONLY = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean)
const HERO_PX = 700
const COLD_START_PX = 2200
const ROUTE_PX = 28000
const ROUTE_M = 952.8
const at = (routeP) => HERO_PX + COLD_START_PX + routeP * ROUTE_PX
const atM = (m) => at(m / ROUTE_M)

const targets = [
  ['hero', 0],
  ['coldstart', HERO_PX + COLD_START_PX * 0.3],
  ['leg1-in', at(0.055)],
  ['leg1-marker0', atM(75)],
  ['leg1-between01', atM(97.5)],
  ['leg1-marker2', atM(165)],
  ['leg1-marker4', atM(255)],
  ['leg2', at(0.36)],
  ['leg3', at(0.56)],
  ['leg3-late', at(0.66)],
  ['leg4', at(0.74)],
  ['leg4-late', at(0.84)],
  ['leg5-about', at(0.93)],
  ['leg5-door', at(0.958)],
  ['leg5-enter', at(0.972)],
  ['leg5-cabin', at(1)],
  ['footer', at(1) + 2000],
].filter(([name]) => !ONLY.length || ONLY.includes(name))

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage(
  MOBILE
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } },
)
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(URL, { waitUntil: 'load' })
await page.waitForFunction(() => window.__appReady === true, { timeout: 60000 })
await page.waitForTimeout(1500)

const prefix = MOBILE ? 'screenshots/m-' : 'screenshots/leg-'
for (const [name, y] of targets) {
  // Approach from slightly before, so the damped heading/camera settle the
  // way they would on a real scroll instead of snapping across the route.
  await page.evaluate((v) => window.scrollTo(0, Math.max(0, v - 300)), y)
  await page.waitForTimeout(500)
  await page.evaluate((v) => window.scrollTo(0, v), y)
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${prefix}${name}.png` })
  console.log(`saved ${prefix}${name}.png (scrollY=${Math.round(y)})`)
}
console.log(errors.length ? `\nCONSOLE ERRORS:\n${[...new Set(errors)].join('\n')}` : '\nNo console errors.')
await browser.close()
