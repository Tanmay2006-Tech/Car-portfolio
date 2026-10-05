import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three-stdlib'

import { ROUTE_CURVE, ROAD_WIDTH } from './curve'
import { srgb } from './colors'
import {
  ROUTE_LENGTH_M,
  ROADSIDE_OFFSET,
  projectMarkerDistance,
  servicePostDistance,
} from './routeMarks'
import { ROAD_PROJECTS, EXPERIENCE } from '../content'
import { IS_MOBILE } from '../env'

// Roadside world (CLAUDE.md section 6: "keep the forms abstract — simple
// pastel volumes read as intentional"). Three layers, all instanced:
//
//   avenue    lollipop and poplar trees at a steady rhythm on both verges —
//             the regular beat is the point: it reads as a designed road,
//             and it's a second speed cue alongside the lane markings
//   blocks    rounded pastel buildings set back from the road in rows
//             squared to it, like a town seen from a bypass
//   hills     soft, low domes on the horizon that the fog swallows
//
// Every colour is a pastel tint; nothing competes with the car or leg 4.

const UP = new THREE.Vector3(0, 1, 0)

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ROUTE_SAMPLES = Array.from({ length: 241 }, (_, k) => ROUTE_CURVE.getPointAt(k / 240))
function clearOfRoad(p: THREE.Vector3, margin: number) {
  const r2 = (ROAD_WIDTH / 2 + margin) ** 2
  for (const q of ROUTE_SAMPLES) if (q.distanceToSquared(p) < r2) return false
  return true
}

function frameAt(distance: number) {
  const u = THREE.MathUtils.clamp(distance / ROUTE_LENGTH_M, 0.0001, 0.9999)
  const point = ROUTE_CURVE.getPointAt(u)
  const tangent = ROUTE_CURVE.getTangentAt(u).normalize()
  const right = new THREE.Vector3().crossVectors(UP, tangent).normalize()
  return { point, tangent, right }
}

// Places on the "right" verge (crossVectors(UP, tangent)) that hold signs:
// leg 1's project boards and leg 3's numbered posts. Trees stay clear so
// every label reads against open sky.
const SIGNS = [
  ...ROAD_PROJECTS.map((_, i) => projectMarkerDistance(i)),
  ...EXPERIENCE.map((_, i) => servicePostDistance(i)),
]
const nearSign = (d: number, side: number) => side > 0 && SIGNS.some((s) => Math.abs(s - d) < 11)

const CROWN_TINTS = ['#a9c8b1', '#9ec0a9', '#bfd5bb', '#b4cfc4', '#e6c9d2', '#c9d9b8']
const BLOCK_TINTS = ['#e8d9d3', '#d9dfe8', '#efe1cf', '#d5e2d8', '#e4d6e2', '#cfdbe6', '#f1e6dc']
const HILL_TINTS = ['#b9cfc3', '#c3d3cd', '#b2c8c4', '#c8d6cf']
const TRUNK = '#8e8189'

type Item = { position: THREE.Vector3; scale: THREE.Vector3; yaw: number; color: THREE.Color }

function useAvenue() {
  return useMemo(() => {
    const rand = mulberry32(7)
    const trunks: Item[] = []
    const crowns: Item[] = []
    const spacing = IS_MOBILE ? 22 : 15
    for (let d = 10; d < ROUTE_LENGTH_M - 4; d += spacing) {
      for (const side of [-1, 1]) {
        if (nearSign(d, side)) continue
        const along = d + (side > 0 ? spacing / 2 : 0)
        const { point, tangent, right } = frameAt(along)
        const offset = ROADSIDE_OFFSET + 2.6 + rand() * 1.2
        const base = point.clone().addScaledVector(right, side * offset)
        if (!clearOfRoad(base, 3)) continue
        const poplar = rand() < 0.35
        const trunkH = poplar ? 1.2 + rand() * 0.6 : 1.6 + rand() * 0.8
        const yaw = Math.atan2(tangent.x, tangent.z)
        trunks.push({
          position: new THREE.Vector3(base.x, trunkH / 2, base.z),
          scale: new THREE.Vector3(0.13, trunkH, 0.13),
          yaw,
          color: srgb(TRUNK),
        })
        const r = poplar ? 0.85 + rand() * 0.25 : 1.05 + rand() * 0.45
        const sy = poplar ? r * 2.6 : r * 0.95
        crowns.push({
          position: new THREE.Vector3(base.x, trunkH + sy * 0.82, base.z),
          scale: new THREE.Vector3(r, sy, r),
          yaw,
          color: srgb(CROWN_TINTS[Math.floor(rand() * CROWN_TINTS.length)]),
        })
      }
    }
    return { trunks, crowns }
  }, [])
}

