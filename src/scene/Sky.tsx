import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { dawn } from './DawnCycle'
import { SUN_AZIMUTH_DEG } from './SunRig'

// scene.background only accepts a flat colour or a texture, not a
// procedural gradient, so the dawn-high -> dawn-low sky is a large
// BackSide sphere with a vertical-gradient shader instead. Colours are
// converted through the same srgb() helper as everything else — a shader
// uniform is just as capable of skipping sRGB->linear as a material.color
// assignment is.
const vertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// topColor/bottomColor arrive as LINEAR values (srgb() converts sRGB hex ->
// three.js's linear working space, same as every other material in this
// scene) — but a bespoke ShaderMaterial doesn't get three.js's usual
// linear-working-space -> sRGB-output conversion for free. Built-in
// materials (MeshStandardMaterial etc.) get it because their own shader
// source explicitly includes `#include <colorspace_fragment>`; a fully
// custom shader has to include it too, or the linear value goes straight to
// the framebuffer unconverted and everything renders too dark/muted.
// (`toneMapped={false}` on the material does NOT fix this — that flag only
// controls whether the *tonemapping* chunk gets included, a separate
// concern from colour-space encoding, and this shader never included
// either chunk regardless of that flag's value.)
const fragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform vec3 sunColor;
  uniform vec3 sunDir;
  uniform float offset;
  uniform float exponent;
  varying vec3 vWorldPosition;
  void main() {
    vec3 dir = normalize(vWorldPosition + vec3(0.0, offset, 0.0));
    float h = dir.y;
    vec3 sky = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
    // Low sun: a soft disc and a wide warm glow along the horizon on its
    // side of the sky. Pale, not bright — the sky stays pastel.
    float d = max(dot(normalize(vWorldPosition), sunDir), 0.0);
    sky = mix(sky, sunColor, pow(d, 6.0) * 0.45);
    sky = mix(sky, vec3(1.0, 0.97, 0.92), smoothstep(0.9993, 0.9997, d) * 0.85);
    gl_FragColor = vec4(sky, 1.0);
    #include <colorspace_fragment>
  }
`

export function Sky() {
  // The colour uniforms ARE DawnCycle's colour objects, mutated in place,
  // so the sky follows the sunrise with no per-frame copying.
  const uniforms = useMemo(
    () => ({
      topColor: { value: dawn.top },
      bottomColor: { value: dawn.horizon },
      sunColor: { value: dawn.sunColor },
      sunDir: { value: new THREE.Vector3() },
      offset: { value: 20 },
      exponent: { value: 0.6 },
    }),
    [],
  )
  useFrame(() => {
    const el = THREE.MathUtils.degToRad(dawn.sunElevationDeg)
    const az = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG)
    uniforms.sunDir.value.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el))
  })

  return (
    <mesh scale={500}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  )
}
