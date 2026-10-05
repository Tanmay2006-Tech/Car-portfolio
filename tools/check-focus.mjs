// Tabs through the page and reports where keyboard focus lands, checking
// CLAUDE.md section 5's pinned-track gotcha: a focused project card must be
// the one on screen, not one still off to the side.
// Usage: node tools/check-focus.mjs [url]
import { chromium } from 'playwright'
const URL = process.argv[2] ?? 'http://localhost:4173'
const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(URL, { waitUntil: 'load' })
await page.waitForFunction(() => window.__appReady === true, { timeout: 90000 })
let problems = 0
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab')
  await page.waitForTimeout(450)
  const info = await page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const r = el.getBoundingClientRect()
    const visible = r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight
    const style = getComputedStyle(el)
    return { text: (el.textContent || el.getAttribute('name') || el.tagName).trim().slice(0, 28), visible, x: Math.round(r.left), y: Math.round(r.top), outline: style.outlineStyle + ' ' + style.outlineColor, scrollY: Math.round(scrollY) }
  })
  if (!info) continue
  if (!info.visible) problems++
  console.log(`${String(i).padStart(2)} ${info.visible ? 'visible' : 'OFFSCREEN'} ${info.text.padEnd(28)} at ${info.x},${info.y} scrollY=${info.scrollY} outline=${info.outline}`)
}
console.log(problems ? `${problems} focus stops off screen` : 'Every focus stop was on screen.')
await browser.close()
