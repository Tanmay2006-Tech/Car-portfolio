// Renders the hero at 1200x630 for the social-share card (public/og.jpg).
// Saves a PNG; the JPEG conversion happens in the calling shell.
// Usage: node tools/capture-og.mjs [url]
import { chromium } from 'playwright'
const URL = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'load' })
await page.waitForFunction(() => window.__appReady === true, { timeout: 60000 })
await page.waitForTimeout(3500)
await page.addStyleTag({ content: '.loader, .hero__hint { display: none !important } ::-webkit-scrollbar { display: none } html { scrollbar-width: none }' })
await page.waitForTimeout(300)
await page.screenshot({ path: 'screenshots/og-source.png' })
await browser.close()
console.log('saved screenshots/og-source.png')
