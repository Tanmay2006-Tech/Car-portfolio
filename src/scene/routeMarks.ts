import * as THREE from 'three'

import { ROAD_WIDTH, ROUTE_CURVE } from './curve'
import { LEG_START } from './legs'

export const ROUTE_LENGTH_M = ROUTE_CURVE.getLength()

// Leg 1 (CLAUDE.md section 1: "Distance is shared"). The five project
// markers stand MARKER_SPACING_M apart along the opening straight, and the
// DOM card track is laid out from this same constant: card i sits i card-
// widths along the track, and the track's offset is (carDistance -
// first marker) / MARKER_SPACING_M card-widths. So when the car is halfway
// between two markers, the track is exactly halfway between two cards —
// one number feeds both, nothing to drift.
export const MARKER_FIRST_M = 75
export const MARKER_SPACING_M = 45

export function projectMarkerDistance(i: number): number {
  return MARKER_FIRST_M + i * MARKER_SPACING_M
}

// Leg 3: four numbered posts, evenly spread through the leg.
export function servicePostDistance(i: number): number {
  const start = LEG_START[3] * ROUTE_LENGTH_M
  const length = (LEG_START[4] - LEG_START[3]) * ROUTE_LENGTH_M
  return start + ((i + 0.5) * length) / 4
}

// Leg 4: the stretch of road that becomes the risk layer.
export const RISK_START_M = LEG_START[4] * ROUTE_LENGTH_M
export const RISK_END_M = LEG_START[5] * ROUTE_LENGTH_M

const UP = new THREE.Vector3(0, 1, 0)

// A roadside placement at `distance` metres along the route: the point on
// the curve, its tangent, and the road's right-hand side (-Z on the
// opening straight, the side away from leg 1's camera). `side` is metres
// from the centreline; negative puts it on the left.
export function roadside(distance: number, side: number) {
  const u = THREE.MathUtils.clamp(distance / ROUTE_LENGTH_M, 0.0001, 0.9999)
  const point = ROUTE_CURVE.getPointAt(u)
  const tangent = ROUTE_CURVE.getTangentAt(u).normalize()
  const right = new THREE.Vector3().crossVectors(UP, tangent).normalize()
  const position = point.clone().addScaledVector(right, side)
  // Local +X along the road, local +Z facing back across it toward the
  // left-hand side — matching the car's own local frame.
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent)
  return { position, quaternion, tangent, right }
}

export const ROADSIDE_OFFSET = ROAD_WIDTH / 2 + 3.2
