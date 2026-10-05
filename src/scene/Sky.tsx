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
  uniform vec3 midColor;
  uniform vec3 bottomColor;
  uniform vec3 sunColor;
  uniform float stars;
  uniform vec3 sunDir;
  uniform float offset;
  uniform float exponent;
  varying vec3 vWorldPosition;
  void main() {
    vec3 dir = normalize(vWorldPosition + vec3(0.0, offset, 0.0));
    float h = dir.y;
    // Three bands: apricot horizon, a violet belt, indigo overhead.
    float hh = max(h, 0.0);
    vec3 sky = mix(bottomColor, midColor, smoothstep(0.0, 0.16, hh));
    sky = mix(sky, topColor, smoothstep(0.1, 0.62, hh));
    // The last stars, fading as the sun comes up. Hashed on a direction
    // grid, so they hold still as the camera moves.
    vec3 sd = normalize(vWorldPosition);
    vec2 g = vec2(atan(sd.z, sd.x), asin(sd.y)) * 380.0;
    vec2 cell = floor(g);
    float rnd = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    // A small round point inside the cell, not the whole cell.
    float dotShape = smoothstep(0.22, 0.04, length(fract(g) - 0.5));
    float star = step(0.996, rnd) * dotShape * smoothstep(0.2, 0.55, hh) * stars;
    sky += vec3(star * (0.55 + 0.45 * fract(rnd * 97.0)));
    // Low sun: a soft disc and a wide warm glow along the horizon on its
    // side of the sky. Pale, not bright — the sky stays pastel.
    float d = max(dot(normalize(vWorldPosition), sunDir), 0.0);
    sky = mix(sky, sunColor, pow(d, 5.0) * 0.55);
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
      midColor: { value: dawn.mid },
      stars: { value: dawn.stars },
      bottomColor: { value: dawn.horizon },
      sunColor: { value: dawn.sunColor },
      sunDir: { value: new THREE.Vector3() },
      offset: { value: 20 },
      exponent: { value: 0.6 },
    }),
    [],
  )
  useFrame(() => {
    uniforms.stars.value = dawn.stars
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
