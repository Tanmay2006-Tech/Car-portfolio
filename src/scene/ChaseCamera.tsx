import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { cameraState } from './cameraState'
import { sampleShot, lerpShot, HERO, CHASE } from './cameraShots'
import type { Shot } from './cameraShots'
import { carPose } from './carPose'
import { telemetry } from './telemetry'
import { scroll } from './scrollState'
import { IS_MOBILE } from '../env'

const UP = new THREE.Vector3(0, 1, 0)

// CLAUDE.md section 5: "damped with a longer lambda than the car itself so it
// lags slightly through corners... a one-line change that does most of the
// cinematic work." The car's own heading damps at HEADING_LAMBDA = 5
// (Car.tsx), so the camera's orientation frame damps slower than that. In a
// corner the car turns first and the camera swings round after it.
const CAMERA_YAW_LAMBDA = 2
// Offset damping. The camera is carried rigidly by the car and only its
// OFFSET from the car (and the aim's offset) is damped — damping the world
// position instead lags in proportion to speed, and a fast scroll through
// leg 1's side-on shot used to leave the car running out of frame. This
// only softens the blends between shots; the cornering lag is the yaw above.
const CAMERA_OFFSET_LAMBDA = 6
const MOBILE_RADIUS_SCALE = 1.25

function shortestAngleDiff(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b))
}

// Renders nothing. Must mount AFTER <Car /> in the tree: R3F runs same-priority
// useFrame callbacks in subscription order, and the camera reads the pose Car
// wrote this frame. (Priority > 0 is off the table — EffectComposer already
// owns priority 1 for the render.)
export function ChaseCamera() {
  const shot = useRef<Shot>({
    azimuthDeg: 0, radius: 0, height: 0, aimX: 0, aimY: 0, aimZ: 0, fov: 35, stageBias: 0,
  })
  const camYaw = useRef<number | null>(null)
  const camOffset = useRef(new THREE.Vector3())
  const aimOffset = useRef(new THREE.Vector3())
  const camPos = useRef(new THREE.Vector3())
  const aimPos = useRef(new THREE.Vector3())
  const scratchIdeal = useRef(new THREE.Vector3())
  const scratchAim = useRef(new THREE.Vector3())
  const scratchRight = useRef(new THREE.Vector3())
  const scratchForward = useRef(new THREE.Vector3())
  const seeded = useRef(false)

  useFrame((state, rawDelta) => {
    if (cameraState.mode !== 'chase') {
      // Another debug mode owns the camera; re-seed on the way back so the
      // chase view snaps to the car instead of sweeping in from wherever the
      // debug camera was.
      seeded.current = false
      camYaw.current = null
      return
    }
    const camera = state.camera as THREE.PerspectiveCamera
    const dt = Math.min(rawDelta, 1 / 15)

    // CLAUDE.md section 1's opening: the hero and cold-start phases aren't
    // on the route at all (carPose.progress sits at 0 throughout both, since
    // Car.tsx only advances the curve once scroll.phase is 'route') — they
    // get their own shot, blending HERO -> CHASE across the cold-start
    // budget so the hand-off into the route's own opening keyframe (CHASE,
    // at route progress 0) is seamless. Eased the same way sampleShot eases
    // between route keyframes, so this reads as one continuous camera move
    // rather than three differently-paced ones stitched together.
    let s: Shot
    if (scroll.phase === 'route') {
      // The car's eased route progress (before leg 5's braking remap), not
      // carPose.progress: in leg 5 the car stops while the camera keeps
      // moving through the door and cabin beats on the linear budget.
      s = sampleShot(carPose.routeP, shot.current)
    } else {
      // 'hero': t=0, pure HERO, held for the whole HERO_PX budget.
      // 'coldstart': eases 0->1 across COLD_START_PX, arriving at exactly
      // CHASE — the route's own progress-0 keyframe — by the time it ends.
      const t = scroll.phase === 'coldstart' ? THREE.MathUtils.smootherstep(scroll.phaseProgress, 0, 1) : 0
      s = lerpShot(HERO, CHASE, t, shot.current)
    }

    // Orientation frame lags the car's heading (see CAMERA_YAW_LAMBDA).
    if (camYaw.current === null) camYaw.current = carPose.heading
    camYaw.current +=
      shortestAngleDiff(carPose.heading, camYaw.current) * (1 - Math.exp(-CAMERA_YAW_LAMBDA * dt))

    // Where the camera wants to be: an orbit around the aim point, laid out in
    // the LAGGED frame, on top of the car's exact world position.
    const az = THREE.MathUtils.degToRad(s.azimuthDeg)
    // Mobile's 45vh strip is close to square, so every exterior shot sits
    // a little further back to keep the whole car in frame.
    const radius = IS_MOBILE ? s.radius * MOBILE_RADIUS_SCALE : s.radius
    const ideal = scratchIdeal.current
      .set(s.aimX - radius * Math.cos(az), s.height, s.aimZ + radius * Math.sin(az))
      .applyAxisAngle(UP, camYaw.current)
    // What it looks at: a point on the car, in the car's TRUE frame, so the
    // lag reads as the camera swinging to catch up, not the car drifting.
    const aim = scratchAim.current
      .set(s.aimX, s.aimY, s.aimZ)
      .applyAxisAngle(UP, carPose.heading)

    // ideal/aim are offsets from the car here; damp those, then carry them
    // on the car's exact position so the car can never leave the frame.
    if (!seeded.current) {
      camOffset.current.copy(ideal)
      aimOffset.current.copy(aim)
      seeded.current = true
    } else {
      const k = 1 - Math.exp(-CAMERA_OFFSET_LAMBDA * dt)
      camOffset.current.lerp(ideal, k)
      aimOffset.current.lerp(aim, k)
    }
    camPos.current.copy(carPose.position).add(camOffset.current)
    aimPos.current.copy(carPose.position).add(aimOffset.current)

    // Stage bias: shift the aim point left of the car, along the camera's own
    // right vector, so the car lands right of frame. Sized from the actual
    // horizontal field of view at the aim distance, so the same bias is the
    // same fraction of the screen at any radius, fov or aspect.
    const forward = scratchForward.current.subVectors(aimPos.current, camPos.current)
    const distance = forward.length()
    const right = scratchRight.current.crossVectors(forward, UP).normalize()
    const halfWidth = distance * Math.tan(THREE.MathUtils.degToRad(s.fov) / 2) * camera.aspect
    // Mobile has no side column — the content sits below the car — so the
    // car is centred in its 45vh strip instead of pushed right.
    const bias = IS_MOBILE ? 0 : s.stageBias
    const shifted = forward.copy(aimPos.current).addScaledVector(right, -bias * halfWidth)

    camera.up.copy(UP)
    camera.position.copy(camPos.current)
    camera.lookAt(shifted)
    if (camera.fov !== s.fov) {
      camera.fov = s.fov
      camera.updateProjectionMatrix()
    }

    telemetry.camDist = distance
  })

  return null
}
