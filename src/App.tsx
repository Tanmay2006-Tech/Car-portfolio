import { Suspense } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Environment, Preload, Stats } from '@react-three/drei'
import { EffectComposer, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

import { Car } from './scene/Car'
import { ChaseCamera } from './scene/ChaseCamera'
import { HERO } from './scene/cameraShots'
import { SunRig } from './scene/SunRig'
import { QualityMonitor } from './scene/QualityMonitor'
import { useQuality } from './scene/quality'
import { srgb, DAWN_LOW } from './scene/colors'
import { Sky } from './scene/Sky'
import { Ground } from './scene/Ground'
import { RoadRibbon } from './scene/RoadRibbon'
import { LaneMarkings } from './scene/LaneMarkings'
import { DebugCurveLine } from './scene/DebugCurveLine'
import { DebugCameraRig } from './scene/DebugCameraRig'
import { ScrollSetup } from './scene/ScrollSetup'
import { DebugHud } from './scene/DebugHud'
import { HeroOverlay } from './scene/HeroOverlay'
import { ModelLoader } from './scene/ModelLoader'
import { PAGE_HEIGHT_PX } from './scene/scrollState'

// Confirmed: THREE.ColorManagement.enabled defaults true (three@0.186.0),
// and nothing in this codebase sets it false. Asserted here rather than
// just assumed, since a dependency silently flipping it would make every
// sRGB->linear conversion below a no-op without any visible error.
console.assert(
  THREE.ColorManagement.enabled,
  'THREE.ColorManagement.enabled must stay true or every sRGB colour below renders wrong.',
)

const fogColor = srgb(DAWN_LOW)

// Matches the sky's horizon colour (dawn-low) so the ground blends into it
// instead of stopping at a hard line. Linear fog, not exponential — the ask
// was specifically to tune near/far, and linear gives direct control over
// where the fade starts and finishes rather than a density curve. Starts
// past the whole route width (ROAD_WIDTH=5m) so the road itself is never
// hazy up close, and stays clear for a good stretch ahead — full route
// length is ~953m (src/scene/curve.ts) so this only fades the distant part
// of it, not the near view.
const FOG_NEAR = 40
const FOG_FAR = 180

// Static initial framing for the very first paint, before Car/ChaseCamera
// have mounted (they're inside a Suspense boundary gated on the GLB —
// CLAUDE.md section 1: "text renders first, the car fades in when
// loaded"). Ground/road/sky ARE visible immediately though, so the camera
// needs a sane orientation from frame one rather than three.js's rotation-
// identity default. Same formula ChaseCamera uses for its `ideal` position
// (CHASE_CAMERA's own math), evaluated once here at rest (car heading 0,
// position the world origin — which is exactly where carPose defaults to
// before Car ever writes a real value, so this is already numerically
// correct, not just a placeholder). Skips the stage-bias lookAt shift
// ChaseCamera applies every frame — that's a sub-second cosmetic gap while
// the GLB streams in, corrected the instant ChaseCamera takes over.
const heroAzRad = THREE.MathUtils.degToRad(HERO.azimuthDeg)
const HERO_CAMERA_POSITION: [number, number, number] = [
  HERO.aimX - HERO.radius * Math.cos(heroAzRad),
  HERO.height,
  HERO.aimZ + HERO.radius * Math.sin(heroAzRad),
]
const HERO_CAMERA_LOOKAT: [number, number, number] = [HERO.aimX, HERO.aimY, HERO.aimZ]

export default function App() {
  // Leg 0/5 only (src/scene/QualityMonitor.tsx) — the car isn't moving, so
  // this is the one moment to spend extra render quality instead of saving
  // frame time: AdaptiveDpr's downgrade disabled (letting the Canvas sit at
  // the device's own native devicePixelRatio, clamped to [1,2] below, same
  // as always) and real MSAA through the EffectComposer, both switched
  // back on the instant scroll starts driving.
  //
  // dpr itself never changes with isStationary — it stays the same [1,2]
  // clamp range in both states. Forcing it to a literal 2 while stationary
  // was tried first and measured: on a device whose real devicePixelRatio
  // is 1 (confirmed against this project's own dev machine), that forces
  // 4x the pixel count of what the device would render natively, not "no
  // downgrade" — mean fps parked fell from ~52fps to ~8fps, an order of
  // magnitude, for detail nobody's screen can even show. AdaptiveDpr is the
  // ONLY thing that ever pushes dpr below the device's native ratio
  // (Canvas's own initial dpr already clamps window.devicePixelRatio into
  // [1,2] and never scales it up), so simply not mounting AdaptiveDpr while
  // stationary is what "full DPR" actually means per-device.
  const isStationary = useQuality((state) => state.isStationary)

  return (
    <>
      {/* Fixed wrapper per CLAUDE.md section 5: pinning (leg 1, PROMPTS.md
          step 7) injects a spacer element into whatever contains it, and a
          <Canvas> caught inside that container gets displaced along with
          it. Living outside the scrolling flow from the start means the
          canvas never has to move when that lands. */}
      <div style={{ position: 'fixed', inset: 0 }}>
        <Canvas
          shadows="soft"
          dpr={[1, 2]}
          camera={{ position: HERO_CAMERA_POSITION, fov: HERO.fov }}
          gl={{ antialias: false }}
          onCreated={({ gl, scene, camera }) => {
            console.assert(
              gl.outputColorSpace === THREE.SRGBColorSpace,
              'renderer.outputColorSpace must be SRGBColorSpace or colours display wrong.',
            )
            camera.lookAt(...HERO_CAMERA_LOOKAT)
            // Debug-only: lets diagnostic scripts under tools/ read real
            // renderer.info (draw calls, triangles) instead of guessing from
            // source.
            ;(window as unknown as { __gl?: THREE.WebGLRenderer; __scene?: THREE.Scene }).__gl = gl
            ;(window as unknown as { __gl?: THREE.WebGLRenderer; __scene?: THREE.Scene }).__scene = scene
          }}
        >
          <Sky />
          <fog attach="fog" args={[fogColor, FOG_NEAR, FOG_FAR]} />

          {/* Writes useQuality's isStationary from scroll.progress every
              frame (imperative getState/setState, not the hook, so this
              doesn't itself re-render on scroll — see QualityMonitor.tsx). */}
          <QualityMonitor />

          {/* Key light + shadow target, re-centred on the car every frame
              (src/scene/SunRig.tsx) — the shadow camera only has to cover
              the car locally, not the whole ~953m route, because this rig
              keeps it framed around wherever the car currently is. */}
          <SunRig />

          {/* preset="dawn" (kiara_1_dawn_1k.hdr) was the original choice, but
              its own colour cast is cool/blue, which showed up directly in the
              ground: verge rendered blue-dominant (B>G>R) against a token that's
              supposed to be green-dominant (G>B>R) — a structurally wrong hue,
              not just under-saturated, and no tone-mapping curve fixes a wrong
              hue. preset="sunset" (venice_sunset_1k.hdr) is warm and puts the
              rendered ground back in the token's own channel order. Verified by
              sampling real pixels under both, ACES held fixed throughout. */}
          <Environment preset="sunset" environmentIntensity={0.35} />

          <Suspense fallback={null}>
            <Car />
            {/* After <Car />, not before: it reads the pose Car writes each
                frame, and same-priority useFrame callbacks run in mount order. */}
            <ChaseCamera />
          </Suspense>

          <Ground />
          <RoadRibbon />
          <LaneMarkings />
          <DebugCurveLine />
          <DebugCameraRig />

          {/* Mounted only while driving: while stationary, this is the ONE
              thing that would otherwise undo the full-quality parked shot
              by scaling dpr down under any performance dip — the Canvas's
              own dpr clamp ([1,2] above) never changes. No `pixelated` —
              that flag applies image-rendering:pixelated whenever DPR
              drops during movement, which on a scroll-driven site is
              constantly, and it would fight the SMAA pass on every scroll. */}
          {!isStationary && <AdaptiveDpr />}
          <Preload all />
          {/* multisampling: real MSAA through the composer's render target,
              on top of SMAA — expensive, so only while parked (leg 0/5) is
              there no per-frame cost to protect (driving keeps the
              original 0; SMAA alone carries the AA budget while moving).
              Measured on this dev machine before picking the number: 8
              samples cost too much even parked (mean fps fell to ~29 from
              a ~52fps baseline); 4 lands at ~38fps, a real but tolerable
              cost for a shot with no camera motion to feel it stutter. */}
          <EffectComposer multisampling={isStationary ? 4 : 0}>
            <SMAA />
            {/* Not optional decoration: @react-three/fiber sets gl.toneMapping
                to ACESFilmicToneMapping by default, but EffectComposer takes
                over the render pipeline and silently resets it to
                NoToneMapping — confirmed live (renderer.info showed identical
                output whether gl.toneMapping was 0, 4, 6, or 7; tone mapping
                has to be its own effect in this chain or it's a no-op
                regardless of what the renderer property says). Compared
                ACES/AgX/Neutral here against the verge ground colour
                (--verge #b7d3bf): ACES_FILMIC #a6abb5 (distance ~45) was
                closest, AGX #989ca4 (~69) barely differs from no tone mapping
                at all, NEUTRAL #8c92a0 (~84) was furthest. None fully recover
                the token's green — that gap is the PBR lighting response
                itself (warm sun + cooler env fill), which tone-mapping curve
                choice doesn't reach. */}
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>

          <Stats />
        </Canvas>
      </div>

      <ScrollSetup />
      <DebugHud />

      {/* DOM, not Canvas children — CLAUDE.md section 1: hero text must
          render immediately regardless of GLB load state, and the loader
          is deliberately a separate element from it, not a splash screen
          gating the hero. */}
      <HeroOverlay />
      <ModelLoader />

      {/* Scroll length until PROMPTS.md step 7 builds the real leg
          sections — their stacked height becomes the actual scroll
          distance then, still split the same way (hero + cold start +
          route). This just gives ScrollSetup's ScrollTrigger something to
          measure against. Transparent: the fixed canvas above is what's
          actually seen.

          Height is PAGE_HEIGHT_PX (HERO_PX + COLD_START_PX + ROUTE_PX),
          not a vh unit — see scrollState.ts for why ROUTE_PX specifically
          is load-bearing (it's what makes a normal scroll pace equal a
          normal driving speed; HERO_PX/COLD_START_PX can move freely). */}
      <div id="page" style={{ height: `${PAGE_HEIGHT_PX}px` }} />
    </>
  )
}
