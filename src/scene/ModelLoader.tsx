import { useRef } from 'react'
import { useProgress } from '@react-three/drei'

// CLAUDE.md section 1: "Keep a minimal model loader, separate from the
// hero." Plain DOM, outside <Canvas> — useProgress() is a standalone store.
// Not a splash screen: no logo, no overlay, nothing gating the hero text —
// a thin progress rule and a number in the stage's bottom-right corner that
// appear only while the car is still streaming in, then remove themselves.
export function ModelLoader() {
  const { progress, active } = useProgress()
  const doneRef = useRef(false)
  if (progress >= 100) doneRef.current = true

  // Once fully loaded, stay hidden forever — a later cache hit elsewhere
  // shouldn't flash it again.
  if (doneRef.current || (!active && progress === 0)) return null

  return (
    <div className="loader" role="status">
      <span>Warming up the car</span>
      <span className="loader__value">{Math.round(progress)}%</span>
      <span className="loader__bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress / 100})` }} />
      </span>
    </div>
  )
}
