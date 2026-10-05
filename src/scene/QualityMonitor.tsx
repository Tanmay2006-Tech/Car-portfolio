import { useFrame } from '@react-three/fiber'

import { scroll } from './scrollState'
import { FINAL_HOLD_P } from './cameraShots'
import { useQuality } from './quality'

// "Stationary" here means "the CAMERA has genuinely stopped moving" —
// which is narrower than "the car isn't driving". The car is parked for
// all of the hero and cold-start budgets, but the camera itself keeps
// swinging HERO -> CHASE the entire way through cold start
// (ChaseCamera.tsx), so spending extra render cost there just made a
// moving shot look choppy at ~37fps instead of smooth at ~55+ (caught by
// actually looking at the cold-start screenshots, not by reasoning about
// it). Route leg 0 has the same problem: the car is already accelerating
// there, so LEG_START[1] doesn't describe a still camera either — it
// never did, this flag was just never exercised by anything that moved
// the camera continuously until the cold-start rework added one.
//
// The only two moments the camera is truly static: the hero phase itself
// (held on HERO the whole way, CLAUDE.md section 1 phase A), and the very
// end of the route once DOOR_PUSH is fully held (cameraShots.ts's
// FINAL_HOLD_P) — leg 5 up to that point still swings through DOOR_SWING.
//
// Read via getState()/setState() rather than the hook, and only called
// when the value actually flips — this runs inside useFrame, so
// subscribing here would re-render on every scroll tick, exactly what
// CLAUDE.md section 5's "never setState during scroll" rules out.
export function QualityMonitor() {
  useFrame(() => {
    const stationary = scroll.phase === 'hero' || (scroll.phase === 'route' && scroll.routeP >= FINAL_HOLD_P)
    if (stationary !== useQuality.getState().isStationary) {
      useQuality.getState().setStationary(stationary)
    }
  })
  return null
}
