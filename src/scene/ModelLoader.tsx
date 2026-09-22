import { useRef } from 'react'
import { useProgress } from '@react-three/drei'

// CLAUDE.md section 1: "Keep a minimal model loader, separate from the
// hero." Plain DOM, outside <Canvas> — useProgress() is safe to call out
// here too (it's a standalone zustand store drei keeps, not tied to the
// R3F render tree). Deliberately not styled or worded like a splash
// screen: no logo, no spinner animation, just a small number that appears
// only while there's something to wait for and removes itself the instant
// there isn't. The hero text next to it never waits on this.
export function ModelLoader() {
  const { progress, active } = useProgress()
  const doneRef = useRef(false)
  if (progress >= 100) doneRef.current = true

  // Once fully loaded, stay hidden forever — GLTF caching means a remount
  // of the model elsewhere on the page (there isn't one yet, but future
  // legs shouldn't resurrect this) would otherwise flash it again.
  if (doneRef.current || (!active && progress === 0)) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 5,
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        color: 'var(--ink)',
        opacity: 0.65,
        pointerEvents: 'none',
      }}
    >
      loading model {Math.round(progress)}%
    </div>
  )
}
