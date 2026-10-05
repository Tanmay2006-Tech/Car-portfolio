import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { ROUTE_CURVE, ROAD_WIDTH } from './curve'
import { DAWN_HIGH, DAWN_LOW, VERGE, ASPHALT, srgb } from './colors'
import { ROUTE_LENGTH_M, MARKER_FIRST_M, MARKER_SPACING_M } from './routeMarks'
import { IS_MOBILE } from '../env'

// Roadside scenery (CLAUDE.md section 6): simple pastel volumes, one
// InstancedMesh per shape, scattered along the route. Abstract on purpose —
// "simple pastel volumes read as intentional, low-poly buildings read as
// under-budget." Every colour is a palette token or a tint of one; none of
// them are saturated, which keeps leg 4's risk layer the only hot thing.

const COUNT = IS_MOBILE ? 140 : 360
const UP = new THREE.Vector3(0, 1, 0)

// Deterministic, so the world is the same on every load.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TINTS = [DAWN_HIGH, DAWN_LOW, VERGE, ASPHALT, '#e4d6e2', '#c9dbe6']

// Leg 1's far side holds the project markers; keep scenery out of the strip
// right behind them so each label reads against open sky.
const LEG1_CLEAR_START = MARKER_FIRST_M - 25
const LEG1_CLEAR_END = MARKER_FIRST_M + 4 * MARKER_SPACING_M + 25

function useScatter(seed: number, count: number) {
  return useMemo(() => {
    const rand = mulberry32(seed)
    const out: { position: THREE.Vector3; scale: THREE.Vector3; rotation: number; color: THREE.Color }[] = []
    const right = new THREE.Vector3()
    while (out.length < count) {
      const d = rand() * ROUTE_LENGTH_M
      const u = THREE.MathUtils.clamp(d / ROUTE_LENGTH_M, 0.0001, 0.9999)
      const side = rand() < 0.5 ? -1 : 1
      const offset = ROAD_WIDTH / 2 + 16 + Math.pow(rand(), 1.4) * 80
      if (side < 0 && d > LEG1_CLEAR_START && d < LEG1_CLEAR_END && offset < 40) continue
      const point = ROUTE_CURVE.getPointAt(u)
      const tangent = ROUTE_CURVE.getTangentAt(u)
      right.crossVectors(UP, tangent).normalize()
      const position = point.clone().addScaledVector(right, -side * offset)
      // Never on the road anywhere: the meander doubles back near itself,
      // so check distance to a coarse sample of the whole curve.
      let clear = true
      for (let k = 0; k <= 120 && clear; k++) {
        const q = ROUTE_CURVE.getPointAt(k / 120)
        if (q.distanceToSquared(position) < (ROAD_WIDTH / 2 + 6) ** 2) clear = false
      }
      if (!clear) continue
      const h = 1.5 + rand() * rand() * 9
      const w = 1.2 + rand() * 4
      out.push({
        position,
        scale: new THREE.Vector3(w, h, 1.2 + rand() * 4),
        rotation: rand() * Math.PI,
        color: srgb(TINTS[Math.floor(rand() * TINTS.length)]),
      })
    }
    return out
  }, [seed, count])
}

function Volumes({ seed, count, kind }: { seed: number; count: number; kind: 'box' | 'cylinder' }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const items = useScatter(seed, count)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    items.forEach((item, i) => {
      q.setFromAxisAngle(UP, item.rotation)
      const s = kind === 'cylinder' ? new THREE.Vector3(item.scale.x * 0.5, item.scale.y, item.scale.x * 0.5) : item.scale
      p.set(item.position.x, s.y / 2, item.position.z)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, item.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items, kind])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      {kind === 'box' ? <boxGeometry args={[1, 1, 1]} /> : <cylinderGeometry args={[1, 1, 1, 20]} />}
      {/* A little self-light lifts the faces turned away from the low sun,
          which otherwise go a heavy navy that reads darker than anything
          in the palette. */}
      <meshStandardMaterial roughness={0.95} emissive="#3a3440" emissiveIntensity={0.55} />
    </instancedMesh>
  )
}

export function Scenery() {
  return (
    <>
      <Volumes seed={11} count={Math.round(COUNT * 0.7)} kind="box" />
      <Volumes seed={29} count={Math.round(COUNT * 0.3)} kind="cylinder" />
    </>
  )
}
