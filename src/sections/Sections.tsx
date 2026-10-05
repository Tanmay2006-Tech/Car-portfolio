import { useEffect, useRef } from 'react'

import {
  ROAD_PROJECTS,
  TELEMETRY,
  SPEC_SHEET,
  EXPERIENCE,
  GRIDSENSE,
  RISKPATH,
  PAPER,
  ABOUT,
  EDUCATION,
} from '../content'
import type { Project } from '../content'
import { LEG_START } from '../scene/legs'
import { scroll, routeToScrollPx, ROUTE_PX, DOOR_OPEN_END } from '../scene/scrollState'
import { carPose } from '../scene/carPose'
import { scrollToPx } from '../scene/ScrollSetup'
import {
  ROUTE_LENGTH_M,
  MARKER_FIRST_M,
  MARKER_SPACING_M,
  projectMarkerDistance,
  servicePostDistance,
} from '../scene/routeMarks'
import { IS_MOBILE } from '../env'
import { ContactPanel } from './ContactPanel'

// Every leg's content is real DOM in normal document order (CLAUDE.md
// section 4: indexable, selectable, keyboard-navigable). In the driving
// layout each leg is an absolutely positioned block spanning exactly the
// scroll pixels its stretch of road occupies, with a sticky column inside —
// so the text arrives as the car enters the leg and leaves as it exits,
// with nothing to keep in sync beyond routeToScrollPx(). In the static
// layout (reduced motion, no WebGL) the same blocks simply stack.

type Layout = 'drive' | 'static'

function Leg({
  id,
  from,
  to,
  layout,
  className = '',
  label,
  children,
}: {
  id: string
  from: number
  to: number | null
  layout: Layout
  className?: string
  label: string
  children: React.ReactNode
}) {
  if (layout === 'static') {
    return (
      <section id={id} aria-label={label} className={`leg leg--static ${className}`}>
        <div className="leg__column">{children}</div>
      </section>
    )
  }
  const top = routeToScrollPx(from)
  const height = to === null ? `calc(${routeToScrollPx(1) - top}px + 100vh)` : `${(to - from) * ROUTE_PX}px`
  return (
    <section id={id} aria-label={label} className={`leg ${className}`} style={{ top, height }}>
      <div className="leg__sticky">
        <div className="leg__column">{children}</div>
      </div>
    </section>
  )
}

