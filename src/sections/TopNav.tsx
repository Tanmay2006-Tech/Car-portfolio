import { useEffect, useRef } from 'react'

import { PERSON } from '../content'
import { scroll, routeToScrollPx } from '../scene/scrollState'
import { carPose } from '../scene/carPose'
import { dawn } from '../scene/DawnCycle'
import { LEG_START } from '../scene/legs'
import { ROUTE_LENGTH_M, projectMarkerDistance } from '../scene/routeMarks'
import { useSection } from '../scene/sectionStore'
import { scrollToPx } from '../scene/ScrollSetup'

// Fixed top bar: the name, the live drive instruments (which leg, trip
// distance, the dawn clock), and jumps to each part of the route so a
// reader can go straight to what they came for. In the driving layout a
// jump moves the page AND snaps the car there (carPose.snap) rather than
// making someone watch it drive 900m; in the static layout they're plain
// in-page anchors.

const LEG_NAMES: Record<number, string> = {
  [-2]: 'Parked overnight',
  [-1]: 'Cold start',
  0: 'Pulling away',
  1: 'Leg 1, the straight',
  2: 'Leg 2, cruise',
  3: 'Leg 3, the service log',
  4: 'Leg 4, the risk layer',
  5: 'Leg 5, arrival',
  6: 'Parked',
}

// Dawn clock: 05:38 at the hero, an hour later by the cabin.
function clock(t: number) {
  const minutes = 5 * 60 + 38 + Math.round(t * 62)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

const LINKS: { label: string; id: string; routeP: number; sections: number[] }[] = [
  { label: 'Work', id: 'projects', routeP: projectMarkerDistance(0) / ROUTE_LENGTH_M, sections: [1] },
  { label: 'Telemetry', id: 'telemetry', routeP: LEG_START[2] + 0.04, sections: [2] },
  { label: 'Experience', id: 'experience', routeP: LEG_START[3] + 0.03, sections: [3] },
  { label: 'Research', id: 'road-risk', routeP: LEG_START[4] + 0.05, sections: [4] },
  { label: 'Contact', id: 'contact', routeP: 1, sections: [6] },
]

export function TopNav({ layout }: { layout: 'drive' | 'static' }) {
  const section = useSection((s) => s.section)
  const instrumentsRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLElement>(null)
  const kmRef = useRef<HTMLSpanElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (layout !== 'drive') return
    let id = requestAnimationFrame(function tick() {
      // Past the end of the drive the page scrolls the footer up under
      // the bar, so the bar takes a solid ground there.
      barRef.current?.toggleAttribute('data-solid', scroll.progress >= 0.999)
      const el = instrumentsRef.current
      if (el) {
        // Instruments come on with the engine (cold start) and stay on.
        const on = scroll.phase === 'hero' ? 0 : scroll.phase === 'coldstart' ? Math.min(1, scroll.phaseProgress / 0.2) : 1
        el.style.opacity = on.toFixed(3)
      }
      if (kmRef.current) kmRef.current.textContent = `${((carPose.progress * ROUTE_LENGTH_M) / 1000).toFixed(2)} km`
      if (clockRef.current) clockRef.current.textContent = clock(dawn.t)
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [layout])

  function jump(event: React.MouseEvent<HTMLAnchorElement>, routeP: number) {
    if (layout !== 'drive') return
    event.preventDefault()
    scrollToPx(routeToScrollPx(routeP))
    carPose.snap = true
  }

  return (
    // The static layout scrolls content under the bar from the first pixel,
    // so it's always solid there.
    <header ref={barRef} className="topnav" data-solid={layout === 'static' ? '' : undefined}>
      {/* First stop for keyboard users: straight to the work, past the
          opening animation. */}
      <a className="skip" href="#projects" onClick={(e) => jump(e, LINKS[0].routeP)}>
        Skip to the work
      </a>
      <a className="topnav__name" href="#top" onClick={(e) => jump(e, 0)}>
        {PERSON.name}
      </a>
      {layout === 'drive' && (
        <div ref={instrumentsRef} className="topnav__instruments" aria-hidden="true" style={{ opacity: 0 }}>
          <span>{LEG_NAMES[section] ?? ''}</span>
          <span ref={kmRef} className="num">0.00 km</span>
          <span ref={clockRef} className="num">05:38</span>
        </div>
      )}
      <nav className="topnav__links" aria-label="Sections">
        {LINKS.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            aria-current={link.sections.includes(section) ? 'true' : undefined}
            onClick={(e) => jump(e, link.routeP)}
          >
            {link.label}
          </a>
        ))}
        <a className="topnav__resume" href={PERSON.resume} target="_blank" rel="noopener noreferrer">
          Resume
        </a>
      </nav>
    </header>
  )
}
