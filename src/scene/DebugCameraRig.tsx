import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { cameraState, type CameraMode } from './cameraState'

export type DebugCameraMode = CameraMode

interface CameraPreset {
  position: [number, number, number]
  lookAt: [number, number, number]
  up: [number, number, number]
  fov: number
}

// Route waypoints now span roughly x:0-880, z:0-254 (src/scene/curve.ts's
// meander — opening straight, three alternating bends, final straight) —
// top-down is framed to fit that whole extent with margin. Height=700 was
// sized by the actual horizontal-FOV math, not eyeballed: at fov=50
// (vertical) and this 1440x900 (1.6 aspect) viewport, horizontal ground
// coverage is ~1.49x the camera height, so clearing an ~950m-wide target
// (880m route + margin) needs height >= 950/1.49 =~ 637m.
const CAMERA_PRESETS: Record<Exclude<DebugCameraMode, 'chase'>, CameraPreset> = {
  // Unchanged from the step 2/3 static render, for a like-for-like
  // comparison against the new route/ground/sky.
  'three-quarter': { position: [4.2, 1.6, 4.8], lookAt: [0, 0, 0], up: [0, 1, 0], fov: 35 },
  // Straight down has no stable "up" via lookAt (the up vector and view
  // direction go parallel), so up is set to -Z explicitly to get a
  // consistent, non-arbitrary roll instead of whatever three.js falls back to.
  'top-down': { position: [440, 700, 127], lookAt: [440, 0, 127], up: [0, 0, -1], fov: 50 },
  // ~1.5m off the ground, 30m behind the road's start, looking along the
  // dead-straight leg-1 stretch — roughly a driver's eye view.
  'low-wide': { position: [-30, 1.5, 0], lookAt: [60, 1.2, 0], up: [0, 1, 0], fov: 60 },
}

// Debug camera modes, cycled with 1-4. '4' is the real chase camera
// (ChaseCamera.tsx, CLAUDE.md section 5) and is the default; 1/2/3 are the
// static views from PROMPTS.md step 3 that override it for judging the route
// shape. Scaffolding, meant to come out before ship.
export function DebugCameraRig() {
  const { camera, scene } = useThree()
  const [mode, setMode] = useState<DebugCameraMode>('chase')
  const realFog = useRef<THREE.Fog | THREE.FogExp2 | null>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '1') setMode('three-quarter')
      else if (event.key === '2') setMode('top-down')
      else if (event.key === '3') setMode('low-wide')
      else if (event.key === '4') setMode('chase')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    // Chase is driven every frame by ChaseCamera, which reads this.
    cameraState.mode = mode
    if (mode !== 'chase') {
      const preset = CAMERA_PRESETS[mode]
      camera.up.set(...preset.up)
      camera.position.set(...preset.position)
      camera.lookAt(...preset.lookAt)
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = preset.fov
        camera.updateProjectionMatrix()
      }
    }

    // Fog is tuned for a ground-level view (near/far in App.tsx assume
    // roughly eye-height): at top-down's height=320, literally everything
    // in frame is past the fog's far plane, so the debug view goes solid
    // fog colour. That's physically correct — real fog would do the same
    // to a drone shot — but this camera exists purely to judge the route
    // shape, not to render realistically, so it suspends fog rather than
    // showing a blank frame. Cache the real fog object the first time it's
    // seen (before ever nulling it out) so the other two modes, which are
    // meant to represent something closer to the real view, get it back.
    if (scene.fog && !realFog.current) realFog.current = scene.fog
    scene.fog = mode === 'top-down' ? null : realFog.current

    // Playwright reads this to confirm a mode actually applied before
    // screenshotting, rather than guessing a fixed settle delay.
    ;(window as unknown as { __debugCameraMode?: DebugCameraMode }).__debugCameraMode = mode
  }, [mode, camera, scene])

  return null
}
