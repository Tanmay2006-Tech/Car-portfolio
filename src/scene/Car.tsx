import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

import { Model as PorscheModel } from '../components/Porsche'
import { GUARDS } from './colors'
import { carPose } from './carPose'
import { ROUTE_CURVE } from './curve'
import { scroll } from './scrollState'
import { telemetry } from './telemetry'

const MODEL_PATH = '/models/porsche-desktop.glb'

const UP = new THREE.Vector3(0, 1, 0)

// Starting points, per PROMPTS.md's own note: "Prompt 4 is a tuning
// problem, not a code problem... push them around until it feels heavy and
// planted rather than floaty." These are what made it feel that way first.
const STEER_LOOKAHEAD = 0.002 // parametric probe for curvature — CLAUDE.md section 5's own value
const STEER_GAIN = 4
const STEER_LAMBDA = 6 // CLAUDE.md section 5's own value, in the steer damp() call
const HEADING_LOOKAHEAD_METERS = 8 // looks further ahead than the steer probe, so the chassis's
// facing direction is smoothed independently of the (deliberately twitchy)
// per-wheel steer signal
const HEADING_LAMBDA = 5
const DYNAMICS_LAMBDA = 6
const ROLL_MAX_RAD = THREE.MathUtils.degToRad(3) // CLAUDE.md section 5: "Maximum about 3°"
const PITCH_MAX_RAD = THREE.MathUtils.degToRad(1.5) // CLAUDE.md section 5: "Maximum about 1.5°"
const ROLL_GAIN = 0.14
const PITCH_GAIN = 0.05
// Per-frame speed (dist/dt) is noisy — scroll input itself isn't perfectly
// smooth frame to frame even mid-cruise — and differencing two noisy
// samples to get accel amplifies that noise further. Smoothing speed
// *before* differencing (rather than smoothing accel after) is what keeps
// pitch and the brake light from flickering during ordinary constant-speed
// scrolling, since a real deceleration event is large and sustained across
// many frames while frame-to-frame jitter isn't.
const SPEED_SMOOTH_LAMBDA = 10
// red_light_back_red_light_main_0's material already bakes a lit-red look
// into its emissive map (CLAUDE.md section 3) at the glTF's default
// emissiveIntensity=1 — that's why it read as "on" at rest before this
// existed. Off at rest/cruise, brightening under braking (deceleration),
// driven by the same `accel` the pitch uses, smoothed further for the brake
// only (see BRAKE_ACCEL_LAMBDA below).
const BRAKE_GLOW_LAMBDA = 10 // reacts faster than the dynamics — a brake
// flash should feel immediate, not lag like body roll
const BRAKE_GLOW_GAIN = 0.15
const BRAKE_GLOW_MAX = 2.5 // above the baked default of 1 — a deliberate
// brighten, not just "back to how it looked before this existed"
// Even after SPEED_SMOOTH_LAMBDA, differencing speed leaves per-frame jitter
// that is larger than BRAKE_DECEL_DEADZONE (scroll input and the render loop
// sample at different phases). `max(0, -accel - deadzone)` rectifies that:
// its negative half leaks through as a steady faint glow instead of averaging
// out — measured mean brake 0.25, max 0.62, lit on 500 of 505 cruise frames.
// The brake therefore reads its own further-smoothed copy of accel (a damped
// EMA, ~83ms time constant) instead of the raw one. Measured against a hard
// stop it lights within ~100-125ms of input ending, and cruise stays at 0.00
// across every frame — a longer window (λ=5, ~200ms) was equally clean but
// ~40ms slower to light. This filters noise without delaying real braking
// the way a higher deadzone would. Pitch keeps reading the unsmoothed `accel`.
const BRAKE_ACCEL_LAMBDA = 12
const BRAKE_DECEL_DEADZONE = 6
const WHEEL_NAMES = ['FL', 'FR', 'RL', 'RR'] as const
type WheelKey = (typeof WHEEL_NAMES)[number]

function shortestAngleDiff(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b))
}

// The route never leaves the XZ plane (curve.ts only ever rotates heading
// about world Y), and the model's own local forward is already +X
// (CLAUDE.md section 3's derived facts), so the yaw needed to turn local
// +X onto a world tangent (tx, 0, tz) is exactly atan2(-tz, tx) — worked
// out from three.js's own Y-rotation matrix (x' = x cosθ + z sinθ,
// z' = -x sinθ + z cosθ) rather than assumed, since getting this sign
// wrong would have the car facing exactly backwards.
function headingAngleFromTangent(tangent: THREE.Vector3) {
  return Math.atan2(-tangent.z, tangent.x)
}