// Runs `tick` every animation frame while mounted — the DOM equivalent of
// useFrame. Writes go straight to element styles/attributes, never React
// state (CLAUDE.md section 5: zero re-renders while scrolling).
function useRaf(tick: () => void, enabled = true) {
  const ref = useRef(tick)
  ref.current = tick
  useEffect(() => {
    if (!enabled) return
    let id = requestAnimationFrame(function loop() {
      ref.current()
      id = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(id)
  }, [enabled])
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="card">
      <h3 className="card__name">{project.name}</h3>
      <p className="card__kind">{project.kind}</p>
      <p className="card__stack">{project.stack.join(', ')}</p>
      <ul className="card__points">
        {project.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="links">
        {project.live && (
          <a href={project.live} target="_blank" rel="noopener noreferrer">
            Open {project.name}
          </a>
        )}
        <a href={project.github} target="_blank" rel="noopener noreferrer">
          Read the source
        </a>
      </p>
    </article>
  )
}

// Card offset (in card widths) for a car distance. Holds each card still
// while the car is near its marker and slides only in between, so the text
// can be read — but it's symmetric, so at the halfway point between two
// markers the track is exactly halfway between two cards, and at a marker
// the card is exactly centred (CLAUDE.md section 1's "distance is shared").
function trackOffset(distanceM: number): number {
  // x = i exactly when the car is level with marker i.
  const x = Math.min(ROAD_PROJECTS.length, Math.max(-1, (distanceM - MARKER_FIRST_M) / MARKER_SPACING_M))
  const i = Math.floor(x)
  const f = x - i
  const t = Math.min(1, Math.max(0, (f - 0.25) / 0.5))
  return i + t * t * (3 - 2 * t)
}

function Projects({ layout }: { layout: Layout }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const pinned = layout === 'drive' && !IS_MOBILE

  useRaf(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return
    const offset = trackOffset(carPose.progress * ROUTE_LENGTH_M)
    track.style.transform = `translate3d(${-offset * viewport.clientWidth}px, 0, 0)`
  }, pinned)

  // CLAUDE.md section 5's fourth gotcha: Tab can land on a card that is
  // still off to the side. Drive the car to that card's marker instead, so
  // the focused card is the one on screen — and undo the browser's own
  // attempt to scroll the clipped viewport sideways.
  useEffect(() => {
    if (!pinned) return
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return
    const onFocus = (event: FocusEvent) => {
      const card = (event.target as HTMLElement).closest('.card')
      const index = card ? Array.from(track.children).indexOf(card) : -1
      if (index < 0) return
      viewport.scrollLeft = 0
      scrollToPx(routeToScrollPx(projectMarkerDistance(index) / ROUTE_LENGTH_M))
    }
    track.addEventListener('focusin', onFocus)
    return () => track.removeEventListener('focusin', onFocus)
  }, [pinned])

  return (
    <Leg id="projects" label="Projects" from={LEG_START[1]} to={LEG_START[2]} layout={layout} className="leg--projects">
      <h2>Projects</h2>
      <p className="lede">Five systems, passed in order on the straight.</p>
      <div ref={viewportRef} className={`track-viewport ${pinned ? 'track-viewport--pinned' : 'track-viewport--swipe'}`}>
        <div ref={trackRef} className="track">
          {ROAD_PROJECTS.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      </div>
    </Leg>
  )
}

function formatStat(value: number, decimals: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function Telemetry({ layout }: { layout: Layout }) {
  const valueRefs = useRef<(HTMLSpanElement | null)[]>([])
  const counting = layout === 'drive'

  // Counts up as the car enters the leg, reversibly — a pure function of
  // route progress. Archivo's tabular figures keep the width steady.
  useRaf(() => {
    const k = Math.min(1, Math.max(0, (scroll.routeP - LEG_START[2] + 0.004) / 0.03))
    const eased = 1 - Math.pow(1 - k, 3)
    TELEMETRY.forEach((stat, i) => {
      const el = valueRefs.current[i]
      if (el) el.textContent = formatStat(stat.value * eased, stat.decimals) + (stat.suffix ?? '')
    })
  }, counting)

  return (
    <Leg id="telemetry" label="Telemetry" from={LEG_START[2]} to={LEG_START[3]} layout={layout}>
      <h2>Telemetry</h2>
      <p className="lede">Measured, not rated.</p>
      <dl className="stats">
        {TELEMETRY.map((stat, i) => (
          <div key={stat.label} className="stat">
            <dt>{stat.label}</dt>
            <dd>
              <span ref={(el) => (valueRefs.current[i] = el)}>
                {formatStat(stat.value, stat.decimals) + (stat.suffix ?? '')}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <table className="spec">
        <caption>Technical data</caption>
        <tbody>
          {SPEC_SHEET.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Leg>
  )
}

function ServiceLog({ layout }: { layout: Layout }) {
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  // The entry whose numbered post the car has most recently passed.
  useRaf(() => {
    const d = carPose.progress * ROUTE_LENGTH_M
    let active = -1
    EXPERIENCE.forEach((_, i) => {
      if (d >= servicePostDistance(i) - 18) active = i
    })
    itemRefs.current.forEach((el, i) => el?.toggleAttribute('data-active', i === active))
  }, layout === 'drive')

  return (
    <Leg id="experience" label="Experience" from={LEG_START[3]} to={LEG_START[4]} layout={layout}>
      <h2>Service log</h2>
      <p className="lede">Four internships, in the order they happened.</p>
      <ol className="log">
        {EXPERIENCE.map((entry, i) => (
          <li key={entry.org} ref={(el) => (itemRefs.current[i] = el)}>
            <span className="log__num">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <p className="log__dates">{entry.dates}</p>
              <h3>
                {entry.role}, {entry.org}
              </h3>
              <p>{entry.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </Leg>
  )
}

function RoadRisk({ layout }: { layout: Layout }) {
  return (
    <Leg id="road-risk" label="Road risk" from={LEG_START[4]} to={LEG_START[5]} layout={layout} className="leg--risk">
      <h2>Road risk</h2>
      <p className="lede">Two systems on the same problem: one reads the network, one reads the route.</p>
      <article className="risk">
        <h3>{GRIDSENSE.name}</h3>
        <p className="card__kind">{GRIDSENSE.kind}</p>
        <ul className="card__points">
          {GRIDSENSE.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="links">
          <a href={GRIDSENSE.live} target="_blank" rel="noopener noreferrer">Open GridSense</a>
          <a href={GRIDSENSE.github} target="_blank" rel="noopener noreferrer">Read the source</a>
        </p>
      </article>
      <article className="risk">
        <h3>{RISKPATH.name}</h3>
        <p className="card__kind">{RISKPATH.kind}</p>
        <ul className="card__points">
          {RISKPATH.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="links">
          <a href={RISKPATH.live} target="_blank" rel="noopener noreferrer">Open RiskPath</a>
          <a href={RISKPATH.github} target="_blank" rel="noopener noreferrer">Read the source</a>
        </p>
      </article>
      <div className="paper">
        <p className="paper__title">{PAPER.title}</p>
        <p>{PAPER.authors}. {PAPER.venue}.</p>
        <p className="paper__doi">
          DOI <a href={PAPER.url} target="_blank" rel="noopener noreferrer">{PAPER.doi}</a>
        </p>
        <p className="links">
          <a href={PAPER.url} target="_blank" rel="noopener noreferrer">Read the paper</a>
        </p>
      </div>
    </Leg>
  )
}

function About({ layout }: { layout: Layout }) {
  return (
    <Leg id="about" label="About" from={LEG_START[5]} to={layout === 'drive' ? DOOR_OPEN_END : null} layout={layout}>
      <h2>About</h2>
      {ABOUT.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <dl className="edu">
        {EDUCATION.map((e) => (
          <div key={e.what}>
            <dt>{e.dates}</dt>
            <dd>
              {e.what}, {e.where}
            </dd>
          </div>
        ))}
      </dl>
    </Leg>
  )
}

export function Sections({ layout }: { layout: Layout }) {
  return (
    <>
      <Projects layout={layout} />
      <Telemetry layout={layout} />
      <ServiceLog layout={layout} />
      <RoadRisk layout={layout} />
      <About layout={layout} />
      {layout === 'drive' ? (
        <section
          id="contact"
          aria-label="Contact"
          className="leg leg--contact"
          style={{ top: routeToScrollPx(DOOR_OPEN_END), height: `calc(${routeToScrollPx(1) - routeToScrollPx(DOOR_OPEN_END)}px + 100vh)` }}
        >
          <div className="leg__sticky">
            <ContactPanel />
          </div>
        </section>
      ) : (
        <section id="contact" aria-label="Contact" className="leg leg--static leg--contact-static">
          <div className="leg__column">
            <ContactPanel />
          </div>
        </section>
      )}
    </>
  )
}
