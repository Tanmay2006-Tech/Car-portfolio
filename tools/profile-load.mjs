// CPU-profiles a cold page load from navigation until the car is on screen
// and prints where the time went (self time, top functions). Pair with
// measure-load.mjs: that says WHEN, this says WHAT.
// Usage: node tools/profile-load.mjs [url] [--source=dist/assets/index-*.js]
import { chromium } from 'playwright'
import fs from 'node:fs'
const args = process.argv.slice(2)
const URL = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4173'
const SRC = (args.find((a) => a.startsWith('--source=')) ?? '').slice(9)
const lines = SRC ? fs.readFileSync(SRC, 'utf8').split(/\r?\n/) : null
const b = await chromium.launch({ headless: false })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
const cdp = await ctx.newCDPSession(p)
await cdp.send('Network.enable')
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 500 })
await cdp.send('Profiler.start')
const t0 = Date.now()
await p.goto(URL, { waitUntil: 'load' })
await p.waitForFunction(() => window.__appReady === true, { timeout: 120000 })
await p.waitForTimeout(800)
const { profile } = await cdp.send('Profiler.stop')
console.log(`car on screen after ~${Date.now() - t0}ms (unthrottled network)`)
const byId = new Map(profile.nodes.map((n) => [n.id, n]))
const self = new Map()
let total = 0
for (const id of profile.samples) {
  const f = byId.get(id).callFrame
  const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}:${f.columnNumber}`
  self.set(key, (self.get(key) ?? 0) + 1)
  total++
}
for (const [k, c] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22)) {
  let snippet = ''
  const m = k.match(/:(\d+):(\d+)$/)
  if (lines && m && lines[+m[1]] && k.includes('index-')) snippet = '   ' + lines[+m[1]].slice(+m[2], +m[2] + 110).replace(/\s+/g, ' ')
  console.log(((100 * c) / total).toFixed(1).padStart(5) + '%  ' + k + snippet)
}
await b.close()
