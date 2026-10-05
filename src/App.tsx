import { Suspense, lazy, useState } from 'react'
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
import { RoadsideMarkers } from './scene/RoadsideMarkers'
import { Scenery } from './scene/Scenery'
import { useSection } from './scene/sectionStore'
import { Sections } from './sections/Sections'
import { TelemetryGauge } from './sections/TelemetryGauge'
import { Footer } from './sections/Footer'
import { ColumnPane } from './sections/ColumnPane'
import { DRIVING, HAS_WEBGL, DEBUG } from './env'

// Leg 4's heat-map shader (CLAUDE.md section 6: "Lazy-load the GridSense
// heat-map shader — not needed until leg 4"). Its own chunk, fetched once
// the car reaches leg 3, and kept mounted after that.
const RiskLayer = lazy(() => import('./scene/RiskLayer'))

// A still of the parked car at the hero angle, for browsers without WebGL
// (CLAUDE.md section 7) — and for a context lost mid-session.
const STATIC_HERO_IMAGE = '/hero-static.jpg'

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

function Scene({ onContextLost }: { onContextLost: () => void }) {
  // True only while the CAMERA is genuinely still — the hero phase (held
  // on one static shot the whole way) and the very end of the route once
  // DOOR_PUSH is fully settled (src/scene/QualityMonitor.tsx). Not "the car
  // isn't moving": cold start parks the car but swings the camera the
  // entire time, and spending this same extra quality there made a moving
  // shot look choppy at ~37fps instead of smooth — caught by looking at
  // the cold-start screenshots, not by reasoning about the car's position.
  // This is the one moment to spend extra render quality instead of saving
  // frame time: AdaptiveDpr's downgrade disabled (letting the Canvas sit at
  // the device's own native devicePixelRatio, clamped to [1,2] below, same
  // as always) and real MSAA through the EffectComposer, both switched
  // back on the instant the camera starts moving again.
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
  const section = useSection((state) => state.section)
  const [riskWanted, setRiskWanted] = useState(false)
  if (!riskWanted && section >= 3) setRiskWanted(true)

  return (
    <>
      {/* Fixed wrapper per CLAUDE.md section 5: pinning (leg 1, PROMPTS.md
          step 7) injects a spacer element into whatever contains it, and a
          <Canvas> caught inside that container gets displaced along with
          it. Living outside the scrolling flow from the start means the
          canvas never has to move when that lands. */}
      <div className="stage">
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
            gl.domElement.addEventListener('webglcontextlost', (event) => {
              event.preventDefault()
              onContextLost()
            })
            // Debug-only: lets diagnostic scripts under tools/ read real
            // renderer.info (draw calls, triangles) instead of guessing from
            // source.
            ;(window as unknown as { __gl?: THREE.WebGLRenderer; __scene?: THREE.Scene }).__gl = gl
            ;(window as unknown as { __gl?: THREE.WebGLRenderer; __scene?: THREE.Scene }).__scene = scene
            ;(window as unknown as { __camera?: THREE.Camera }).__camera = camera
            if (DEBUG) (window as unknown as { __THREE?: typeof THREE }).__THREE = THREE
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
          <RoadsideMarkers />
          <Scenery />
          {riskWanted && (
            <Suspense fallback={null}>
              <RiskLayer />
            </Suspense>
          )}
          {DEBUG && <DebugCurveLine />}
          {DEBUG && <DebugCameraRig />}

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

          {DEBUG && <Stats />}
        </Canvas>
      </div>

    </>
  )
}

function StaticStill() {
  return (
    <div
      className="stage stage--image"
      role="img"
      aria-label="A red Porsche 911 parked on a pale road at dawn"
      style={{ backgroundImage: `url(${STATIC_HERO_IMAGE})` }}
    />
  )
}

// Reduced motion or no WebGL (CLAUDE.md section 7): no scroll-driven
// driving at all. The car is rendered once at the hero angle (or shown as
// a still) and every section appears as an ordinary page.
function StaticApp({ webgl }: { webgl: boolean }) {
  const [lost, setLost] = useState(false)
  return (
    <>
      <div className="static-page">
        {webgl && !lost ? <Scene onContextLost={() => setLost(true)} /> : <StaticStill />}
        <HeroOverlay mode="flow" />
        <Sections layout="static" />
      </div>
      <Footer />
    </>
  )
}

function DriveApp() {
  const [lost, setLost] = useState(false)
  // A lost context mid-drive drops to the static page rather than leaving
  // a frozen canvas behind live scroll-driven text.
  if (lost) return <StaticApp webgl={false} />
  return (
    <>
      <Scene onContextLost={() => setLost(true)} />
      <ScrollSetup />
      {DEBUG && <DebugHud />}

      {/* DOM, not Canvas children — CLAUDE.md section 1: hero text must
          render immediately regardless of GLB load state, and the loader
          is deliberately a separate element from it, not a splash screen
          gating the hero. */}
      <HeroOverlay />
      <ModelLoader />
      <TelemetryGauge />
      <ColumnPane />

      {/* The scroll runway. PAGE_HEIGHT_PX (HERO_PX + COLD_START_PX +
          ROUTE_PX) plus one viewport, so ScrollTrigger's start-top/end-
          bottom range over it is exactly PAGE_HEIGHT_PX and scroll pixels
          map 1:1 onto the three budgets — which is what lets each leg's
          DOM section be placed with a plain pixel offset
          (scrollState.ts routeToScrollPx). ROUTE_PX is the load-bearing
          one: it's what makes a normal scroll pace a normal driving
          speed. */}
      <main id="page" style={{ height: `calc(${PAGE_HEIGHT_PX}px + 100vh)` }}>
        <Sections layout="drive" />
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return DRIVING ? <DriveApp /> : <StaticApp webgl={HAS_WEBGL} />
}
