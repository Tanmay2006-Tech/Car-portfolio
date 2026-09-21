import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { ROUTE_CURVE } from './curve'
import { srgb } from './colors'

const DASH_LENGTH = 1.4
// Widened from an initial 0.18 (real lane-paint scale) to 0.35 — at 0.18,
// verified against an actual render, they were legible from directly
// above but read as essentially invisible from anywhere near driving eye
// height, since perspective compresses a sub-20cm width to a handful of
// pixels at any real distance. This is the only speed cue in the scene, so
// erring toward too-bold beats too-subtle.
const DASH_WIDTH = 0.35
const DASH_GAP = 3.2
// Road paint, not a brand token — CLAUDE.md section 2 doesn't assign lane
// markings a colour, and they need to read as pale road paint against the
// asphalt, not as a sixth accent colour competing with --guards. Brightened
// from an initial #f2ece2 — too close in luminance to the asphalt
// (#cdc7ce) to read as a contrasting stripe rather than a slightly
// different patch of the same grey.
const DASH_COLOR = '#fffdf8'
const FORWARD = new THREE.Vector3(0, 0, 1)

// Instanced along the curve per CLAUDE.md section 5 ("Speed cues" — these
// are the free speed cue once the car drives; for now they just mark the
// route so its shape and scale are legible).
export function LaneMarkings() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const color = useMemo(() => srgb(DASH_COLOR), [])
  const totalLength = useMemo(() => ROUTE_CURVE.getLength(), [])
  const count = useMemo(
    () => Math.floor(totalLength / (DASH_LENGTH + DASH_GAP)),
    [totalLength],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    for (let i = 0; i < count; i++) {
      const u = THREE.MathUtils.clamp(
        (i * (DASH_LENGTH + DASH_GAP) + DASH_LENGTH / 2) / totalLength,
        0.0001,
        0.9999,
      )
      const point = ROUTE_CURVE.getPointAt(u)
      const tangent = ROUTE_CURVE.getTangentAt(u).normalize()
      quaternion.setFromUnitVectors(FORWARD, tangent)
      matrix.compose(new THREE.Vector3(point.x, 0.02, point.z), quaternion, new THREE.Vector3(1, 1, 1))
      mesh.setMatrixAt(i, matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [count])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} receiveShadow>
      <boxGeometry args={[DASH_WIDTH, 0.03, DASH_LENGTH]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </instancedMesh>
  )
}
