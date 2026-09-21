import { OPENING_STRAIGHT_M, ROUTE_CURVE } from './curve'

// Where each leg of CLAUDE.md section 1's route map starts, as scroll.progress
// (0-1 along ROUTE_CURVE). PROVISIONAL: PROMPTS.md step 7 replaces the
// placeholder scroll spacer with real leg sections, and their DOM positions
// should then become the source of these numbers. Until then this is the one
// place the camera's per-leg overrides read from, so moving a boundary is a
// one-line change here.
//
//   0  stationary, engine cold       (car parked — step 6 owns the cold start)
//   1  straight, projects sideways   (must end before the opening straight does)
//   2  cruise, skills as telemetry
//   3  route markers, experience
//   4  road becomes the risk layer
//   5  decelerates, stops, cabin
export const LEG_START = [0, 0.02, 0.3, 0.5, 0.7, 0.9] as const

// Progress at which the dead-straight opening stretch ends and the first bend
// begins. Leg 1's side-on tracking shot only reads on a straight road (CLAUDE.md
// section 1: on a curve the camera and the track fight), so the shot has to be
// gone by here.
export const OPENING_STRAIGHT_END = OPENING_STRAIGHT_M / ROUTE_CURVE.getLength()
