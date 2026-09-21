import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { cameraState } from './cameraState'
import { sampleShot, type Shot } from './cameraShots'
import { carPose } from './carPose'
import { telemetry } from './telemetry'

const UP = new THREE.Vector3(0, 1, 0)

// CLAUDE.md section 5: "damped with a longer lambda than the car itself so it
// lags slightly through corners... a one-line change that does most of the
// cinematic work." The car's own heading damps at HEADING_LAMBDA = 5
// (Car.tsx), so the camera's orientation frame damps slower than that. In a
// corner the car turns first and the camera swings round after it.
const CAMERA_YAW_LAMBDA = 2
// Position damping is separate and deliberately light. Damped position lags in
// proportion to speed (speed / lambda metres behind), so a lambda below the
// car's would stretch the camera several metres further back at cruise than
// at rest. The cornering lag comes from the yaw above; this only softens
// scroll jitter and the blends between shots.
const CAMERA_POSITION_LAMBDA = 8

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
    const s = sampleShot(carPose.progress, shot.current)

    // Orientation frame lags the car's heading (see CAMERA_YAW_LAMBDA).
    if (camYaw.current === null) camYaw.current = carPose.heading
    camYaw.current +=
      shortestAngleDiff(carPose.heading, camYaw.current) * (1 - Math.exp(-CAMERA_YAW_LAMBDA * dt))

    // Where the camera wants to be: an orbit around the aim point, laid out in
    // the LAGGED frame, on top of the car's exact world position.
    const az = THREE.MathUtils.degToRad(s.azimuthDeg)
    const ideal = scratchIdeal.current
      .set(s.aimX - s.radius * Math.cos(az), s.height, s.aimZ + s.radius * Math.sin(az))
      .applyAxisAngle(UP, camYaw.current)
      .add(carPose.position)
    // What it looks at: a point on the car, in the car's TRUE frame, so the
    // lag reads as the camera swinging to catch up, not the car drifting.
    const aim = scratchAim.current
      .set(s.aimX, s.aimY, s.aimZ)
      .applyAxisAngle(UP, carPose.heading)
      .add(carPose.position)

    if (!seeded.current) {
      camPos.current.copy(ideal)
      aimPos.current.copy(aim)
      seeded.current = true
    } else {
      const k = 1 - Math.exp(-CAMERA_POSITION_LAMBDA * dt)
      camPos.current.lerp(ideal, k)
      aimPos.current.lerp(aim, k)
    }

    // Stage bias: shift the aim point left of the car, along the camera's own
    // right vector, so the car lands right of frame. Sized from the actual
    // horizontal field of view at the aim distance, so the same bias is the
    // same fraction of the screen at any radius, fov or aspect.
    const forward = scratchForward.current.subVectors(aimPos.current, camPos.current)
    const distance = forward.length()
    const right = scratchRight.current.crossVectors(forward, UP).normalize()
    const halfWidth = distance * Math.tan(THREE.MathUtils.degToRad(s.fov) / 2) * camera.aspect
    const shifted = forward.copy(aimPos.current).addScaledVector(right, -s.stageBias * halfWidth)

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
