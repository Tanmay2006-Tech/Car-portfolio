import * as THREE from 'three'

import { LEG_START, OPENING_STRAIGHT_END } from './legs'

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

// Rear three-quarter, low. The default for legs 0, 2 and 3: a low camera reads
// fast and planted, a centred one reads like a product shot (CLAUDE.md section 2).
const CHASE: Shot = { azimuthDeg: 14, radius: 7, height: 1.25, aimX: 0.4, aimY: 0.7, aimZ: 0, fov: 35, stageBias: 0.3 }

// Leg 1: square to the car on the passenger side, low and parallel, like a
// tracking shot from a camera car (CLAUDE.md section 1).
const SIDE: Shot = { azimuthDeg: 90, radius: 8.5, height: 0.75, aimX: 0, aimY: 0.65, aimZ: 0, fov: 32, stageBias: 0.34 }

// Leg 4: wheel height, close, wide enough that the road surface carries the frame.
const LOW: Shot = { azimuthDeg: 8, radius: 5.6, height: 0.5, aimX: 1, aimY: 0.45, aimZ: 0, fov: 42, stageBias: 0.3 }

// Leg 5, in two beats: swing round to the driver's side (-Z), then push in
// toward the door. Step 6 opens the door and takes the camera inside; this
// ends outside it at window height. The stage bias goes to 0 — the column
// drops away and the car fills the frame (CLAUDE.md section 2).
const DOOR_SWING: Shot = { azimuthDeg: -70, radius: 5, height: 1.15, aimX: 0.2, aimY: 0.9, aimZ: -0.5, fov: 38, stageBias: 0.12 }
const DOOR_PUSH: Shot = { azimuthDeg: -88, radius: 2.4, height: 1.2, aimX: 0.2, aimY: 1, aimZ: -0.5, fov: 45, stageBias: 0 }

// Progress -> shot. Holds are two keyframes with the same shot; the blend
// between neighbours is eased so a leg boundary never reads as a cut.
const [, LEG1, , , LEG4, LEG5] = LEG_START
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
  [LEG5 - 0.02, LOW],
  [LEG5 + 0.025, DOOR_SWING],
  [LEG5 + 0.045, DOOR_SWING],
  [0.985, DOOR_PUSH],
  [1, DOOR_PUSH],
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

export function sampleShot(progress: number, out: Shot): Shot {
  const p = THREE.MathUtils.clamp(progress, 0, 1)
  let i = 1
  while (i < KEYFRAMES.length - 1 && p > KEYFRAMES[i][0]) i++
  const [pa, a] = KEYFRAMES[i - 1]
  const [pb, b] = KEYFRAMES[i]
  const t = pb > pa ? THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((p - pa) / (pb - pa), 0, 1), 0, 1) : 1
  for (const key of KEYS) out[key] = THREE.MathUtils.lerp(a[key], b[key], t)
  return out
}