function useBlocks() {
  return useMemo(() => {
    const rand = mulberry32(23)
    const out: Item[] = []
    const rows = IS_MOBILE ? 26 : 60
    for (let n = 0; n < rows; n++) {
      // A short row of 2-4 buildings squared to the road, set well back.
      const d = 30 + rand() * (ROUTE_LENGTH_M - 40)
      const side = rand() < 0.5 ? -1 : 1
      const { point, tangent, right } = frameAt(d)
      // Behind leg 1's boards, push the town well back so each sign reads
      // against open sky rather than a wall.
      const behindBoards = side > 0 && d > projectMarkerDistance(0) - 30 && d < projectMarkerDistance(ROAD_PROJECTS.length - 1) + 30
      const setback = (behindBoards ? 70 : 24) + rand() * 45
      const count = 2 + Math.floor(rand() * 3)
      const yaw = Math.atan2(tangent.x, tangent.z)
      let along = 0
      for (let i = 0; i < count; i++) {
        const w = 4 + rand() * 5
        const depth = 4 + rand() * 5
        const h = 3 + Math.pow(rand(), 1.5) * 11
        const centre = point
          .clone()
          .addScaledVector(right, side * (setback + depth / 2))
          .addScaledVector(tangent, along + w / 2)
        along += w + 1.2 + rand() * 2
        if (!clearOfRoad(centre, 14)) continue
        out.push({
          position: new THREE.Vector3(centre.x, h / 2, centre.z),
          scale: new THREE.Vector3(depth, h, w),
          yaw,
          color: srgb(BLOCK_TINTS[Math.floor(rand() * BLOCK_TINTS.length)]),
        })
      }
    }
    return out
  }, [])
}

function useHills() {
  return useMemo(() => {
    const rand = mulberry32(41)
    const out: Item[] = []
    for (let n = 0; n < 18; n++) {
      const d = (n / 18) * ROUTE_LENGTH_M + rand() * 40
      const side = n % 2 === 0 ? -1 : 1
      const { point, right } = frameAt(d)
      const p = point.clone().addScaledVector(right, side * (150 + rand() * 120))
      const w = 70 + rand() * 90
      out.push({
        position: new THREE.Vector3(p.x, -2, p.z),
        scale: new THREE.Vector3(w, 10 + rand() * 16, w * (0.6 + rand() * 0.5)),
        yaw: rand() * Math.PI,
        color: srgb(HILL_TINTS[Math.floor(rand() * HILL_TINTS.length)]),
      })
    }
    return out
  }, [])
}

function Instances({
  items,
  geometry,
  castShadow = false,
  emissive = 0.14,
  roughness = 0.92,
}: {
  items: Item[]
  geometry: THREE.BufferGeometry
  castShadow?: boolean
  emissive?: number
  roughness?: number
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    items.forEach((item, i) => {
      q.setFromAxisAngle(UP, item.yaw)
      m.compose(item.position, q, item.scale)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, item.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])

  return (
    // No shadows either way: SunRig's shadow camera only spans a few metres
    // around the car, so scenery 9m+ off the road can never cast into it or
    // receive from it — rendering it into the shadow pass was pure cost
    // (measured: ~10fps on this machine).
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow={castShadow} receiveShadow={false}>
      {/* Self-light toward white lifts the faces turned away from the low
          sun, which otherwise go a heavy grey-navy darker than anything in
          the palette — everything stays pastel from every angle. */}
      <meshStandardMaterial roughness={roughness} emissive="#fff6ee" emissiveIntensity={emissive} />
    </instancedMesh>
  )
}

export function Scenery() {
  const { trunks, crowns } = useAvenue()
  const blocks = useBlocks()
  const hills = useHills()
  const geometries = useMemo(
    () => ({
      trunk: new THREE.CylinderGeometry(1, 1, 1, 8),
      crown: new THREE.SphereGeometry(1, 16, 10),
      block: new RoundedBoxGeometry(1, 1, 1, 2, 0.06),
      hill: new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    }),
    [],
  )

  return (
    <>
      <Instances items={trunks} geometry={geometries.trunk} emissive={0.06} />
      <Instances items={crowns} geometry={geometries.crown} emissive={0.16} roughness={0.85} />
      <Instances items={blocks} geometry={geometries.block} emissive={0.14} />
      <Instances items={hills} geometry={geometries.hill} emissive={0.12} roughness={1} />
    </>
  )
}
