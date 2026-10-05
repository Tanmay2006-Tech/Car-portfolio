// One-time capability probes, evaluated once at module load and never
// again — none of these are expected to change mid-session, and reading
// them as plain constants keeps every consumer free of hooks.
//
// CLAUDE.md section 7: "Fallbacks — build them, don't defer them."

function media(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

// "Detect with a canvas probe, don't assume." A context that can be created
// here can still be lost later, which App.tsx handles separately via the
// Canvas's own webglcontextlost listener.
function probeWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return false
    ;(gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

// ?static forces the reduced-motion layout, ?nowebgl the image fallback —
// both so the fallbacks can be checked without changing OS settings.
export const REDUCED_MOTION = media('(prefers-reduced-motion: reduce)') || params.has('static')
export const HAS_WEBGL = !params.has('nowebgl') && probeWebGL()
// Touch-first or narrow: the light GLB, no cabin entry, a native swipe
// track for leg 1 instead of a pinned one (CLAUDE.md section 7).
export const IS_MOBILE = media('(max-width: 768px)') || media('(pointer: coarse) and (max-width: 1024px)')
// Debug HUD, fps stats, the route line and the 1-4 camera keys are
// scaffolding — only mounted with ?debug in the URL.
export const DEBUG = params.has('debug')

// The full scroll-driven drive only runs when every one of these holds;
// otherwise App renders the static layout (car parked at the hero angle,
// or a still image without WebGL).
export const DRIVING = HAS_WEBGL && !REDUCED_MOTION
