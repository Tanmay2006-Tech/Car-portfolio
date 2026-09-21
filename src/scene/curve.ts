import * as THREE from 'three'

// CLAUDE.md section 5: a single CatmullRomCurve3 is the source of truth for
// car position, heading, road geometry and the camera — nothing later can
// desync from the road because there's nothing else defining the road.
// Nothing drives on it yet (PROMPTS.md step 3); this is purely the shape.
//
// A single 90° bend after the opening straight gave two visual features for
// six legs (CLAUDE.md section 1) — legs 2/3/4 would have been
// indistinguishable. This is a relaxed meander instead: one dead-straight
// opening, three alternating bends (reversals allowed — the earlier S's
// problem was reversing TIGHTLY, not reversing at all), short near-straight
// buffers between them so steering settles before the next bend starts, and
// a final straight to stop square on for leg 5.
//
// Built programmatically (not a literal waypoint array) because the actual
// shape needed real verification, not just plausible-looking control
// points: a straight-into-circle join is a curvature discontinuity, and
// Catmull-Rom only guarantees tangent (G1) continuity, not curvature (G2) —
// it can transiently overshoot well past the target radius right at a
// join. Confirmed exactly that with the first version of this route: a
// nominal 165m first bend produced an actual minimum radius of 12m right at
// the straight/bend seam. Fixed by (a) switching to centripetal
// parametrization, which three.js recommends specifically for non-uniform
// point spacing like ours (straights sampled every ~50m, bends every ~8m),
// and (b) sizing every bend with enough margin that even its transient
// undershoot clears 150m. Verified by densely sampling the REAL curve's
// tangent and finite-differencing it for actual radius of curvature —
// checking the construction parameters alone would have missed this
// exact failure mode. See tools/verify-route.mjs to re-run that check
// after any change here.
//
// Verified result: total length 952.8m (~900m target), minimum radius of
// curvature 163.3m (>=150m required) at every point along the curve, not
// just at the bends' nominal centres.
const UP = new THREE.Vector3(0, 1, 0)

// heading.applyAxisAngle(UP, -90deg) gives the "left" direction (e.g. left
// of +X heading is +Z) — verified empirically against three.js's actual
// rotation convention, not assumed.
function leftOf(heading: THREE.Vector3): THREE.Vector3 {
  return heading.clone().applyAxisAngle(UP, -Math.PI / 2)
}

interface RouteBuilder {
  points: THREE.Vector3[]
  straight(length: number, subdivisions: number): void
  bend(radius: number, sweepDeg: number, turn: 'L' | 'R', subdivisions: number): void
}

function createRouteBuilder(): RouteBuilder {
  const points: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)]
  let pos = points[0].clone()
  let heading = new THREE.Vector3(1, 0, 0)

  return {
    points,
    straight(length, subdivisions) {
      const start = pos.clone()
      for (let i = 1; i <= subdivisions; i++) {
        points.push(start.clone().addScaledVector(heading, (length * i) / subdivisions))
      }
      pos = start.clone().addScaledVector(heading, length)
    },
    bend(radius, sweepDeg, turn, subdivisions) {
      const turnSign = turn === 'L' ? 1 : -1
      const start = pos.clone()
      const forward = heading.clone()
      const left = leftOf(forward)
      const sweepRad = THREE.MathUtils.degToRad(sweepDeg)
      for (let i = 1; i <= subdivisions; i++) {
        const phi = (sweepRad * i) / subdivisions
        points.push(
          start
            .clone()
            .addScaledVector(forward, radius * Math.sin(phi))
            .addScaledVector(left, turnSign * radius * (1 - Math.cos(phi))),
        )
      }
      heading = forward.applyAxisAngle(UP, -turnSign * sweepRad)
      pos = points[points.length - 1].clone()
    },
  }
}

// Exported so the camera (legs.ts) can tie leg 1's side-on shot to where the
// straight actually ends instead of duplicating the number.
export const OPENING_STRAIGHT_M = 300

function buildRouteWaypoints(): THREE.Vector3[] {
  const route = createRouteBuilder()
  route.straight(OPENING_STRAIGHT_M, 6) // opening straight — dead straight, legs 0-1
  route.bend(220, 42, 'L', 20)
  route.straight(45, 2) // buffer — steering settles before reversing
  route.bend(225, 41, 'R', 20)
  route.straight(45, 2)
  route.bend(230, 40, 'L', 20)
  route.straight(80, 2) // final straight — car stops square, leg 5
  return route.points
}

export const ROUTE_CURVE = new THREE.CatmullRomCurve3(buildRouteWaypoints(), false, 'centripetal', 0.5)

export const ROAD_WIDTH = 5
