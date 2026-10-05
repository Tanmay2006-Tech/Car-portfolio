import * as THREE from 'three'

import { LEG_START, OPENING_STRAIGHT_END } from './legs'
import { DOOR_OPEN_START, DOOR_OPEN_END, CABIN_REACHED } from './scrollState'
import { IS_MOBILE } from '../env'

// A shot is described in the CAR's local frame (CLAUDE.md section 3: forward
// is +X, up is +Y, the passenger side is +Z, and the driver's side is -Z), so
// the same shot works wherever the car is on the route. The camera orbits an
// aim point on the car: azimuth 0 is directly behind, +90 is the passenger
// side, -90 is the driver's side.
export interface Shot {
  azimuthDeg: number
  radius: number // horizontal distance from the aim point
  height: number // camera height above the ground, absolute
  aimX: number
  aimY: number
  aimZ: number
  fov: number
  // Fraction of the half-frame width the car is pushed right of centre.
  // CLAUDE.md section 2: the car sits off-centre in the 64% stage, never
  // centred. Aiming left of the car does this without changing the projection.
  stageBias: number
}

// Phase A (CLAUDE.md section 1): the static landing-page shot. Low three-
// quarter FRONT (azimuth near 180 = directly in front; this sits toward the
// passenger-front corner so the grille and one flank both read), car off-
// axis right of the stage per section 2's layout — same stageBias sign as
// CHASE below, so the hand-off during the cold-start blend doesn't also
// have to cross the frame's centre line.
export const HERO: Shot = { azimuthDeg: 160, radius: 6.9, height: 0.95, aimX: 0.1, aimY: 0.6, aimZ: 0, fov: 32, stageBias: 0.24 }

// Rear three-quarter, low. The default for legs 0, 2 and 3: a low camera reads
// fast and planted, a centred one reads like a product shot (CLAUDE.md section 2).
// Exported so ChaseCamera's cold-start blend (HERO -> this exact shot) hands
// off to precisely where the route's own opening keyframe already starts —
// no seam between "cold start ends" and "leg 0 of the route begins".
export const CHASE: Shot = { azimuthDeg: 14, radius: 7, height: 1.25, aimX: 0.4, aimY: 0.7, aimZ: 0, fov: 35, stageBias: 0.3 }

// Leg 1: square to the car on the passenger side, low and parallel, like a
// tracking shot from a camera car (CLAUDE.md section 1).
const SIDE: Shot = { azimuthDeg: 90, radius: 8.5, height: 0.75, aimX: 0, aimY: 0.65, aimZ: 0, fov: 32, stageBias: 0.34 }

// Leg 4: wheel height, close, wide enough that the road surface carries the frame.
// Aimed a few metres ahead of the car so the risk layer it's driving into
// fills the lower frame, not just the bumper.
const LOW: Shot = { azimuthDeg: 10, radius: 7.4, height: 0.85, aimX: 3, aimY: 0.35, aimZ: 0, fov: 40, stageBias: 0.28 }

// Leg 5 outside the car: swing round to the driver's side (-Z), then push
// in toward the door while it opens. The stage bias goes to 0 — the column
// drops away and the car fills the frame (CLAUDE.md section 2).
const DOOR_SWING: Shot = { azimuthDeg: -70, radius: 5, height: 1.15, aimX: 0.2, aimY: 0.9, aimZ: -0.5, fov: 38, stageBias: 0.12 }
const DOOR_PUSH: Shot = { azimuthDeg: -88, radius: 2.4, height: 1.2, aimX: 0.2, aimY: 1, aimZ: -0.5, fov: 45, stageBias: 0 }

