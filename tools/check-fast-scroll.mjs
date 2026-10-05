// Flicks through leg 1 with large, fast wheel input and screenshots mid-
// motion, checking that the car stays inside the frame (the camera is
// carried by the car — ChaseCamera.tsx — so it must, at any scroll speed).
// Usage: node tools/check-fast-scroll.mjs [url]
import { chromium } from 'playwright'
const URL = process.argv[2] ?? 'http://localhost:4173'
const b = await chromium.launch({ headless: false })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto(URL, { waitUntil: 'load' })
await p.waitForFunction(() => window.__appReady === true, { timeout: 90000 })
await p.evaluate(() => window.scrollTo(0, 3500)); await p.waitForTimeout(2500)
for (let i = 0; i < 4; i++) {
  for (let k = 0; k < 6; k++) { await p.mouse.wheel(0, 600); await p.waitForTimeout(16) }
  await p.waitForTimeout(120)
  await p.screenshot({ path: `screenshots/fast-scroll-${i}.png` })
}
await b.close()
console.log('saved screenshots/fast-scroll-0..3.png')
