import { useMemo } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'

import { srgb } from './colors'
import { SUN_AZIMUTH_DEG } from './SunRig'

// The car's reflections and ambient fill, generated from the scene's own
// sunrise instead of a downloaded photograph. The old HDRI (a Venice
// sunset) put a stranger's skyline into the paint and never matched the
// indigo-to-apricot sky; this renders a small cube map once at load:
//
//   dome      indigo overhead, violet band, apricot horizon, dark ground —
//             the same three bands the visible sky uses (Sky.tsx)
//   fill      a broad warm panel opposite the sun, plus a glowing belt
//             all round the horizon
//   sun       a hot strip on the horizon at the sun's own azimuth, so the
//             brightest reflection on the car lines up with the key light
//   softbox   a cool panel overhead — the long highlight across the roof
//   strips    two long, thin side lights: the clean streaks along the
//             flanks that read as professional car photography
//
// Rendered once (frames={1}): the sky's slow colour change over the drive
// doesn't need to re-render reflections every frame.

const domeVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const domeFragment = /* glsl */ `
  uniform vec3 top;
  uniform vec3 mid;
  uniform vec3 horizon;
  uniform vec3 ground;
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 c = mix(horizon, mid, smoothstep(0.0, 0.18, h));
    c = mix(c, top, smoothstep(0.12, 0.7, h));
    c = mix(c, ground, smoothstep(0.0, -0.12, h));
    gl_FragColor = vec4(c, 1.0);
  }
`

const SUN_DIR = (() => {
  const az = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG)
  return new THREE.Vector3(Math.cos(az), 0.14, Math.sin(az)).normalize()
})()

export function SunriseEnvironment() {
  const uniforms = useMemo(
    () => ({
      top: { value: srgb('#18204a') },
      mid: { value: srgb('#5e3f7d') },
      horizon: { value: srgb('#f59e5e') },
      ground: { value: srgb('#1b2430') },
    }),
    [],
  )
  const sunPos = SUN_DIR.clone().multiplyScalar(14).toArray() as [number, number, number]
  const oppositePos = SUN_DIR.clone().multiplyScalar(-14).setY(1.4).toArray() as [number, number, number]

  return (
    <Environment resolution={256} frames={1} environmentIntensity={0.35}>
      <mesh scale={40}>
        <sphereGeometry args={[1, 48, 24]} />
        <shaderMaterial uniforms={uniforms} vertexShader={domeVertex} fragmentShader={domeFragment} side={THREE.BackSide} />
      </mesh>
      <Lightformer form="rect" color="#ffb070" intensity={7} position={sunPos} scale={[14, 1.6, 1]} target={[0, 0, 0]} />
      {/* Broad soft fill opposite the sun: the front of the car in the hero
          shot faces away from the key light, and this is what keeps it
          from going dark. */}
      <Lightformer form="rect" color="#f6b383" intensity={1.8} position={oppositePos} scale={[18, 7, 1]} target={[0, 0.6, 0]} />
      {/* A warm belt all round the horizon, the glow the visible sky has. */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2 + Math.PI / 4
        return (
          <Lightformer
            key={i}
            form="rect"
            color="#f49a5e"
            intensity={1.1}
            position={[Math.cos(a) * 16, 1.2, Math.sin(a) * 16]}
            scale={[24, 3.5, 1]}
            target={[0, 1.2, 0]}
          />
        )
      })}
      <Lightformer form="rect" color="#9fb0e8" intensity={1.1} position={[0, 9, 0]} scale={[10, 6, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" color="#fff1e2" intensity={2.2} position={[0, 2.4, 9]} scale={[22, 0.35, 1]} target={[0, 0.8, 0]} />
      <Lightformer form="rect" color="#fff1e2" intensity={2.2} position={[0, 2.4, -9]} scale={[22, 0.35, 1]} target={[0, 0.8, 0]} />
    </Environment>
  )
}
