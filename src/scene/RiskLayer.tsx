import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { ROUTE_CURVE, ROAD_WIDTH } from './curve'
import { carPose } from './carPose'
import { srgb } from './colors'
import { ROUTE_LENGTH_M, RISK_START_M, RISK_END_M } from './routeMarks'

// Leg 4 (CLAUDE.md section 1): the road surface becomes the risk layer
// GridSense and RiskPath output — the car driving over the data it was
// trained to read. The ONLY saturated colour in the environment.
//
// One state, revealed once: a static severity field over a grid of road
// cells, uncovered a few metres ahead of the car as it drives in. No
// animated flow. Lazy-loaded (App.tsx) — not fetched until leg 4 is near.

const SEGMENTS = 260
const UP = new THREE.Vector3(0, 1, 0)
// How far ahead of the car the reveal front runs, and how soft it is.
const REVEAL_LEAD_M = 26
const REVEAL_SOFT_M = 10
// Heat ramp, low to high severity. Deliberately orange-leaning at the top
// rather than --guards red, so the car's paint stays its own colour.
const RISK_LOW = '#f2b33d'
const RISK_MID = '#ea6a24'
const RISK_HIGH = '#c2301a'

function buildGeometry() {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const right = new THREE.Vector3()
  const half = ROAD_WIDTH / 2
  for (let i = 0; i <= SEGMENTS; i++) {
    const d = RISK_START_M + ((RISK_END_M - RISK_START_M) * i) / SEGMENTS
    const u = THREE.MathUtils.clamp(d / ROUTE_LENGTH_M, 0.0001, 0.9999)
    const p = ROUTE_CURVE.getPointAt(u)
    const t = ROUTE_CURVE.getTangentAt(u).normalize()
    right.crossVectors(UP, t).normalize()
    positions.push(p.x - right.x * half, 0.016, p.z - right.z * half)
    positions.push(p.x + right.x * half, 0.016, p.z + right.z * half)
    // x: 0-1 across the road, y: metres along the route
    uvs.push(0, d, 1, d)
    if (i > 0) {
      const a = (i - 1) * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeBoundingSphere()
  return g
}

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec2 vRoad;
  void main() {
    vRoad = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

// Severity per cell: two octaves of value noise (clustered hotspots, the
// way real incident density clusters at junctions) plus a little per-cell
// variation. Colour ramp is a heat scale, amber to deep red-orange; the
// lowest band stays transparent so plain asphalt shows between hotspots.
const fragmentShader = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uReveal;
  uniform float uStart;
  uniform float uEnd;
  uniform vec3 uLow;
  uniform vec3 uMid;
  uniform vec3 uHigh;
  varying vec2 vRoad;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec2 cellSize = vec2(0.2, 1.6);               // 5 cells across, 1.6m long
    vec2 cell = floor(vRoad / cellSize);
    vec2 inCell = fract(vRoad / cellSize);
    vec2 c = (cell + 0.5) * cellSize;

    float field = noise(vec2(c.x * 1.5, c.y / 22.0)) * 0.65 + noise(vec2(c.x * 3.0 + 7.0, c.y / 9.0)) * 0.35;
    float sev = clamp(field * 1.15 + (hash(cell) - 0.5) * 0.18, 0.0, 1.0);

    vec3 col = sev < 0.66 ? mix(uLow, uMid, smoothstep(0.52, 0.66, sev)) : mix(uMid, uHigh, smoothstep(0.66, 0.8, sev));
    // Only the upper half of the field is drawn, and low-severity cells
    // stay translucent — plain asphalt carries most of the road.
    float a = smoothstep(0.5, 0.54, sev) * mix(0.78, 0.96, smoothstep(0.54, 0.78, sev));

    // Thin gaps between cells so it reads as a grid of measurements.
    vec2 edge = min(inCell, 1.0 - inCell) * cellSize / vec2(0.2 * 0.2, 0.2);
    a *= smoothstep(0.0, 0.35, min(edge.x, edge.y));

    // Reveal front ahead of the car, and soft ends to the stretch.
    a *= 1.0 - smoothstep(uReveal - ${REVEAL_SOFT_M.toFixed(1)}, uReveal, vRoad.y);
    a *= smoothstep(uStart, uStart + 12.0, vRoad.y) * (1.0 - smoothstep(uEnd - 12.0, uEnd, vRoad.y));

    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

export default function RiskLayer() {
  const geometry = useMemo(buildGeometry, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uReveal: { value: 0 },
            uStart: { value: RISK_START_M },
            uEnd: { value: RISK_END_M },
            uLow: { value: srgb(RISK_LOW) },
            uMid: { value: srgb(RISK_MID) },
            uHigh: { value: srgb(RISK_HIGH) },
          },
        ]),
        fog: true,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [],
  )

  useFrame(() => {
    // carPose.progress is the car's actual curve position (already the
    // braking-remapped one in leg 5), so the reveal tracks the wheels.
    material.uniforms.uReveal.value = carPose.progress * ROUTE_LENGTH_M + REVEAL_LEAD_M
  })

  return <mesh geometry={geometry} material={material} renderOrder={2} />
}
