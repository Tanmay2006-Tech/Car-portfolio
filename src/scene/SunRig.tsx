import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { carPose } from './carPose'
import { dawn } from './DawnCycle'

// Low sun (CLAUDE.md section 2's "dawn, not candy" — low sun, long raking
// shadows). Elevation is measured from the horizon; distance only affects
// where the shadow camera sits, not the light direction, since this is a
// directional light.
// Elevation is no longer fixed: DawnCycle raises the sun from ~6 deg at the
// hero to ~24 deg by the cabin, and the shadows shorten with it.
export const SUN_AZIMUTH_DEG = 110
const SUN_DISTANCE = 8

const azimuthRad = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG)
// Offset from the car, not a world position — the whole point of this rig
// is that this offset stays constant while both the light and its target
// translate together with carPose.position, so the sun's direction and the
// shadow-camera frustum travel with the car instead of being pinned to the
// origin (PROMPTS.md: "the shadow camera was framed to the car's footprint
// back when the car was static — now it travels 952m").
const SUN_OFFSET = new THREE.Vector3()

// Renders the key light plus its shadow target, and re-centres both on the
// car every frame. Must mount AFTER <Car/> (same rule as ChaseCamera) so it
// reads the pose Car wrote this frame, not last frame's.
export function SunRig() {
  const lightRef = useRef<THREE.DirectionalLight | null>(null)
  // A callback ref, not useRef+useEffect: <Canvas> mounts its children
  // through a separate R3F-managed reconciler pass, so an effect in the
  // OUTER component would run before that inner tree commits. A callback
  // ref runs exactly when R3F creates the instance, regardless of which
  // reconciler owns it.
  function setupSunShadow(light: THREE.DirectionalLight | null) {
    lightRef.current = light
    if (!light) return
    light.shadow.autoUpdate = true
    ;(window as unknown as { __sunLight?: THREE.DirectionalLight }).__sunLight = light
  }
  // Deliberately NOT added to the scene graph (no <primitive>): a
  // standalone Object3D with no parent has matrixWorld === its own local
  // matrix, so updateMatrixWorld() below is all it needs to stay current.
  // WebGLRenderer's shadow pass reads light.target.matrixWorld directly
  // when it recomputes the shadow camera each frame (autoUpdate=true) —
  // it never requires the target to be part of the rendered tree, only
  // that its matrixWorld is fresh by the time that read happens.
  const target = useRef(new THREE.Object3D()).current

  useFrame(() => {
    const light = lightRef.current
    if (!light) return
    const elevationRad = THREE.MathUtils.degToRad(dawn.sunElevationDeg)
    SUN_OFFSET.set(
      Math.cos(azimuthRad) * Math.cos(elevationRad) * SUN_DISTANCE,
      Math.sin(elevationRad) * SUN_DISTANCE,
      Math.sin(azimuthRad) * Math.cos(elevationRad) * SUN_DISTANCE,
    )
    target.position.copy(carPose.position)
    target.updateMatrixWorld()
    light.position.copy(carPose.position).add(SUN_OFFSET)
    light.color.copy(dawn.sunColor)
    light.intensity = dawn.sunIntensity
  })

  return (
    <>
      {/* Key light: low, warm, and doing the actual modelling of the car's
          surfaces. The HDRI (Environment, in App.tsx) is turned down to
          fill/reflections only — left at its default intensity it washes
          out the sun and the shadow reads flat instead of raking.

          Shadow camera: at 15deg elevation a 1.3104m-tall car throws a
          ~4.89m shadow (height / tan(elevation)). Checked this against
          three.js's actual shadow-camera projection matrix before touching
          it: a point and its own shadow, being on the same light ray, land
          at the *same* (x, y) in the orthographic frustum and differ only
          in depth — so the original car-sized left/right/top/bottom already
          contained the full shadow length; near/far was the only axis that
          mattered, and 1..14 already covered it. Widened anyway to
          left/right +/-5, top 3, bottom -1, near 0.5, far 18 — cheap
          insurance for the car's own width/mirrors/spoiler off-centre from
          the light ray, and room for the road/lane markings near the car to
          pick up shadow too. Still nowhere near a scene-wide frustum — that
          frustum only has to cover the car, because the useFrame above
          re-centres it on the car every frame instead of leaving it framed
          around a car that no longer sits at the origin. */}
      <directionalLight
        ref={setupSunShadow}
        color={dawn.sunColor}
        intensity={dawn.sunIntensity}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={3}
        shadow-camera-bottom={-1}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-bias={-0.0005}
        target={target}
      />
    </>
  )
}
