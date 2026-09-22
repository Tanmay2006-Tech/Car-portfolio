import { useFrame } from '@react-three/fiber'

import { scroll } from './scrollState'
import { LEG_START } from './legs'
import { useQuality } from './quality'

// The car is stationary during the entire hero and cold-start budgets
// (CLAUDE.md section 1 — it doesn't move until scroll.phase is 'route'),
// and, once driving, LEG_START[1]/LEG_START[5]: leg 0 and leg 5 are the
// only stationary legs of the route itself (src/scene/legs.ts). Checked
// against scroll.routeP, not scroll.progress — routeP is the 0-1 fraction
// of the ROUTE_PX budget specifically; scroll.progress is now a fraction
// of the WHOLE page (hero+coldstart+route combined) and would compare
// LEG_START's route-relative thresholds against the wrong scale entirely.
//
// Read via getState()/setState() rather than the hook, and only called
// when the value actually flips — this runs inside useFrame, so
// subscribing here would re-render on every scroll tick, exactly what
// CLAUDE.md section 5's "never setState during scroll" rules out.
export function QualityMonitor() {
  useFrame(() => {
    const stationary =
      scroll.phase !== 'route' || scroll.routeP < LEG_START[1] || scroll.routeP >= LEG_START[5]
    if (stationary !== useQuality.getState().isStationary) {
      useQuality.getState().setStationary(stationary)
    }
  })
  return null
}
