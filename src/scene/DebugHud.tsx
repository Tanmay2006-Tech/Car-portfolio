import { useEffect, useRef } from 'react'

import { telemetry } from './telemetry'
import { scroll } from './scrollState'

// PROMPTS.md step 4: "Add a debug HUD: scroll progress, speed, steer angle,
// wheel rotation, fps." This lives outside <Canvas> as plain DOM, so it
// can't read `telemetry` via useFrame — it runs its own rAF loop instead,
// writing straight into refs' textContent. That keeps it off React's
// render path the same way Car.tsx's useFrame keeps the driving math off
// it: a debug readout that re-renders the whole tree 60 times a second
// would be a worse offender than the thing it's measuring.
export function DebugHud() {
  const progressRef = useRef<HTMLSpanElement>(null)
  const speedRef = useRef<HTMLSpanElement>(null)
  const steerRef = useRef<HTMLSpanElement>(null)
  const wheelRef = useRef<HTMLSpanElement>(null)
  const rollRef = useRef<HTMLSpanElement>(null)
  const pitchRef = useRef<HTMLSpanElement>(null)
  const brakeRef = useRef<HTMLSpanElement>(null)
  const camRef = useRef<HTMLSpanElement>(null)
  const fpsRef = useRef<HTMLSpanElement>(null)
  const phaseRef = useRef<HTMLSpanElement>(null)
  const rpmRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = requestAnimationFrame(function tick() {
      if (progressRef.current) progressRef.current.textContent = `${(telemetry.progress * 100).toFixed(1)}%`
      if (speedRef.current) speedRef.current.textContent = `${telemetry.speedKmh.toFixed(1)} km/h`
      if (steerRef.current) steerRef.current.textContent = `${telemetry.steerDeg.toFixed(1)}°`
      if (wheelRef.current) wheelRef.current.textContent = `${telemetry.wheelDeg.toFixed(0)}°`
      if (rollRef.current) rollRef.current.textContent = `${telemetry.rollDeg.toFixed(2)}°`
      if (pitchRef.current) pitchRef.current.textContent = `${telemetry.pitchDeg.toFixed(2)}°`
      if (brakeRef.current) brakeRef.current.textContent = telemetry.brakeGlow.toFixed(2)
      if (camRef.current) camRef.current.textContent = `${telemetry.camDist.toFixed(1)} m`
      if (fpsRef.current) fpsRef.current.textContent = telemetry.fps.toFixed(0)
      if (phaseRef.current) phaseRef.current.textContent = `${scroll.phase} ${(scroll.phaseProgress * 100).toFixed(0)}%`
      if (rpmRef.current) rpmRef.current.textContent = telemetry.rpm.toFixed(0)
      raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 10,
        padding: '10px 14px',
        background: 'rgba(247, 220, 194, 0.82)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        lineHeight: 1.6,
        borderRadius: 4,
        pointerEvents: 'none',
      }}
    >
      <div>phase <span ref={phaseRef}>hero 0%</span></div>
      <div>rpm <span ref={rpmRef}>0</span></div>
      <div>progress <span ref={progressRef}>0.0%</span></div>
      <div>speed <span ref={speedRef}>0.0 km/h</span></div>
      <div>steer <span ref={steerRef}>0.0°</span></div>
      <div>wheel <span ref={wheelRef}>0°</span></div>
      <div>roll <span ref={rollRef}>0.00°</span></div>
      <div>pitch <span ref={pitchRef}>0.00°</span></div>
      <div>brake <span ref={brakeRef}>0.00</span></div>
      <div>cam <span ref={camRef}>0.0 m</span></div>
      <div>fps <span ref={fpsRef}>0</span></div>
    </div>
  )
}
