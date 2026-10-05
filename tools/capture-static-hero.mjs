// Renders the parked car at the hero angle with every DOM overlay hidden,
// for the no-WebGL fallback still (public/hero-static.jpg). Saves a PNG;
// the JPEG conversion happens in the calling shell.
// Usage: node tools/capture-static-hero.mjs [url]
import { chromium } from 'playwright'
const URL = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
await page.goto(URL, { waitUntil: 'load' })
await page.waitForFunction(() => window.__appReady === true, { timeout: 60000 })
await page.waitForTimeout(2500)
await page.addStyleTag({ content: 'body > #root > *:not(.stage) { visibility: hidden !important }' })
await page.waitForTimeout(300)
await page.screenshot({ path: 'screenshots/hero-static-source.png' })
await browser.close()
console.log('saved screenshots/hero-static-source.png')
