import { useMemo } from 'react'
import * as THREE from 'three'

import { ROAD_WIDTH, ROUTE_CURVE } from './curve'
import { ASPHALT, srgb } from './colors'

const SEGMENTS = 400
const UP = new THREE.Vector3(0, 1, 0)

// Extrudes a flat ribbon along the route curve. Deliberately not using
// THREE's Frenet frames (getTangentAt + a rotation-minimising frame) — for
// a curve that never leaves the ground plane, `up.cross(tangent)` gives the
// road's sideways axis directly with no risk of the frame twisting.
function buildRibbonGeometry(curve: THREE.CatmullRomCurve3, width: number, segments: number) {
  const half = width / 2
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const right = new THREE.Vector3()

  for (let i = 0; i <= segments; i++) {
    const u = THREE.MathUtils.clamp(i / segments, 0.0001, 0.9999)
    const point = curve.getPointAt(u)
    const tangent = curve.getTangentAt(u).normalize()
    right.crossVectors(UP, tangent).normalize()

    const left = point.clone().sub(right.clone().multiplyScalar(half))
    const rightEdge = point.clone().add(right.clone().multiplyScalar(half))

    // Sits just above the verge (y=0) so it doesn't z-fight the ground plane.
    positions.push(left.x, left.y + 0.01, left.z)
    positions.push(rightEdge.x, rightEdge.y + 0.01, rightEdge.z)
    uvs.push(0, u)
    uvs.push(1, u)

    if (i > 0) {
      const a = (i - 1) * 2
      const b = a + 1
      const c = i * 2
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function RoadRibbon() {
  const geometry = useMemo(() => buildRibbonGeometry(ROUTE_CURVE, ROAD_WIDTH, SEGMENTS), [])
  const color = useMemo(() => srgb(ASPHALT), [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.92} side={THREE.DoubleSide} />
    </mesh>
  )
}
