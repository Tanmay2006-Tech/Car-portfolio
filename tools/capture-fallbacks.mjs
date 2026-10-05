// Screenshots the two fallback layouts (CLAUDE.md section 7): reduced
// motion (?static, same code path as prefers-reduced-motion) and no WebGL
// (?nowebgl, same path as a failed canvas probe).
// Usage: node tools/capture-fallbacks.mjs [baseUrl]
import { chromium } from 'playwright'
const BASE = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ headless: false })
const errors = []
for (const [mode, query] of [['static', '?static'], ['nowebgl', '?nowebgl']]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => errors.push(`${mode}: ${e.message}`))
  await page.goto(BASE + '/' + query, { waitUntil: 'load' })
  await page.waitForTimeout(4000)
  for (const [i, frac] of [[0, 0], [1, 0.25], [2, 0.6]]) {
    await page.evaluate((f) => window.scrollTo(0, (document.body.scrollHeight - innerHeight) * f), frac)
    await page.waitForTimeout(700)
    await page.screenshot({ path: `screenshots/fallback-${mode}-${i}.png` })
  }
  console.log(mode, 'height', await page.evaluate(() => document.body.scrollHeight))
  await page.close()
}
console.log(errors.length ? errors.join('\n') : 'No page errors.')
await browser.close()