// Inside, two beats once the driver's door (door_2, -Z) is open: CABIN_ENTER
// sits in the door aperture, CABIN is the driver's eye looking across the
// dash to the infotainment screen. Aim and height are in the car's local
// frame, same as every other shot — tuned against real renders.
const CABIN_ENTER: Shot = { azimuthDeg: -63, radius: 1.15, height: 1.08, aimX: 0.3, aimY: 0.85, aimZ: -0.3, fov: 55, stageBias: 0 }
const CABIN: Shot = { azimuthDeg: -22, radius: 0.97, height: 1.05, aimX: 0.55, aimY: 0.85, aimZ: 0, fov: 58, stageBias: 0 }

// Progress -> shot. Holds are two keyframes with the same shot; the blend
// between neighbours is eased so a leg boundary never reads as a cut.
//
// Exported: the ONE route-progress value past which the camera is
// genuinely done moving for the rest of the route — QualityMonitor.tsx
// needs this specifically, not just "somewhere in leg 5".
export const FINAL_HOLD_P = CABIN_REACHED
const [, LEG1, , , LEG4, LEG5] = LEG_START

// Mobile skips the cabin (CLAUDE.md section 7: the interior is stripped
// from the light GLB) — leg 5 ends as an exterior close-up at the door.
const LEG5_FRAMES: ReadonlyArray<readonly [number, Shot]> = IS_MOBILE
  ? [
      [LEG5 + 0.035, DOOR_SWING],
      [DOOR_OPEN_START, DOOR_SWING],
      [FINAL_HOLD_P, DOOR_PUSH],
      [1, DOOR_PUSH],
    ]
  : [
      [LEG5 + 0.035, DOOR_SWING],
      [DOOR_OPEN_START, DOOR_SWING],
      [DOOR_OPEN_END - 0.004, DOOR_PUSH],
      [DOOR_OPEN_END + 0.008, CABIN_ENTER],
      [FINAL_HOLD_P, CABIN],
      [1, CABIN],
    ]

const KEYFRAMES: ReadonlyArray<readonly [number, Shot]> = [
  [0, CHASE],
  [LEG1, CHASE],
  [LEG1 + 0.03, SIDE],
  // Out of the side-on shot in time to be back behind the car when the
  // straight ends: a tracking shot on a bend would fight the road.
  [OPENING_STRAIGHT_END - 0.03, SIDE],
  [OPENING_STRAIGHT_END, CHASE],
  [LEG4 - 0.02, CHASE],
  [LEG4 + 0.02, LOW],
  [LEG5 - 0.01, LOW],
  ...LEG5_FRAMES,
]

// The sampler assumes ascending progress. A bad edit to LEG_START (or a
// straight that ends before leg 1's blend-in finishes) would otherwise show up
// as a camera that jumps; fail at load instead.
for (let i = 1; i < KEYFRAMES.length; i++) {
  if (KEYFRAMES[i][0] < KEYFRAMES[i - 1][0]) {
    throw new Error(`cameraShots: keyframe ${i} (${KEYFRAMES[i][0]}) is before keyframe ${i - 1} (${KEYFRAMES[i - 1][0]})`)
  }
}

const KEYS = ['azimuthDeg', 'radius', 'height', 'aimX', 'aimY', 'aimZ', 'fov', 'stageBias'] as const

// Shared by sampleShot (route keyframes) and ChaseCamera's cold-start blend
// (exactly two shots, HERO -> CHASE) — the same per-key lerp either way.
export function lerpShot(a: Shot, b: Shot, t: number, out: Shot): Shot {
  for (const key of KEYS) out[key] = THREE.MathUtils.lerp(a[key], b[key], t)
  return out
}

export function sampleShot(progress: number, out: Shot): Shot {
  const p = THREE.MathUtils.clamp(progress, 0, 1)
  let i = 1
  while (i < KEYFRAMES.length - 1 && p > KEYFRAMES[i][0]) i++
  const [pa, a] = KEYFRAMES[i - 1]
  const [pb, b] = KEYFRAMES[i]
  const t = pb > pa ? THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((p - pa) / (pb - pa), 0, 1), 0, 1) : 1
  return lerpShot(a, b, t, out)
}
