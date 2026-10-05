// Checks every leg's column (and the hero and contact panel) fits inside
// the viewport at common desktop sizes — the sticky column can't scroll on
// its own because Lenis owns the wheel, so anything that overflows is cut.
// Usage: node tools/check-overflow.mjs [url]
import { chromium } from 'playwright'
const URL = process.argv[2] ?? 'http://localhost:4173'
const at = (r) => 2900 + r * 28000
const SPOTS = [['hero', 0], ['leg1', at(0.0787)], ['leg2', at(0.36)], ['leg3', at(0.56)], ['leg4', at(0.75)], ['leg5', at(0.93)], ['cabin', at(1)]]
const b = await chromium.launch({ headless: false })
let failures = 0
for (const [w, h] of [[1280, 720], [1366, 768], [1440, 900], [1920, 1080]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto(URL, { waitUntil: 'load' })
  await p.waitForFunction(() => window.__appReady === true, { timeout: 90000 })
  const res = []
  for (const [n, y] of SPOTS) {
    await p.evaluate((v) => window.scrollTo(0, v), y)
    await p.waitForTimeout(500)
    const over = await p.evaluate(() =>
      [...document.querySelectorAll('.leg__column, .contact, .hero__inner')]
        .filter((e) => {
          const r = e.getBoundingClientRect()
          return r.top < innerHeight && r.bottom > 0 && getComputedStyle(e.closest('.hero') || e).visibility !== 'hidden'
        })
        .filter((e) => e.scrollHeight > e.clientHeight + 1)
        .map((e) => `${e.closest('section')?.id} ${e.scrollHeight}/${e.clientHeight}`),
    )
    if (over.length) failures++
    res.push(n + (over.length ? ' OVERFLOW ' + over.join(',') : ' ok'))
  }
  console.log(`${w}x${h}`, res.join(' | '))
  await p.close()
}
await b.close()
console.log(failures ? `${failures} overflow(s)` : 'Everything fits.')
