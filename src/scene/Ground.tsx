import { useMemo } from 'react'
import * as THREE from 'three'

import { VERGE, srgb } from './colors'

// receiveShadow is load-bearing: without it, the directional light's raking
// shadow has no surface to land on, and the only shadow visible is the
// straight-down ContactShadows blob under the car.
//
// Sized and centred on the route's own extent, not on the car's parking
// spot at the origin — a plane centred on the origin looked fine for the
// step-2 static render, but the top-down debug view
// (src/scene/DebugCameraRig.tsx) exposed the real problem: past the old
// plane's edge the ground just stopped and the sky showed through the gap.
// The meander route (src/scene/curve.ts) spans roughly x:0-880, z:0-254 —
// this comfortably covers that plus margin, and still includes the origin
// where the car sits.
const GROUND_CENTER: [number, number] = [440, 127]
const GROUND_SIZE: [number, number] = [1400, 900]

export function Ground() {
  const color = useMemo(() => srgb(VERGE), [])

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[GROUND_CENTER[0], -0.005, GROUND_CENTER[1]]}
      receiveShadow
    >
      <planeGeometry args={GROUND_SIZE} />
      <meshStandardMaterial color={color} roughness={1} side={THREE.DoubleSide} />
    </mesh>
  )
}
