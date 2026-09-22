import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { scroll, HERO_PX, COLD_START_PX, ROUTE_PX, PAGE_HEIGHT_PX, windowProgress } from './scrollState'

gsap.registerPlugin(ScrollTrigger)

// CLAUDE.md section 5: "Lenis and ScrollTrigger must be explicitly wired
// together... Skip this and pinning desyncs from smooth scroll in ways
// that look like random jitter. This is the single most common bug in
// this stack." Renders nothing — it only wires up global scroll listeners
// and writes into the mutable `scroll` object, so it's mounted once,
// outside the Canvas, alongside the page's actual scrollable content.
//
// `#page` is sized to PAGE_HEIGHT_PX (see App.tsx) — HERO_PX + COLD_START_PX
// + ROUTE_PX, CLAUDE.md section 1's three opening phases stacked in order.
// PROMPTS.md step 7 replaces the ROUTE_PX segment with the real leg
// sections; the hero/cold-start segments and this wiring don't change.
export function ScrollSetup() {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: false })
    lenis.on('scroll', ScrollTrigger.update)

    const driveLenis = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(driveLenis)
    gsap.ticker.lagSmoothing(0)

    const trigger = ScrollTrigger.create({
      trigger: '#page',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        scroll.progress = self.progress
        scroll.velocity = self.getVelocity()

        // One absolute pixel position, sliced into the three sequential
        // phase budgets (scrollState.ts). Whichever window the position
        // falls inside becomes `phase`/`phaseProgress`; `routeP` is 0 for
        // the first two (the car stays parked at the route's start) and
        // only becomes real curve progress once scroll passes into the
        // ROUTE_PX window — this is what Car.tsx now feeds the curve.
        const scrollPxNow = self.progress * PAGE_HEIGHT_PX
        if (scrollPxNow < HERO_PX) {
          scroll.phase = 'hero'
          scroll.phaseProgress = windowProgress(scrollPxNow, 0, HERO_PX)
          scroll.routeP = 0
        } else if (scrollPxNow < HERO_PX + COLD_START_PX) {
          scroll.phase = 'coldstart'
          scroll.phaseProgress = windowProgress(scrollPxNow, HERO_PX, COLD_START_PX)
          scroll.routeP = 0
        } else {
          scroll.phase = 'route'
          scroll.phaseProgress = 1
          scroll.routeP = windowProgress(scrollPxNow, HERO_PX + COLD_START_PX, ROUTE_PX)
        }
      },
    })

    return () => {
      trigger.kill()
      gsap.ticker.remove(driveLenis)
      lenis.destroy()
    }
  }, [])

  return null
}
