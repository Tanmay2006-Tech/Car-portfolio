import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { carPose } from './carPose'
import { scroll } from './scrollState'
import { srgb, DAWN_HIGH, DAWN_LOW } from './colors'

// The drive is the sunrise. The car sat overnight (CLAUDE.md section 2:
// "Dawn, rather than generic pastel, because the car starts cold"), so the
// landing page opens in the last of the pre-dawn — a lilac sky over a rose
// horizon, low weak sun — and the light comes up as the car runs the route:
// the exact --dawn-high / --dawn-low tokens by the time the projects pass,
// clear early morning by the time it parks. Shadows shorten as the sun
// climbs. Every colour stays pastel; the car is still the only saturated
// thing until leg 4's risk layer.
//
// One mutable object, written here every frame and read by Sky, SunRig and
// the DOM column pane — same pattern as scrollState/carPose.

interface Key {
  t: number
  top: string
  horizon: string
  sun: string
  intensity: number
  elevationDeg: number
}

const KEYS: Key[] = [
  { t: 0, top: '#8f9cc2', horizon: '#efc6bd', sun: '#f5ad8f', intensity: 2.3, elevationDeg: 6 },
  { t: 0.3, top: DAWN_HIGH, horizon: DAWN_LOW, sun: '#f9cfaa', intensity: 3.3, elevationDeg: 13 },
  { t: 0.7, top: '#a3c3df', horizon: '#f8e2cb', sun: '#fbdcbc', intensity: 3.7, elevationDeg: 19 },
  { t: 1, top: '#9fc4e4', horizon: '#f9eadb', sun: '#fde6cf', intensity: 3.9, elevationDeg: 24 },
]
const KEY_COLORS = KEYS.map((k) => ({ top: srgb(k.top), horizon: srgb(k.horizon), sun: srgb(k.sun) }))

export const dawn = {
  t: 0,
  top: srgb(KEYS[0].top),
  horizon: srgb(KEYS[0].horizon),
  sunColor: srgb(KEYS[0].sun),
  sunIntensity: KEYS[0].intensity,
  sunElevationDeg: KEYS[0].elevationDeg,
  // sRGB hex of the horizon, for the DOM.
  horizonCss: KEYS[0].horizon,
}

function sample(t: number) {
  let i = 1
  while (i < KEYS.length - 1 && t > KEYS[i].t) i++
  const a = KEYS[i - 1]
  const b = KEYS[i]
  const k = THREE.MathUtils.smoothstep(t, a.t, b.t)
  dawn.top.lerpColors(KEY_COLORS[i - 1].top, KEY_COLORS[i].top, k)
  dawn.horizon.lerpColors(KEY_COLORS[i - 1].horizon, KEY_COLORS[i].horizon, k)
  dawn.sunColor.lerpColors(KEY_COLORS[i - 1].sun, KEY_COLORS[i].sun, k)
  dawn.sunIntensity = THREE.MathUtils.lerp(a.intensity, b.intensity, k)
  dawn.sunElevationDeg = THREE.MathUtils.lerp(a.elevationDeg, b.elevationDeg, k)
}

// Time of day from where the drive is: the hero holds pre-dawn, the cold
// start brings up the first light, and the route carries the rest.
function timeOfDay(): number {
  if (scroll.phase === 'hero') return 0
  if (scroll.phase === 'coldstart') return 0.12 * scroll.phaseProgress
  return 0.12 + 0.88 * carPose.routeP
}

const scratch = new THREE.Color()

let lastCss = ''

export function DawnCycle() {
  const scene = useThree((state) => state.scene)

  useFrame(() => {
    // Eased toward its target so a jump in scroll never snaps the sky.
    dawn.t += (timeOfDay() - dawn.t) * 0.08
    sample(dawn.t)
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(dawn.horizon)

    // The DOM column pane takes the horizon tint too. Only touch the style
    // when the visible value actually changes.
    const css = '#' + scratch.copy(dawn.horizon).getHexString(THREE.SRGBColorSpace)
    if (css !== lastCss) {
      lastCss = css
      dawn.horizonCss = css
      document.documentElement.style.setProperty('--sky-horizon', css)
    }
  })
  return null
}

// Seeded once so the first frame matches the hero, not the token defaults.
sample(0)
