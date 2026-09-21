// Plain mutable object, NOT React state — written by ScrollTrigger's
// onUpdate (see ScrollSetup.tsx), read every frame inside useFrame (see
// Car.tsx). CLAUDE.md section 5: "One mutable object, written by
// ScrollTrigger, read by useFrame. Zero React re-renders while
// scrolling... it's the mistake almost everyone makes."
export const scroll = {
  progress: 0,
  velocity: 0,
  section: 0,
}

// LOAD-BEARING NUMBER, not a layout nicety. scroll.progress (0-1) always
// maps onto the *entire* route (curve.ts: ROUTE_CURVE.getLength() ===
// 952.8m), because Car.tsx drives position from `curve.getPointAt(p)`
// directly. That means this height is the only thing that decides how
// fast the car goes at a normal scroll pace — page-height and car-speed
// are the same number wearing two hats.
//
// Get this wrong (as the first cut did, at 800vh — roughly 7,200px on a
// typical viewport) and the car covers 952m in a handful of mouse-wheel
// notches: ~30x too fast, and since wheel spin, steering, roll and pitch
// all derive from speed, every one of them is wrong by that same factor
// and none of them can be tuned until this number is right.
//
// Sized for a ~60 km/h (16.7 m/s) cruise at a normal continuous scroll
// rate: 952.8m / 16.7m/s ≈ 57s of scrolling end to end, which at a
// typical smooth-scroll rate of a few hundred px/s lands in the
// 25,000-30,000px range. Verified against a simulated steady scroll in
// tools/measure-speed.mjs, which is the thing to rerun if this ever moves.
//
// PROMPTS.md step 7 replaces the placeholder `#page` spacer this sizes
// (see App.tsx) with real stacked leg sections — whoever does that needs
// their combined height to land in the same neighbourhood, or bake an
// equivalent speed correction in on purpose, not by accident.
export const PLACEHOLDER_PAGE_HEIGHT_PX = 28_000
