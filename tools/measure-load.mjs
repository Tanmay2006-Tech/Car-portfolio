// First-visit load timeline on a throttled connection: when the page
// paints, when the car's GLB finishes downloading, and when the car is
// actually on screen (window.__appReady). Cache disabled, so it's always a
// cold first visit.
// Usage: node tools/measure-load.mjs [url] [--mbps=20] [--mobile]
import { chromium } from 'playwright'
const args = process.argv.slice(2)
const URL = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4173'
const MBPS = Number((args.find((a) => a.startsWith('--mbps=')) ?? '--mbps=20').slice(7))
const MOBILE = args.includes('--mobile')
const b = await chromium.launch({ headless: false })
const ctx = await b.newContext(MOBILE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
const cdp = await ctx.newCDPSession(p)
await cdp.send('Network.enable')
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (MBPS * 1e6) / 8, uploadThroughput: (5 * 1e6) / 8 })
await p.addInitScript(() => {
  window.__marks = {}
  const iv = setInterval(() => {
    if (window.__appReady && !window.__marks.ready) { window.__marks.ready = performance.now(); clearInterval(iv) }
  }, 20)
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__marks.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
})
const t0 = Date.now()
await p.goto(URL, { waitUntil: 'load' })
await p.waitForFunction(() => window.__marks && window.__marks.ready, { timeout: 180000 })
const r = await p.evaluate(() => {
  const res = performance.getEntriesByType('resource').filter((e) => /\.(glb|js|woff2|hdr|jpg)/.test(e.name))
  return {
    lcp: window.__marks.lcp,
    ready: window.__marks.ready,
    resources: res.map((e) => [e.name.split('/').pop(), Math.round(e.startTime), Math.round(e.responseEnd), Math.round(e.transferSize / 1024)]),
  }
})
console.log(`${MOBILE ? 'mobile' : 'desktop'}, ${MBPS} Mbps, cold cache`)
console.log(`text painted (LCP): ${Math.round(r.lcp)}ms   car on screen: ${Math.round(r.ready)}ms`)
for (const [n, s, e, kb] of r.resources) console.log(`  ${n.padEnd(48)} ${String(s).padStart(6)} -> ${String(e).padStart(6)} ms  ${kb} KB`)
await b.close()
