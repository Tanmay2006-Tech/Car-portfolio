// Verifies src/scene/curve.ts's route against CLAUDE.md section 1's
// requirements: total length, minimum radius of curvature (checked against
// the ACTUAL interpolated curve, not just the construction parameters —
// Catmull-Rom only guarantees tangent continuity, not curvature continuity,
// so a straight-into-circle join can transiently overshoot well past the
// nominal radius; that's a real failure this script would have caught
// before it shipped).
//
// This duplicates curve.ts's construction logic rather than importing it,
// since curve.ts is TypeScript and this needs to run standalone via plain
// node. Keep the two in sync by hand when the route changes.
//
// Usage: node tools/verify-route.mjs

import * as THREE from 'three';

const MIN_RADIUS_REQUIRED = 150;
const TARGET_LENGTH = 900;

const UP = new THREE.Vector3(0, 1, 0);

function leftOf(heading) {
  return heading.clone().applyAxisAngle(UP, -Math.PI / 2);
}

function createRouteBuilder() {
  const points = [new THREE.Vector3(0, 0, 0)];
  let pos = points[0].clone();
  let heading = new THREE.Vector3(1, 0, 0);
  const segments = [];

  return {
    points,
    segments,
    straight(length, subdivisions) {
      const start = pos.clone();
      for (let i = 1; i <= subdivisions; i++) {
        points.push(start.clone().addScaledVector(heading, (length * i) / subdivisions));
      }
      pos = start.clone().addScaledVector(heading, length);
      segments.push({ type: 'straight', length });
    },
    bend(radius, sweepDeg, turn, subdivisions) {
      const turnSign = turn === 'L' ? 1 : -1;
      const start = pos.clone();
      const forward = heading.clone();
      const left = leftOf(forward);
      const sweepRad = THREE.MathUtils.degToRad(sweepDeg);
      for (let i = 1; i <= subdivisions; i++) {
        const phi = (sweepRad * i) / subdivisions;
        points.push(
          start
            .clone()
            .addScaledVector(forward, radius * Math.sin(phi))
            .addScaledVector(left, turnSign * radius * (1 - Math.cos(phi))),
        );
      }
      heading = forward.applyAxisAngle(UP, -turnSign * sweepRad);
      pos = points[points.length - 1].clone();
      segments.push({ type: 'bend', radius, sweepDeg, turn, arcLength: radius * sweepRad });
    },
  };
}

function buildRoute() {
  const route = createRouteBuilder();
  route.straight(300, 6);
  route.bend(220, 42, 'L', 20);
  route.straight(45, 2);
  route.bend(225, 41, 'R', 20);
  route.straight(45, 2);
  route.bend(230, 40, 'L', 20);
  route.straight(80, 2);
  return route;
}

const { points, segments } = buildRoute();

console.log('--- segments (nominal, as constructed) ---');
let cum = 0;
for (const s of segments) {
  const len = s.type === 'straight' ? s.length : s.arcLength;
  cum += len;
  if (s.type === 'bend') {
    console.log(
      `bend   radius=${s.radius}m sweep=${s.sweepDeg}deg turn=${s.turn}  arc=${len.toFixed(1)}m  cum=${cum.toFixed(1)}m`,
    );
  } else {
    console.log(`straight  length=${len.toFixed(1)}m  cum=${cum.toFixed(1)}m`);
  }
}

const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
const totalLength = curve.getLength();

const N = 3000;
let minRadius = Infinity;
let minRadiusAt = 0;
for (let i = 1; i < N; i++) {
  const u = i / N;
  const uPrev = Math.max(0.0001, u - 0.0004);
  const uNext = Math.min(0.9999, u + 0.0004);
  const dTheta = curve.getTangentAt(uPrev).angleTo(curve.getTangentAt(uNext));
  const arcDs = (uNext - uPrev) * totalLength;
  if (dTheta < 1e-9) continue; // effectively straight here
  const radius = arcDs / dTheta;
  if (radius < minRadius) {
    minRadius = radius;
    minRadiusAt = u * totalLength;
  }
}

console.log('\n--- verification (actual interpolated curve, not construction params) ---');
console.log(`Total length: ${totalLength.toFixed(1)}m (target ~${TARGET_LENGTH}m)`);
console.log(
  `Minimum radius of curvature: ${minRadius.toFixed(1)}m at length ${minRadiusAt.toFixed(1)}m ` +
    `(required >=${MIN_RADIUS_REQUIRED}m) -> ${minRadius >= MIN_RADIUS_REQUIRED ? 'PASS' : 'FAIL'}`,
);

if (minRadius < MIN_RADIUS_REQUIRED) {
  process.exitCode = 1;
}
