// Same rationale as scrollState.ts: a plain mutable object written once a
// frame by Car.tsx's useFrame, and polled by DebugHud.tsx's own rAF loop
// (DebugHud lives outside <Canvas>, in plain DOM, so it can't use
// useFrame — but it must not touch React state either, or the "zero
// re-renders while scrolling" rule would be defeated one layer up).
export const telemetry = {
  progress: 0,
  speedKmh: 0,
  steerDeg: 0,
  wheelDeg: 0,
  rollDeg: 0,
  pitchDeg: 0,
  brakeGlow: 0,
  camDist: 0, // camera-to-aim distance, written by ChaseCamera
  fps: 0,
}
