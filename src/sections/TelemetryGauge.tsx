import { useEffect, useRef } from 'react'

import { telemetry } from '../scene/telemetry'
import { scroll, DOOR_OPEN_START } from '../scene/scrollState'

// The live instrument: rev needle and road speed. This is what "the needle
// sweep" in CLAUDE.md section 1's cold start actually is — the telemetry
// HUD waking up (revs to a peak, settles to idle) — and it stays on for the
// drive, then switches off as the car parks in leg 5. Plain DOM polled from
// its own rAF, writing attributes directly; never React state.

const MAX_RPM = 8000
const SWEEP_DEG = 240 // dial arc, from -120 to +120 around straight up
const R = 44

function polar(deg: number, r: number) {
  const a = ((deg - 90) * Math.PI) / 180
  return [50 + r * Math.cos(a), 54 + r * Math.sin(a)]
}

function arcPath(fromDeg: number, toDeg: number, r: number) {
  const [x0, y0] = polar(fromDeg, r)
  const [x1, y1] = polar(toDeg, r)
  const large = toDeg - fromDeg > 180 ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}

// Cached: building a formatter per frame showed up in profiles.
const RPM_FORMAT = new Intl.NumberFormat('en-US')

const TICKS = Array.from({ length: 9 }, (_, i) => -SWEEP_DEG / 2 + (i * SWEEP_DEG) / 8)

export function TelemetryGauge() {
  const rootRef = useRef<HTMLDivElement>(null)
  const needleRef = useRef<SVGLineElement>(null)
  const speedRef = useRef<HTMLSpanElement>(null)
  const rpmRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let id = requestAnimationFrame(function tick() {
      const root = rootRef.current
      if (root) {
        // On through cold start (just before the sweep begins) and the
        // drive; off in the hero and once the car is parked for the cabin.
        let opacity = 0
        if (scroll.phase === 'coldstart') opacity = Math.min(1, Math.max(0, (scroll.phaseProgress - 0.02) / 0.08))
        else if (scroll.phase === 'route') opacity = Math.min(1, Math.max(0, (DOOR_OPEN_START - scroll.routeP) / 0.01))
        if (scroll.progress >= 0.999) opacity = 0
        root.style.opacity = opacity.toFixed(3)
        root.style.visibility = opacity > 0.001 ? 'visible' : 'hidden'
      }
      const deg = -SWEEP_DEG / 2 + (Math.min(telemetry.rpm, MAX_RPM) / MAX_RPM) * SWEEP_DEG
      needleRef.current?.setAttribute('transform', `rotate(${deg.toFixed(2)} 50 54)`)
      // Text only changes when the shown value does — no per-frame DOM
      // writes while cruising.
      const speedText = String(Math.round(scroll.phase === 'route' ? telemetry.speedSmoothKmh : 0))
      if (speedRef.current && speedRef.current.textContent !== speedText) speedRef.current.textContent = speedText
      const rpmText = RPM_FORMAT.format(Math.round(telemetry.rpm / 10) * 10)
      if (rpmRef.current && rpmRef.current.textContent !== rpmText) rpmRef.current.textContent = rpmText
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div ref={rootRef} className="gauge" aria-hidden="true" style={{ opacity: 0, visibility: 'hidden' }}>
      <svg viewBox="0 0 100 92" width="132" height="122">
        <path d={arcPath(-SWEEP_DEG / 2, SWEEP_DEG / 2, R)} className="gauge__arc" />
        <path d={arcPath(SWEEP_DEG / 2 - SWEEP_DEG / 8, SWEEP_DEG / 2, R)} className="gauge__redline" />
        {TICKS.map((deg) => {
          const [x0, y0] = polar(deg, R - 6)
          const [x1, y1] = polar(deg, R - 1)
          return <line key={deg} x1={x0} y1={y0} x2={x1} y2={y1} className="gauge__tick" />
        })}
        <line ref={needleRef} x1="50" y1="54" x2="50" y2={54 - R + 8} className="gauge__needle" />
        <circle cx="50" cy="54" r="2.6" className="gauge__hub" />
      </svg>
      <div className="gauge__readout">
        <span ref={speedRef} className="gauge__speed">0</span>
        <span className="gauge__unit">km/h</span>
      </div>
      <div className="gauge__rpm">
        <span ref={rpmRef}>0</span> rpm
      </div>
    </div>
  )
}
