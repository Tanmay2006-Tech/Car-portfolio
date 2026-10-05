// Drives the whole route with steady wheel input and reports frame rate
// per leg, plus LCP — the numbers CLAUDE.md section 6 budgets. Headed for
// the same reason as measure-fps.mjs (headless falls back to SwiftShader).
//
// Usage: node tools/measure-drive.mjs [url] [--mobile] [--cpu=4]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const URL = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4173'
const MOBILE = args.includes('--mobile')
const CPU = Number((args.find((a) => a.startsWith('--cpu=')) ?? '--cpu=1').slice(6))
const HERO_PX = 700
const COLD_START_PX = 2200
const ROUTE_PX = 28000
const LEGS = [
  ['cold start', 0, HERO_PX + COLD_START_PX],
  ['leg 1', HERO_PX + COLD_START_PX + 0.02 * ROUTE_PX, HERO_PX + COLD_START_PX + 0.3 * ROUTE_PX],
  ['leg 2', HERO_PX + COLD_START_PX + 0.3 * ROUTE_PX, HERO_PX + COLD_START_PX + 0.5 * ROUTE_PX],
  ['leg 3', HERO_PX + COLD_START_PX + 0.5 * ROUTE_PX, HERO_PX + COLD_START_PX + 0.7 * ROUTE_PX],
  ['leg 4', HERO_PX + COLD_START_PX + 0.7 * ROUTE_PX, HERO_PX + COLD_START_PX + 0.9 * ROUTE_PX],
  ['leg 5', HERO_PX + COLD_START_PX + 0.9 * ROUTE_PX, HERO_PX + COLD_START_PX + ROUTE_PX],
]

const browser = await chromium.launch({ headless: false })
const context = await browser.newContext(
  MOBILE
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } },
)
const page = await context.newPage()
if (CPU > 1) {
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
}
await page.addInitScript(() => {
  window.__lcp = 0
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__lcp = e.startTime
  }).observe({ type: 'largest-contentful-paint', buffered: true })
})

// --css="..." injects a stylesheet before load, for A/B-ing a style's cost.
const CSS = (args.find((a) => a.startsWith('--css=')) ?? '').slice(6)
if (CSS) await page.addInitScript((css) => {
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style')
    s.textContent = css
    document.head.appendChild(s)
  })
}, CSS)

const t0 = Date.now()
await page.goto(URL, { waitUntil: 'load' })
await page.waitForFunction(() => window.__appReady === true, { timeout: 90000 })
const modelReadyMs = Date.now() - t0
await page.waitForTimeout(2500)
const lcp = await page.evaluate(() => window.__lcp)

// Record every rAF timestamp alongside scrollY while scrolling.
await page.evaluate(() => {
  window.__frames = []
  const loop = (t) => {
    window.__frames.push([t, window.scrollY])
    if (!window.__stopFrames) requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
})
const total = HERO_PX + COLD_START_PX + ROUTE_PX
// ~1,500px/s: a brisk but ordinary scroll pace.
for (let y = 0; y < total; y += 100) {
  await page.mouse.wheel(0, 100)
  await page.waitForTimeout(66)
}
await page.waitForTimeout(1500)
const frames = await page.evaluate(() => {
  window.__stopFrames = true
  return window.__frames
})

function stats(ds) {
  if (!ds.length) return 'n/a'
  const sorted = [...ds].sort((a, b) => a - b)
  const mean = ds.reduce((a, b) => a + b, 0) / ds.length
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  return `${(1000 / mean).toFixed(1)} fps mean, p95 frame ${p95.toFixed(1)}ms (${(1000 / p95).toFixed(0)} fps), ${ds.length} frames`
}

console.log(`${MOBILE ? 'mobile 390x844 @2x' : 'desktop 1440x900'}${CPU > 1 ? `, CPU throttled ${CPU}x` : ''}`)
console.log(`LCP ${lcp.toFixed(0)}ms, model ready ${modelReadyMs}ms`)
for (const [name, from, to] of LEGS) {
  const ds = []
  for (let i = 1; i < frames.length; i++) {
    const y = frames[i][1]
    if (y >= from && y < to) ds.push(frames[i][0] - frames[i - 1][0])
  }
  console.log(`${name.padEnd(11)} ${stats(ds)}`)
}
const all = frames.slice(1).map((f, i) => f[0] - frames[i][0])
console.log(`${'overall'.padEnd(11)} ${stats(all)}`)
await browser.close()
