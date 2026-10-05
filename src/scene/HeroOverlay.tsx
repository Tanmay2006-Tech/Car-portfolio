import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { HERO_PX, COLD_START_PX, routeToScrollPx } from './scrollState'
import { carPose } from './carPose'
import { scrollToPx } from './ScrollSetup'
import { ROUTE_LENGTH_M, projectMarkerDistance } from './routeMarks'
import { PERSON, PAPER } from '../content'

gsap.registerPlugin(ScrollTrigger)

// CLAUDE.md section 1 phase A: "All hero text is DOM and must NOT wait for
// the GLB — text renders first, the car fades in when loaded." No
// dependency on the model or its loading state at all.
//
// The name is the hero: set huge in Archivo's widest cut against the night
// sky, above the horizon line so every word sits on dark ground. One
// credential under it — the published paper, the strongest single fact on
// the site — and two actions.
//
// mode 'fixed' (driving layout): pinned over the canvas, easing out on its
// own ScrollTrigger across the hero budget and the first half of cold
// start. mode 'flow' (reduced motion / no WebGL): the top of a normal page.
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
          y: -32 * self.progress,
        })
      },
    })
    return () => trigger.kill()
  }, [mode])

  function seeWork(event: React.MouseEvent<HTMLAnchorElement>) {
    if (mode !== 'fixed') return
    event.preventDefault()
    scrollToPx(routeToScrollPx(projectMarkerDistance(0) / ROUTE_LENGTH_M))
    carPose.snap = true
  }

  return (
    <section id="top" ref={copyRef} className={`hero hero--${mode}`} aria-label="Introduction">
      <div className="hero__inner">
        <p className="hero__role">Machine learning and full-stack engineer, {PERSON.location}</p>
        <h1 className="hero__name">
          <span>Tanmay</span>
          <span>Tripathi</span>
        </h1>
        <p className="hero__summary">
          I build systems that read signals and predict failure before it happens, on city roads and in production
          logs.
        </p>
        <p className="hero__credential">
          <span>
            Published: <cite>{PAPER.title}</cite>, a preprint on Zenodo.
          </span>{' '}
          <a href={PAPER.url} target="_blank" rel="noopener noreferrer">
            Read the paper
          </a>
        </p>
        <div className="hero__actions">
          <a className="button button--solid" href="#projects" onClick={seeWork}>
            See the work
          </a>
          <a className="button button--outline" href={PERSON.resume} target="_blank" rel="noopener noreferrer">
            Resume
          </a>
          <span className="hero__social">
            <a href={PERSON.github} target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href={PERSON.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href={`mailto:${PERSON.email}`}>Email</a>
          </span>
        </div>
        {mode === 'fixed' && (
          <p className="hero__hint">
            <span className="hero__hint-line" aria-hidden="true" />
            Scroll to start the engine
          </p>
        )}
      </div>
    </section>
  )
}