// body_main has no baseColorTexture (CLAUDE.md section 3), so recolouring
// the car is a one-line material constant change — but material.color is
// LINEAR and GUARDS is an sRGB hex, so it has to go through setStyle's
// explicit sRGB->linear conversion, not a raw numeric assignment.
export function Car() {
  const { materials } = useGLTF(MODEL_PATH)

  // Three nested groups, each owning one layer of the rig:
  //  - rootRef: position along the curve + yaw heading
  //  - dynamicsRef: roll (local X) and pitch (local Z) on top of that heading
  //  - modelRef: the model itself, plus where wheel nodes are looked up from
  // Roll/pitch can't live on rootRef alongside heading — heading is driven
  // as a quaternion (damped slerp, see below) and Euler .x/.z writes on the
  // same object would fight it every frame instead of composing with it.
  const rootRef = useRef<THREE.Group>(null)
  const dynamicsRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)

  const wheelsRef = useRef<Partial<Record<WheelKey, THREE.Object3D>>>({})
  const totalLength = useMemo(() => ROUTE_CURVE.getLength(), [])

  // Driving state carried between frames — refs, not React state, per
  // CLAUDE.md section 5's "never setState during scroll."
  const prevPos = useRef<THREE.Vector3 | null>(null)
  const prevP = useRef(0)
  const smoothedSpeed = useRef(0) // feeds accel (pitch + brake glow) — see SPEED_SMOOTH_LAMBDA
  const prevHeadingAngle = useRef<number | null>(null)
  const headingQuat = useRef(new THREE.Quaternion())
  const fpsEma = useRef(60)
  const brakeGlow = useRef(0)
  const brakeAccel = useRef(0) // accel further smoothed for the brake light only — see BRAKE_ACCEL_LAMBDA
  // Scratch, reused every frame instead of allocated — this runs inside
  // useFrame, so a `new THREE.Vector3()`/`new THREE.Quaternion()` here would
  // be a 60Hz allocation. three.js's own getPointAt/getTangentAt accept an
  // optionalTarget for exactly this reason.
  const scratchQuat = useRef(new THREE.Quaternion())
  const scratchPos = useRef(new THREE.Vector3())
  const scratchT0 = useRef(new THREE.Vector3())
  const scratchT1 = useRef(new THREE.Vector3())
  const scratchTHead = useRef(new THREE.Vector3())

  useLayoutEffect(() => {
    const bodyMain = materials.body_main as THREE.MeshPhysicalMaterial | undefined
    bodyMain?.color.setStyle(GUARDS, THREE.SRGBColorSpace)

    // Baked emissiveIntensity=1 reads as "always on" the moment the model
    // loads. Off until useFrame below has an actual braking event to show.
    const tailLight = materials.red_light_main as THREE.MeshStandardMaterial | undefined
    if (tailLight) tailLight.emissiveIntensity = 0

    // gltfjsx's generated <mesh> elements are fresh Object3D instances (they
    // only reuse the parsed geometry/material references), so shadow flags
    // have to be set on this rendered tree directly — setting them on the
    // nodes map from useGLTF wouldn't touch what's actually mounted here.
    modelRef.current?.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })

    // Wheel radius, read not guessed (CLAUDE.md section 5): ground is at
    // Y=0 and this runs before the rig has moved or tilted, so each wheel
    // node's world-space Y *is* its radius, whatever the nested local
    // transforms above it happen to be — no need to hand-derive them.
    const found: Partial<Record<WheelKey, THREE.Object3D>> = {}
    const worldPos = new THREE.Vector3()
    for (const key of WHEEL_NAMES) {
      const wheel = modelRef.current?.getObjectByName(`wheel_${key}`)
      if (!wheel) {
        console.warn(`Car: wheel_${key} node not found — it will not spin or steer.`)
        continue
      }
      wheel.getWorldPosition(worldPos)
      wheel.userData.radius = worldPos.y
      found[key] = wheel
    }
    wheelsRef.current = found

    // Car only mounts once useGLTF's Suspense boundary resolves, so this is
    // a reliable "model loaded" signal for tools/measure-fps.mjs.
    ;(window as unknown as { __appReady?: boolean }).__appReady = true
  }, [materials])

  useFrame((_, rawDelta) => {
    const root = rootRef.current
    const dynamics = dynamicsRef.current
    if (!root || !dynamics) return

    // Guards against a huge delta after the tab was backgrounded — one
    // giant catch-up step would snap the car across half the route.
    const dt = Math.min(rawDelta, 1 / 15)

    const p = THREE.MathUtils.clamp(scroll.progress, 0.0001, 0.9999)
    const pos = ROUTE_CURVE.getPointAt(p, scratchPos.current)

    if (prevPos.current === null) {
      prevPos.current = pos.clone()
      prevP.current = p
    }

    // Wheel rotation derived from distance actually travelled, never a
    // constant spin (CLAUDE.md section 5's "single biggest tell of a fake
    // driving car"). Sign of (p - prevP) makes reverse-scroll drive the
    // wheels backwards for free.
    const dist = pos.distanceTo(prevPos.current)
    const dir = Math.sign(p - prevP.current) || 1
    const wheels = wheelsRef.current
    for (const key of WHEEL_NAMES) {
      const wheel = wheels[key]
      if (!wheel) continue
      const radius = (wheel.userData.radius as number) || 0.35
      wheel.rotation.z += (dist / radius) * dir
    }

    // Steering: signed angle between the tangent now and slightly ahead,
    // clamped and damped. Front wheels only.
    const t0 = ROUTE_CURVE.getTangentAt(p, scratchT0.current)
    const t1 = ROUTE_CURVE.getTangentAt(Math.min(p + STEER_LOOKAHEAD, 1), scratchT1.current)
    const curveYaw = headingAngleFromTangent(t1) - headingAngleFromTangent(t0)
    const steer = THREE.MathUtils.clamp(curveYaw * STEER_GAIN, -0.5, 0.5)
    if (wheels.FL) wheels.FL.rotation.y = THREE.MathUtils.damp(wheels.FL.rotation.y, steer, STEER_LAMBDA, dt)
    if (wheels.FR) wheels.FR.rotation.y = THREE.MathUtils.damp(wheels.FR.rotation.y, steer, STEER_LAMBDA, dt)

    // Heading: look further ahead than the steer probe, damp the resulting
    // quaternion rather than snapping to the immediate tangent — CLAUDE.md
    // section 5 is explicit that snapping judders on tight curves.
    const headingLookaheadP = Math.min(p + HEADING_LOOKAHEAD_METERS / totalLength, 1)
    const tHead = ROUTE_CURVE.getTangentAt(headingLookaheadP, scratchTHead.current)
    const targetHeadingAngle = headingAngleFromTangent(tHead)
    const targetQuat = scratchQuat.current.setFromAxisAngle(UP, targetHeadingAngle)
    headingQuat.current.slerp(targetQuat, 1 - Math.exp(-HEADING_LAMBDA * dt))
    root.position.copy(pos)
    root.quaternion.copy(headingQuat.current)

    // Body dynamics — small numbers, both damped (CLAUDE.md section 5).
    // Speed and yaw rate come from what the chassis is actually doing this
    // frame, not a separate invented signal.
    // Divide by the real frame time, not the clamped `dt`: `dist` above
    // covers however long this frame actually took, so a hitch (shader
    // compile, tab refocus, GC) longer than the 1/15s clamp would otherwise
    // read as a proportionally faster car — a 350ms frame measured ~154 km/h
    // against a true ~62. `dt` stays the clamp for the damping maths, where
    // a bounded step is the whole point.
    const speed = rawDelta > 0 ? dist / rawDelta : 0
    // headingQuat is always a pure Y-axis rotation (both endpoints of every
    // slerp are), so its angle is fully recoverable from just y and w —
    // 2*atan2(y, w) is the standard quaternion-to-angle identity for a
    // rotation about a single fixed axis.
    const appliedHeadingAngle = 2 * Math.atan2(headingQuat.current.y, headingQuat.current.w)
    if (prevHeadingAngle.current === null) prevHeadingAngle.current = appliedHeadingAngle
    const yawRate = dt > 0 ? shortestAngleDiff(appliedHeadingAngle, prevHeadingAngle.current) / dt : 0
    // accel comes from the smoothed speed, not the raw per-frame one — see
    // SPEED_SMOOTH_LAMBDA above for why differencing two noisy samples
    // would otherwise make pitch and the brake light flicker mid-cruise.
    const prevSmoothedSpeed = smoothedSpeed.current
    smoothedSpeed.current = THREE.MathUtils.damp(smoothedSpeed.current, speed, SPEED_SMOOTH_LAMBDA, dt)
    const accel = dt > 0 ? (smoothedSpeed.current - prevSmoothedSpeed) / dt : 0

    const rollTarget = THREE.MathUtils.clamp(-yawRate * speed * ROLL_GAIN, -ROLL_MAX_RAD, ROLL_MAX_RAD)
    const pitchTarget = THREE.MathUtils.clamp(accel * PITCH_GAIN, -PITCH_MAX_RAD, PITCH_MAX_RAD)
    dynamics.rotation.x = THREE.MathUtils.damp(dynamics.rotation.x, rollTarget, DYNAMICS_LAMBDA, dt)
    dynamics.rotation.z = THREE.MathUtils.damp(dynamics.rotation.z, pitchTarget, DYNAMICS_LAMBDA, dt)

    // Tail lights: same accel signal as pitch, but only its braking
    // (decelerating) half, and only this material — nothing else reads it.
    const tailLight = materials.red_light_main as THREE.MeshStandardMaterial | undefined
    if (tailLight) {
      brakeAccel.current = THREE.MathUtils.damp(brakeAccel.current, accel, BRAKE_ACCEL_LAMBDA, dt)
      const decel = Math.max(0, -brakeAccel.current - BRAKE_DECEL_DEADZONE)
      const brakeTarget = THREE.MathUtils.clamp(decel * BRAKE_GLOW_GAIN, 0, BRAKE_GLOW_MAX)
      brakeGlow.current = THREE.MathUtils.damp(brakeGlow.current, brakeTarget, BRAKE_GLOW_LAMBDA, dt)
      tailLight.emissiveIntensity = brakeGlow.current
    }

    prevPos.current.copy(pos)
    prevP.current = p
    prevHeadingAngle.current = appliedHeadingAngle

    // Published for ChaseCamera (which mounts after this component so it reads
    // the pose from this same frame).
    carPose.position.copy(pos)
    carPose.heading = appliedHeadingAngle
    carPose.progress = p

    // Debug HUD telemetry (DebugHud.tsx polls this from outside the Canvas).
    fpsEma.current = THREE.MathUtils.damp(fpsEma.current, dt > 0 ? 1 / dt : fpsEma.current, 4, dt)
    telemetry.progress = p
    telemetry.speedKmh = speed * 3.6
    telemetry.steerDeg = THREE.MathUtils.radToDeg(steer)
    telemetry.wheelDeg = wheels.FL ? THREE.MathUtils.radToDeg(wheels.FL.rotation.z % (Math.PI * 2)) : 0
    telemetry.rollDeg = THREE.MathUtils.radToDeg(dynamics.rotation.x)
    telemetry.pitchDeg = THREE.MathUtils.radToDeg(dynamics.rotation.z)
    telemetry.brakeGlow = brakeGlow.current
    telemetry.fps = fpsEma.current
  })

  return (
    <group ref={rootRef}>
      {/* Tyre contact patches only. This renders straight down from an
          orthographic camera baked into a texture, so it can't rake — the
          SunRig directional light carries the raking shadow now that the
          ground plane exists to receive it; this just grounds the tyres.
          Low opacity, tight falloff.

          Parented to rootRef (position + heading), not dynamicsRef, so body
          roll/pitch never tilts a shadow that's supposed to stay flat on
          the ground — and sibling to dynamicsRef rather than a child of it
          for that reason. Being a child of rootRef at all is what makes it
          follow the car for free: the route is ~953m long and this used to
          sit pinned at the world origin (position [0,0,0] in world space),
          so it was only ever correct for the few metres near the start and
          was left behind for the rest of the drive. Now [0,0,0] is in
          rootRef's local space, which the parent group's own translation
          carries along every frame — no per-frame code needed here, and
          frames={1} (bake once) is still correct because nothing in this
          local space ever moves. */}
      <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={8} blur={1.5} far={1.2} frames={1} />
      <group ref={dynamicsRef}>
        <group ref={modelRef}>
          <PorscheModel />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_PATH)
