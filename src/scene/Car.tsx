import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

import { Model as PorscheModel } from '../components/Porsche'
import { GUARDS, srgb } from './colors'
import { carPose } from './carPose'
import { ROUTE_CURVE } from './curve'
import { scroll, driveP, DOOR_OPEN_START, DOOR_OPEN_END } from './scrollState'
import { telemetry } from './telemetry'
import { reportMissingNode } from './modelIntegrity'
import { IS_MOBILE } from '../env'
import { InfotainmentScreen } from './InfotainmentScreen'

// Mobile gets the interior-stripped GLB (CLAUDE.md section 3: ~2.1MB vs
// ~4.9MB) — it never sees the cabin, since leg 5 stays outside there.
// Relative to the deploy base, so the site works from a sub-path too.
const MODEL_PATH = `${import.meta.env.BASE_URL}models/porsche-${IS_MOBILE ? 'mobile' : 'desktop'}.glb`

// Driver's door (door_2, -Z) poses, CLAUDE.md section 3's derived facts.
// Closed is door_1's own pose — the shared FBX->glTF axis correction — not
// identity. Open is 45 degrees about the front hinge; the translation is in
// the node's own pre-ancestor-scale units, which is why it's ~100.
const DOOR_CLOSED_QUAT = new THREE.Quaternion(-0.7071068, 0, 0, 0.7071068)
const DOOR_OPEN_QUAT = new THREE.Quaternion(-0.6533, -0.2706, -0.2706, 0.6533).normalize()
const DOOR_CLOSED_POS = new THREE.Vector3(0, 0, 0)
const DOOR_OPEN_POS = new THREE.Vector3(-106.3989, 0, 90.7349)
// Engine speed while driving: idle plus a fixed slope against road speed,
// so ~60km/h cruise reads ~3,300rpm. Not a gearbox model — just enough for
// the gauge's needle to move with the car instead of sitting at idle.
const RPM_PER_KMH = 40
const MAX_RPM = 7200
const CABIN_LIGHT_INTENSITY = 2.2

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
// App.tsx's <Environment environmentIntensity={0.35}> turns the HDRI down
// scene-wide to protect --verge's ground colour from being washed out
// (CLAUDE.md section 2's HDRI note). three.js multiplies that scene-wide
// factor by each material's own envMapIntensity (default 1) to get the
// final IBL contribution, so 0.35 is quietly dimming the car's reflections
// too even though it was only ever meant to fix the ground. Setting
// envMapIntensity here to the exact reciprocal cancels that scene-wide
// dim for the car ONLY — Ground.tsx never touches envMapIntensity, so the
// ground stays at the protected 0.35 while the car reads at full strength.
const CAR_ENV_MAP_INTENSITY = 1 / 0.35
const BODY_CLEARCOAT = 1
const BODY_CLEARCOAT_ROUGHNESS = 0.05
// Car.tsx section 1's opening (CLAUDE.md): phase A/B are parked, engine and
// lights off; phase B's "ignition self-test" is these three cues plus the
// telemetry HUD's rpm sweep (DebugHud.tsx). All of them are pure functions
// of the current scroll.phase/phaseProgress, not one-way ratchets, so
// scrolling back up genuinely reverses the ignition — matching CLAUDE.md's
// "scroll-scrubbed and reversible."
const HEADLIGHT_ON_START = 0.35 // fraction of the cold-start budget where the ramp begins
const HEADLIGHT_ON_END = 0.55 // fully lit by here — well before the camera finishes arriving at CHASE
const HEADLIGHT_INTENSITY = 3 // matches BRAKE_GLOW_MAX's order of magnitude — bright enough to read against the pastel scene
// No emissive texture on `lights` (unlike red_light_main, which bakes one
// in) — CLAUDE.md section 3 only lists red_light_back as pre-lit, so the
// headlight colour has to be set explicitly rather than just brightening a
// baked map.
const HEADLIGHT_COLOR = '#fff2dc'
const IGNITION_PEAK_RPM = 6500
const IDLE_RPM = 850
const FADE_IN_LAMBDA = 4 // ~0.5-0.8s to fully opaque — CLAUDE.md section 1: "the car fades in when loaded"
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
  const cabinLightRef = useRef<THREE.PointLight>(null)

  const wheelsRef = useRef<Partial<Record<WheelKey, THREE.Object3D>>>({})
  const doorRef = useRef<THREE.Object3D | null>(null)
  const rpmSmoothed = useRef(0)
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
  // Fade-in on mount (CLAUDE.md section 1: "the car fades in when loaded").
  // The materials map from useGLTF is already the deduplicated set of all
  // 37 unique material instances actually mounted — no need to re-collect
  // it from a mesh traversal.
  const fadeIn = useRef(0)
  const fadeDone = useRef(false)
  const fadeMaterials = useRef<THREE.Material[]>([])
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

    // body_main ships with no clearcoat at all (CLAUDE.md section 3 — only
    // LOGO1's badge material carries KHR_materials_clearcoat). A lacquered
    // clearcoat layer on top of the base coat is what makes automotive
    // paint read as smooth, wet-looking paint instead of matte plastic, so
    // it's added here as a material constant rather than a texture edit.
    if (bodyMain) {
      bodyMain.clearcoat = BODY_CLEARCOAT
      bodyMain.clearcoatRoughness = BODY_CLEARCOAT_ROUGHNESS
    }

    // Baked emissiveIntensity=1 reads as "always on" the moment the model
    // loads. Off until useFrame below has an actual braking event to show.
    const tailLight = materials.red_light_main as THREE.MeshStandardMaterial | undefined
    if (tailLight) tailLight.emissiveIntensity = 0

    // Headlights (CLAUDE.md section 1 phase B): also shared by
    // trans_covers_lights_0, the lens cover over the same bulb, so both lens
    // and housing light up together — physically correct, and no special
    // casing needed. No baked emissive map here (unlike the tail light), so
    // the colour itself has to be set, not just its intensity.
    const headlights = materials.lights as THREE.MeshPhysicalMaterial | undefined
    if (headlights) {
      headlights.emissive.copy(srgb(HEADLIGHT_COLOR))
      headlights.emissiveIntensity = 0
    }

    // Fade-in on mount: every material starts fully transparent, then
    // useFrame ramps opacity 0->1 and restores each material's original
    // `transparent` flag once done, so the rest of the session doesn't pay
    // for transparent-object sort order on an opaque car body.
    const allMaterials = Object.values(materials) as THREE.Material[]
    // Each material's own opacity is kept and faded TO, not overwritten
    // with 1: the glass and the model's hidden helper meshes
    // (invisible_all) ship partly or fully transparent, and forcing them
    // opaque turned the windows black and the helpers into white blobs.
    for (const material of allMaterials) {
      material.userData.__preFadeTransparent = material.transparent
      material.userData.__preFadeOpacity = material.opacity
      material.transparent = true
      material.opacity = 0
    }
    fadeMaterials.current = allMaterials

    // gltfjsx's generated <mesh> elements are fresh Object3D instances (they
    // only reuse the parsed geometry/material references), so shadow flags
    // have to be set on this rendered tree directly — setting them on the
    // nodes map from useGLTF wouldn't touch what's actually mounted here.
    // envMapIntensity is set in this same traversal, on every material
    // reachable from the car (paint, chrome, glass, wheels — all of them,
    // per CLAUDE.md's "car's materials", not just body_main), for the same
    // reason: the mounted mesh/material instances are what actually render.
    modelRef.current?.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const material = mesh.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial | undefined
      if (material) material.envMapIntensity = CAR_ENV_MAP_INTENSITY
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
        reportMissingNode(`wheel_${key}`, 'it will not spin or steer.')
        continue
      }
      wheel.getWorldPosition(worldPos)
      wheel.userData.radius = worldPos.y
      found[key] = wheel
    }
    wheelsRef.current = found

    // door_2 is the driver's door leg 5 opens; door_1 is only checked so a
    // dropped node name (see modelIntegrity.ts) can never fail silently.
    for (const doorName of ['door_1', 'door_2']) {
      const door = modelRef.current?.getObjectByName(doorName)
      if (!door) reportMissingNode(doorName, "leg 5's cabin entry will have nothing to open.")
      else if (doorName === 'door_2') doorRef.current = door
    }

    // Car only mounts once useGLTF's Suspense boundary resolves, so this is
    // a reliable "model loaded" signal for tools/measure-fps.mjs.
    ;(window as unknown as { __appReady?: boolean }).__appReady = true
  }, [materials])

  useFrame((state, rawDelta) => {
    const root = rootRef.current
    const dynamics = dynamicsRef.current
    if (!root || !dynamics) return

    // Guards against a huge delta after the tab was backgrounded — one
    // giant catch-up step would snap the car across half the route.
    const dt = Math.min(rawDelta, 1 / 15)

    // Fade-in: ramps once per mount, then stops touching these materials
    // at all (fadeDone) rather than writing opacity=1/transparent=false
    // every frame forever.
    if (!fadeDone.current) {
      fadeIn.current = THREE.MathUtils.damp(fadeIn.current, 1, FADE_IN_LAMBDA, dt)
      for (const material of fadeMaterials.current) {
        material.opacity = fadeIn.current * ((material.userData.__preFadeOpacity as number) ?? 1)
      }
      if (fadeIn.current > 0.995) {
        fadeDone.current = true
        for (const material of fadeMaterials.current) {
          material.opacity = (material.userData.__preFadeOpacity as number) ?? 1
          material.transparent = (material.userData.__preFadeTransparent as boolean) ?? false
        }
      }
    }

    // routeP, not raw scroll.progress: CLAUDE.md section 1's opening splits
    // the page into hero + cold-start + route budgets (scrollState.ts), and
    // routeP is already 0 for the first two and real curve progress only
    // once scroll passes into the route budget — the car stays parked at
    // the route's start through both hero and cold start.
    // driveP: identical to routeP until leg 5, where the car brakes to a
    // stop while scroll carries on through the door and cabin beats.
    const p = THREE.MathUtils.clamp(driveP(scroll.routeP), 0.0001, 0.9999)
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

    // Idle shudder (CLAUDE.md section 1 phase B): additive on top of the
    // roll/pitch above, not a replacement for it — small enough that it
    // reads as engine vibration through a parked chassis, not body roll.
    // Envelope rises over the first 15% of the cold-start budget, holds,
    // then fades over the last 15% so it's gone by the time the car
    // actually pulls away — a pure function of scroll.phase/phaseProgress,
    // so it's exactly as reversible as everything else in this phase.
    if (scroll.phase === 'coldstart') {
      const envelope =
        THREE.MathUtils.smootherstep(scroll.phaseProgress, 0, 0.15) *
        (1 - THREE.MathUtils.smootherstep(scroll.phaseProgress, 0.85, 1))
      const t = state.clock.elapsedTime
      dynamics.rotation.x += (Math.sin(t * 47) * 0.0025 + Math.sin(t * 83) * 0.0012) * envelope
      dynamics.rotation.z += Math.cos(t * 39) * 0.0018 * envelope
    }

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

    // Headlights: off through the hero phase (engine and lights off),
    // ramp on partway through cold start, stay on for the rest of the
    // drive. Pure function of scroll.phase/phaseProgress — reversible.
    const headlights = materials.lights as THREE.MeshPhysicalMaterial | undefined
    if (headlights) {
      const headlightOn =
        scroll.phase === 'route'
          ? 1
          : scroll.phase === 'coldstart'
            ? THREE.MathUtils.smootherstep(scroll.phaseProgress, HEADLIGHT_ON_START, HEADLIGHT_ON_END)
            : 0
      headlights.emissiveIntensity = headlightOn * HEADLIGHT_INTENSITY
    }

    // rpm: the ignition self-test's own number, and the thing the debug/
    // telemetry HUD's needle sweep (DebugHud.tsx) actually reads — "the
    // leg 2 telemetry HUD waking up, not a separate element" per CLAUDE.md
    // section 1. Revs to a peak over the first ~22% of cold start, falls
    // back to a steady idle by ~60%, and holds idle through the drive
    // (this project doesn't otherwise model engine rpm against speed).
    if (scroll.phase === 'hero') {
      telemetry.rpm = 0
    } else if (scroll.phase === 'coldstart') {
      const rise = THREE.MathUtils.smootherstep(scroll.phaseProgress, 0, 0.22)
      const fall = THREE.MathUtils.smootherstep(scroll.phaseProgress, 0.22, 0.6)
      telemetry.rpm = THREE.MathUtils.lerp(0, IGNITION_PEAK_RPM, rise) * (1 - fall) + IDLE_RPM * fall
    } else {
      const target = Math.min(MAX_RPM, IDLE_RPM + smoothedSpeed.current * 3.6 * RPM_PER_KMH)
      rpmSmoothed.current = THREE.MathUtils.damp(rpmSmoothed.current || IDLE_RPM, target, 4, dt)
      telemetry.rpm = rpmSmoothed.current
    }

    // Driver's door, leg 5. Pure function of scroll like the ignition cues,
    // so scrolling back up closes it again. Desktop only: mobile never goes
    // inside, so there's nothing to open the door onto.
    const door = doorRef.current
    if (door && !IS_MOBILE) {
      const open = THREE.MathUtils.smootherstep(scroll.routeP, DOOR_OPEN_START, DOOR_OPEN_END)
      door.quaternion.slerpQuaternions(DOOR_CLOSED_QUAT, DOOR_OPEN_QUAT, open)
      door.position.lerpVectors(DOOR_CLOSED_POS, DOOR_OPEN_POS, open)
    }

    // Cabin fill: the interior is dark leather under a roof, and the HDRI
    // alone leaves it nearly black from the driver's seat. Always mounted
    // (so adding it never triggers a shader recompile mid-scroll), lit
    // only as the door opens.
    const cabinLight = cabinLightRef.current
    if (cabinLight) {
      cabinLight.intensity = IS_MOBILE ? 0 : CABIN_LIGHT_INTENSITY * THREE.MathUtils.smootherstep(scroll.routeP, DOOR_OPEN_START, DOOR_OPEN_END)
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
    telemetry.speedSmoothKmh = smoothedSpeed.current * 3.6
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
          <PorscheModel url={MODEL_PATH} />
          {!IS_MOBILE && <InfotainmentScreen />}
          <pointLight ref={cabinLightRef} position={[0.1, 1.05, 0]} intensity={0} distance={2.6} decay={1.4} color="#ffe8d2" />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_PATH)
