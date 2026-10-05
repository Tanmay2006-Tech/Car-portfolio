// CPU-profiles a stretch of driving and prints the functions with the most
// self time — for finding what actually costs frame time instead of
// guessing. Usage: node tools/profile-drive.mjs [url] [--mobile] [--cpu=4]
import { chromium } from 'playwright'
const args = process.argv.slice(2)
const URL = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4173'
const MOBILE = args.includes('--mobile')
const CPU = Number((args.find((a) => a.startsWith('--cpu=')) ?? '--cpu=1').slice(6))
const b = await chromium.launch({ headless: false })
const ctx = await b.newContext(MOBILE ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
const cdp = await ctx.newCDPSession(p)
await p.goto(URL, { waitUntil: 'load' })
await p.waitForFunction(() => window.__appReady === true, { timeout: 90000 })
await p.evaluate(() => window.scrollTo(0, 4500)); await p.waitForTimeout(2500)
if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
await cdp.send('Profiler.start')
for (let i = 0; i < 60; i++) { await p.mouse.wheel(0, 100); await p.waitForTimeout(50) }
const { profile } = await cdp.send('Profiler.stop')
const self = new Map()
const dt = profile.timeDeltas
const byId = new Map(profile.nodes.map((n) => [n.id, n]))
const counts = new Map()
for (const id of profile.samples) counts.set(id, (counts.get(id) ?? 0) + 1)
let total = 0
for (const [id, c] of counts) {
  const n = byId.get(id)
  const f = n.callFrame
  const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}:${f.columnNumber}`
  self.set(key, (self.get(key) ?? 0) + c)
  total += c
}
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
// With --source=<built js>, print a snippet of the minified code at each
// hot spot so it can be matched back to the source.
const SRC = (args.find((a) => a.startsWith('--source=')) ?? '').slice(9)
const lines = SRC ? (await import('node:fs')).readFileSync(SRC, 'utf8').split(/\r?\n/) : null
for (const [k, c] of top) {
  let snippet = ''
  const m = k.match(/:(\d+):(\d+)$/)
  if (lines && m && lines[+m[1]]) snippet = '   ' + lines[+m[1]].slice(+m[2], +m[2] + 140).replace(/\s+/g, ' ')
  console.log(((100 * c) / total).toFixed(1).padStart(5) + '%  ' + k + snippet)
}
await b.close()
