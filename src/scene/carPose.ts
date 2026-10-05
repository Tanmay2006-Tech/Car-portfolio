import * as THREE from 'three'

// Same rationale as scrollState.ts and telemetry.ts: a plain mutable object
// written once a frame by Car.tsx's useFrame and read by ChaseCamera.tsx's, so
// the camera follows the car without React state or a ref threaded between
// the two components.
export const carPose = {
  // World position on the route (the exact curve point, not damped).
  position: new THREE.Vector3(),
  // The car's applied (damped) yaw about world Y, in the same convention
  // Car.tsx uses: local +X maps to world (cos a, 0, -sin a).
  heading: 0,
  progress: 0,
  // Route progress (0-1 of the scroll's route budget) after Car.tsx's
  // inertia — what everything that should move WITH the car reads: the
  // camera's shot keyframes, the leg 1 card track, the door. Raw
  // scroll.routeP jumps with every wheel notch; this glides.
  routeP: 0,
  // Set by DOM code that jumps the page on purpose (keyboard focus landing
  // on a project card): the car skips its inertia and appears at the new
  // position, so the focused card is on screen immediately.
  snap: false,
}
