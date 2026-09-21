import { useFrame } from '@react-three/fiber'

import { scroll } from './scrollState'
import { LEG_START } from './legs'
import { useQuality } from './quality'

// LEG_START[1] / LEG_START[5]: leg 0 and leg 5 are the only stationary legs
// (src/scene/legs.ts). Read via getState()/setState() rather than the hook,
// and only called when the value actually flips — this runs inside
// useFrame, so subscribing here would re-render on every scroll tick,
// exactly what CLAUDE.md section 5's "never setState during scroll" rules
// out.
export function QualityMonitor() {
  useFrame(() => {
    const p = scroll.progress
    const stationary = p < LEG_START[1] || p >= LEG_START[5]
    if (stationary !== useQuality.getState().isStationary) {
      useQuality.getState().setStationary(stationary)
    }
  })
  return null
}
