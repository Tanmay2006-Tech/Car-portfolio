import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { scroll } from './scrollState'

gsap.registerPlugin(ScrollTrigger)

// CLAUDE.md section 5: "Lenis and ScrollTrigger must be explicitly wired
// together... Skip this and pinning desyncs from smooth scroll in ways
// that look like random jitter. This is the single most common bug in
// this stack." Renders nothing — it only wires up global scroll listeners
// and writes into the mutable `scroll` object, so it's mounted once,
// outside the Canvas, alongside the page's actual scrollable content.
//
// `#page` is a placeholder spacer for now (see App.tsx) — PROMPTS.md step 7
// replaces it with the real leg sections, whose stacked height then becomes
// the real scroll length. The wiring itself doesn't change.
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
