import { useEffect, useMemo, useRef } from 'react'

import { scroll, DOOR_OPEN_START } from '../scene/scrollState'
import { carPose } from '../scene/carPose'
import { dawn } from '../scene/DawnCycle'
import { ROUTE_CURVE } from '../scene/curve'
import { LEG_START } from '../scene/legs'
import { ROUTE_LENGTH_M } from '../scene/routeMarks'
import { useSection } from '../scene/sectionStore'

// The 36% column from CLAUDE.md section 2's layout, made physical: a
// frosted pane behind the leg text, tinted with the current horizon colour
// so it changes with the sunrise. It carries the drive's instruments:
//
//   pane    which leg this is, the trip distance, and the dawn clock
//   map     a top-down map of the real route with the car on it, set in
//           the stage's bottom-right corner beside the speed gauge
//
// Arrives as the hero text leaves and leaves as the camera swings to the
// door in leg 5, where "the column drops away". Desktop only — mobile
// already has a solid panel under the car. Decorative (aria-hidden): every
// fact in it is also in the page's real content.

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

const MAP_W = 300
const MAP_H = 92
const MAP_PAD = 8

export function ColumnPane() {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<SVGSVGElement>(null)
  const kmRef = useRef<HTMLSpanElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const section = useSection((s) => s.section)

  // The route drawn to scale, top-down, fitted into the map box.
  const map = useMemo(() => {
    const pts = ROUTE_CURVE.getSpacedPoints(160)
    const xs = pts.map((p) => p.x)
    const zs = pts.map((p) => p.z)
    const minX = Math.min(...xs)
    const minZ = Math.min(...zs)
    const scale = Math.min((MAP_W - 2 * MAP_PAD) / (Math.max(...xs) - minX), (MAP_H - 2 * MAP_PAD) / (Math.max(...zs) - minZ))
    const project = (x: number, z: number): [number, number] => [MAP_PAD + (x - minX) * scale, MAP_H - MAP_PAD - (z - minZ) * scale]
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${project(p.x, p.z).map((v) => v.toFixed(1)).join(' ')}`).join('')
    const ticks = LEG_START.slice(1).map((u) => {
      const p = ROUTE_CURVE.getPointAt(u)
      return project(p.x, p.z)
    })
    return { path, ticks, project }
  }, [])

  useEffect(() => {
    let id = requestAnimationFrame(function tick() {
      const el = ref.current
      if (el) {
        let opacity = 0
        if (scroll.phase === 'coldstart') opacity = Math.min(1, Math.max(0, (scroll.phaseProgress - 0.55) / 0.35))
        else if (scroll.phase === 'route') opacity = Math.min(1, Math.max(0, (DOOR_OPEN_START + 0.006 - carPose.routeP) / 0.008))
        el.style.opacity = opacity.toFixed(3)
        el.style.visibility = opacity > 0.001 ? 'visible' : 'hidden'
        // The map sits with the gauge, outside the pane (a backdrop-filter
        // parent would trap a fixed child), on the same fade.
        if (mapRef.current) mapRef.current.style.opacity = el.style.opacity
      }
      if (kmRef.current) kmRef.current.textContent = `${((carPose.progress * ROUTE_LENGTH_M) / 1000).toFixed(2)} km`
      if (clockRef.current) clockRef.current.textContent = clock(dawn.t)
      const [x, y] = map.project(carPose.position.x, carPose.position.z)
      dotRef.current?.setAttribute('cx', x.toFixed(1))
      dotRef.current?.setAttribute('cy', y.toFixed(1))
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [map])

  return (
    <>
      <div ref={ref} className="column-pane" aria-hidden="true" style={{ opacity: 0, visibility: 'hidden' }}>
        <div className="instruments">
          <span className="instruments__leg">{LEG_NAMES[section] ?? ''}</span>
          <span className="instruments__read">
            <span ref={kmRef}>0.00 km</span>
            <span ref={clockRef}>05:38</span>
          </span>
        </div>
      </div>
      <svg ref={mapRef} className="route-map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden="true" style={{ opacity: 0 }}>
        <path d={map.path} className="route-map__road" />
        {map.ticks.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.2} className="route-map__tick" />
        ))}
        <circle ref={dotRef} r={4.2} className="route-map__car" />
      </svg>
    </>
  )
}
