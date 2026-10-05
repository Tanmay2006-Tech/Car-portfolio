import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { HERO_PX, COLD_START_PX } from './scrollState'
import { PERSON } from '../content'

gsap.registerPlugin(ScrollTrigger)

// CLAUDE.md section 1 phase A: "All hero text is DOM and must NOT wait for
// the GLB — text renders first, the car fades in when loaded." This
// component has no dependency on the model or its loading state at all;
// it mounts and renders immediately regardless of what's happening inside
// <Canvas>.
//
// mode 'fixed' (the driving layout): pinned over the canvas, and eases out
// on its own ScrollTrigger over the hero budget and the first half of cold
// start — so it's fully gone before the camera finishes arriving at CHASE
// and the ignition sweep peaks. mode 'flow' (reduced motion / no WebGL):
// just the first block of an ordinary page.
export function HeroOverlay({ mode = 'fixed' }: { mode?: 'fixed' | 'flow' }) {
  const copyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mode !== 'fixed' || !copyRef.current) return
    const trigger = ScrollTrigger.create({
      trigger: '#page',
      start: 0,
      end: HERO_PX + COLD_START_PX * 0.5,
      scrub: true,
      onUpdate: (self) => {
        gsap.set(copyRef.current, {
          autoAlpha: 1 - self.progress,
          y: -24 * self.progress,
        })
      },
    })
    return () => trigger.kill()
  }, [mode])

  return (
    <header ref={copyRef} className={`hero hero--${mode}`}>
      <p className="hero__role">{PERSON.role}</p>
      <h1 className="hero__name">{PERSON.name}</h1>
      <p className="hero__summary">{PERSON.summary}</p>
      <p className="hero__summary hero__proof">
        Published a traffic-severity model trained on 8,173 incidents. Shipped four systems to production.
      </p>
      <nav className="links hero__links" aria-label="Profiles">
        <a href={PERSON.github} target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href={PERSON.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a href={`mailto:${PERSON.email}`}>Email</a>
        <a href={PERSON.resume} target="_blank" rel="noopener noreferrer">Resume</a>
      </nav>
      {mode === 'fixed' && <p className="hero__hint">Scroll to start the engine</p>}
    </header>
  )
}
