// Plain mutable object, NOT React state — written by ScrollTrigger's
// onUpdate (see ScrollSetup.tsx), read every frame inside useFrame (see
// Car.tsx). CLAUDE.md section 5: "One mutable object, written by
// ScrollTrigger, read by useFrame. Zero React re-renders while
// scrolling... it's the mistake almost everyone makes."
export type ScrollPhase = 'hero' | 'coldstart' | 'route'

export const scroll = {
  // Raw ScrollTrigger fraction over the WHOLE page (0-1), exactly as before.
  progress: 0,
  velocity: 0,
  section: 0,
  // Derived every update from `progress` and the three px budgets below —
  // see windowProgress(). `phase` says which budget the scroll position is
  // currently inside; `phaseProgress` is 0-1 WITHIN that budget.
  phase: 'hero' as ScrollPhase,
  phaseProgress: 0,
  // Curve progress for Car.tsx/ChaseCamera.tsx: 0 for the entire hero and
  // cold-start budgets (the car doesn't move yet), then 0-1 across
  // ROUTE_PX. This is what carPose.progress ends up holding — everything
  // that used to read raw `scroll.progress` as the curve parameter now
  // reads this instead.
  routeP: 0,
}

// CLAUDE.md section 1's new opening: a static landing page (no scroll), a
// scroll-scrubbed cold-start ignition sequence (car still parked), then the
// drive. Three sequential pixel budgets, summing to the page's total
// scrollable height — named constants so each phase's length is a single
// edit, not a magic number buried in a calculation.
//
//   HERO_PX       static landing page retreats: hero DOM text eases out,
//                 camera starts drifting off the hero shot toward chase.
//   COLD_START_PX ignition self-test finishes: needle sweep (the debug/
//                 telemetry HUD waking up), headlights on, idle shudder,
//                 camera arrives at the chase position. Car still parked
//                 at the route's start (curve p=0) throughout both of the
//                 above — only ROUTE_PX moves it.
//   ROUTE_PX      the drive. UNCHANGED from the prior single-phase
//                 PLACEHOLDER_PAGE_HEIGHT_PX value — this is the number
//                 that calibrates the 60km/h cruise (see the derivation
//                 this constant used to carry, and tools/measure-speed.mjs,
//                 the thing to rerun if it ever moves). Moving HERO_PX or
//                 COLD_START_PX must never change this one.
export const HERO_PX = 700
export const COLD_START_PX = 2200
export const ROUTE_PX = 28_000
export const PAGE_HEIGHT_PX = HERO_PX + COLD_START_PX + ROUTE_PX

// 0-1 fraction of the [startPx, startPx + lengthPx) window, given the
// current absolute scroll position in pixels. The one piece of math every
// phase-specific consumer (hero fade, ignition rig, the route curve)
// shares, so the three budgets above only have to be defined once and
// every consumer stays in sync with them automatically.
export function windowProgress(scrollPxNow: number, startPx: number, lengthPx: number): number {
  return Math.min(1, Math.max(0, (scrollPxNow - startPx) / lengthPx))
}

// Absolute scroll position (px) at which route progress `routeP` is
// reached. #page is PAGE_HEIGHT_PX + one viewport tall (App.tsx), so its
// ScrollTrigger range is exactly PAGE_HEIGHT_PX and scroll px map 1:1 onto
// these budgets — which is what lets the DOM leg sections be positioned
// with plain pixel offsets and still line up with the car.
export function routeToScrollPx(routeP: number): number {
  return HERO_PX + COLD_START_PX + routeP * ROUTE_PX
}

// Leg 5 (CLAUDE.md section 1: "Decelerates, stops"). Scroll keeps running
// linearly through leg 5 — the camera, door and cabin beats need that
// budget — but the car's own position is remapped so it brakes to a halt
// over the first STOP_T of the leg and then stays put. Constant
// deceleration from the cruise slope: the remap's derivative is 1 at the
// leg boundary (no speed jump) and falls linearly to 0 at STOP_T, so the
// car covers STOP_T/2 of leg 5's road and the brake lights fire on their
// own from the real deceleration (Car.tsx's accel signal).
export const LEG5_START = 0.9
export const STOP_T = 0.45
export function driveP(routeP: number): number {
  if (routeP <= LEG5_START) return routeP
  const t = Math.min(1, (routeP - LEG5_START) / (1 - LEG5_START))
  const f = t < STOP_T ? t - (t * t) / (2 * STOP_T) : STOP_T / 2
  return LEG5_START + (1 - LEG5_START) * f
}

// Leg 5 beats, as route progress (scroll), after the car has stopped at
// LEG5_START + (1 - LEG5_START) * STOP_T = 0.945.
export const DOOR_OPEN_START = 0.948
export const DOOR_OPEN_END = 0.966
export const CABIN_REACHED = 0.985
