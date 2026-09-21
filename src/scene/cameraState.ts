export type CameraMode = 'chase' | 'three-quarter' | 'top-down' | 'low-wide'

// Written by DebugCameraRig (the 1-4 keys), read by ChaseCamera so it only
// drives the camera while 'chase' is the active mode. Plain mutable object for
// the same reason as scrollState.ts.
export const cameraState: { mode: CameraMode } = { mode: 'chase' }
