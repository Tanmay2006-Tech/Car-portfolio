import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { carPose } from './carPose'
import { scroll } from './scrollState'
import { srgb } from './colors'

// The drive is the sunrise. The car sat overnight, so the landing page
// opens in the minute before the sun comes up — indigo sky, a violet band,
// an apricot horizon, the last stars — and the light comes up as the car
// runs the route: gold by the middle legs, early-morning blue by the time
// it parks. Shadows shorten as the sun climbs.
//
// One mutable object, written here every frame and read by Sky, SunRig and
// the DOM column pane — same pattern as scrollState/carPose.

interface Key {
  t: number
  top: string
  mid: string
  horizon: string
  stars: number
  sun: string
  intensity: number
  elevationDeg: number
}

// Night-into-sunrise: indigo overhead, a violet band, a glowing apricot
// horizon, a few last stars. As the drive goes on the sun clears the
// horizon and the sky warms through gold to an early-morning blue.
const KEYS: Key[] = [
  { t: 0, top: '#0f1433', mid: '#4a3470', horizon: '#f08a52', stars: 1, sun: '#ff9a5c', intensity: 2.8, elevationDeg: 5 },
  { t: 0.3, top: '#18204a', mid: '#5e3f7d', horizon: '#f59e5e', stars: 0.55, sun: '#ffac6a', intensity: 3.3, elevationDeg: 9 },
  { t: 0.7, top: '#24356a', mid: '#8a5a84', horizon: '#f8b872', stars: 0.15, sun: '#ffc283', intensity: 3.7, elevationDeg: 15 },
  { t: 1, top: '#34558e', mid: '#b07a86', horizon: '#fbcd8e', stars: 0, sun: '#ffd8a4', intensity: 4, elevationDeg: 22 },
]
const KEY_COLORS = KEYS.map((k) => ({ top: srgb(k.top), mid: srgb(k.mid), horizon: srgb(k.horizon), sun: srgb(k.sun) }))

export const dawn = {
  t: 0,
  top: srgb(KEYS[0].top),
  mid: srgb(KEYS[0].mid),
  horizon: srgb(KEYS[0].horizon),
  stars: KEYS[0].stars,
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
  dawn.mid.lerpColors(KEY_COLORS[i - 1].mid, KEY_COLORS[i].mid, k)
  dawn.horizon.lerpColors(KEY_COLORS[i - 1].horizon, KEY_COLORS[i].horizon, k)
  dawn.stars = THREE.MathUtils.lerp(a.stars, b.stars, k)
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
