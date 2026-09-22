# Cold Start — prompt sequence

Paste these into Claude Code in order. Each assumes `CLAUDE.md` is in the project root and loaded.

Don't skip ahead. Each prompt builds on a working state from the one before, and debugging a broken camera on top of a broken model is much harder than doing them in order.

No software to install. Everything runs through npm packages the project already needs.

---

## 1 — Asset pipeline, no Blender

```
Read section 3 of CLAUDE.md.

Delete tools/split_wheels.py. We are not using Blender. Write
tools/prepare-model.mjs instead — a Node script using @gltf-transform/core
that does the whole asset prep programmatically. Run it with `node`.

The wheels are separable in code because they sit in four clean quadrants
around the car's centre. No mesh editing needed — partition triangles by
which quadrant their centroid falls in.

From the inspect data: length is along X (4.534m), height is Y (1.310m),
width is Z (2.715m). So the wheel axle axis is Z. Derive this in the script
rather than hardcoding it, and print what you derived.

The script must:

1. Read raw/scene.gltf.

2. Derive the front/rear direction. Find the world-space centroid of
   red_light_back_red_light_main_0 (tail light, has an emissive texture)
   and cross-check pipes_pipes_chrom_0 (exhausts). Whichever end of the X
   axis they sit at is the REAR. Print the evidence.
   This matters — only front wheels steer.

3. Derive the driver's side from steering_wheel_signs_pl_leather_int_0's
   centroid on Z. Then work out whether door_1 or door_2 is on that side
   and print it. The cabin-entry beat uses the driver's door.

4. Split the wheels. For each of these meshes, read POSITION and indices,
   compute each triangle's centroid, and assign it to one of four quadrants
   by the sign of (centroid - carCentre) on X and Z:
     wheel_rim_rim_black_0, wheel_rim_rim_chrome_0, AO_tire_main_tires_0,
     discs_Discs_0, metal_parts_rim_chrome_0

   Emit four new meshes: wheel_FL, wheel_FR, wheel_RL, wheel_RR, named
   using the axes derived in steps 2 and 3.

   Rebase each wheel's vertex positions so its local origin is its own
   bounding-box centre (that's the axle centre), then give its node a
   translation putting it back in place. Rotating that node then spins the
   wheel about its axle, which is what section 5 needs.

5. Handle brakes_all_brakes_0 separately. Split it by the same quadrant
   logic but leave the four caliper meshes as STATIC nodes, not children
   of the rotating wheel nodes. Real calipers don't spin with the wheel.

6. Verify each wheel. Check the geometry is radially symmetric about its
   new origin in the XY plane (perpendicular to the Z axle), within a few
   percent. Fail loudly and stop if any wheel is off — a bad origin means
   it wobbles instead of rolling, and every later animation inherits it.

7. Detect whether the doors are posed open. The Z-span is 2.715m; a 911 is
   1.90m wide, 2.02m with mirrors, so there's ~0.7m of excess. Compare each
   door group's bbox against the body bbox. If a door is open, compute its
   hinge (vertical axis through the door's forward outer edge) and apply a
   node rotation to close it. Print the hinge position and the rotation you
   applied — section 5 needs both to open it again.

8. Re-centre everything so the car straddles the origin with tyre contact
   patches at Y=0.

9. Set doubleSided = false on all materials except: windows, windows_edge,
   windows_dots, monitor, lights, headlights_pattern.

10. Delete LOGO1_clearcoat (195 bytes at 512x512 — it's a flat colour) and
    set clearcoat as a material constant instead.

11. Write raw/porsche-split.glb.

12. Print a report: derived axes with evidence, front/rear, driver side and
    which door, doors-open detection and hinge values, the four wheel
    origins, per-wheel triangle counts, symmetry check results, final bbox.

Then write tools/optimize.sh running the gltf-transform chain from
section 3 (dedup, prune, weld, resize 1024, uastc, meshopt) into
public/models/porsche-desktop.glb, plus a 512 mobile variant, then gltfjsx
with -t -T. Print before/after file size and estimated VRAM.

Run both. Show me the reports.
```

**What to check:** VRAM should land around 20–30 MB, down from ~280. The four wheel origins should be symmetrical — two matching pairs, front and rear. If a symmetry check failed, stop and tell me rather than continuing.

**If it fails:** tell me what the error was. The fallback is swapping to a car model that ships with separated wheels, which costs us the detailed interior but nothing else. I'd rather exhaust this route first — your model's interior is what makes leg 5 possible.

---

## 2 — Scaffold and static render

```
Read sections 2, 4 and 6 of CLAUDE.md.

Scaffold Vite + React 18 + TypeScript with the stack in section 4.
Set up the design tokens from section 2 as CSS custom properties, and
self-host Jost and Archivo as variable fonts (no Google Fonts CDN).

Then render the optimized car:
- One <Canvas>, dpr={[1,2]}, SMAA, <AdaptiveDpr />, <Preload all />
- One HDRI environment map plus one low-angle directional light for the
  dawn raking shadows
- <ContactShadows>, not a real-time shadow map
- Static camera at a good three-quarter front angle
- Set body_main's baseColorFactor to --guards (it has no baseColorTexture,
  so this is a one-line recolour)
- An fps counter I can see

No scroll, no animation, nothing else yet.

Then tell me: measured fps, bundle size, and the GLB size actually served.
Section 6 has the budget. If we're over, say so rather than moving on.
```

**What to check:** it should sit at a solid 60fps with a static camera. If not, nothing later will be fixable.

---

## 3 — The road curve

```
Read section 5 of CLAUDE.md.

Build the route as a single THREE.CatmullRomCurve3 — the one source of
truth for car position, car heading, road geometry and camera.

- Extrude a road ribbon along it with the --asphalt token
- Instance lane markings along it (these are the speed cue — no motion blur)
- Leg 1's stretch must be DEAD STRAIGHT, per section 1. Curves elsewhere.
- Render the curve as a visible debug line I can toggle
- Ground plane in --verge, sky gradient --dawn-high to --dawn-low

Nothing drives on it yet. I want to judge the route shape first.
```

---

## 4 — Driving

```
Read section 5 of CLAUDE.md carefully — this is the most important step.

Wire up scroll-driven driving, in this order, and tell me when each is
working before starting the next:

a) Lenis + ScrollTrigger + the mutable `scroll` object. NEVER setState
   during scroll. Wire Lenis and ScrollTrigger together explicitly
   (lenis.on('scroll', ScrollTrigger.update), lenis.raf from gsap.ticker,
   gsap.ticker.lagSmoothing(0)) — section 5 flags this as the most common
   bug in this stack.
b) Car follows the curve. lookAt a point AHEAD on the curve, damped —
   not the immediate tangent.
c) Wheel rotation DERIVED FROM DISTANCE TRAVELLED, never a constant spin.
   Handle reverse scroll — wheels turn backwards.
d) Front wheels steer from path curvature, clamped and damped.
e) Body roll (max ~3°) and pitch (max ~1.5°), both damped. Small numbers.
   It should feel like it weighs 1,640 kg.

Add a debug HUD: scroll progress, speed, steer angle, wheel rotation, fps.

Every derived value goes through frame-rate-independent damping. Nothing
snaps.
```

**What to check:** scroll slowly and watch the wheels. If they spin at a constant rate while the car speeds up and slows down, (c) is wrong and it's the single most obvious tell of a fake driving scene.

---

## 5 — Chase camera

```
Read section 5's chase camera notes.

Camera offset in the car's local space, damped with a LONGER lambda than
the car so it lags slightly through corners — that lag is what makes it
feel like a camera car rather than a rigid mount.

Then per-leg overrides from the route map in section 1:
- Leg 1: side-on, parallel, low — the horizontal-scroll tracking shot
- Leg 4: drop to wheel height, road surface visible
- Leg 5: swing to the driver's door and push in

Keep the debug HUD.
```

---

## 6 — The two beats that matter

```
Read sections 1 and 2 of CLAUDE.md.

Build leg 0 and leg 5 — the hardest two, per section 9.

Leg 0 is three beats, not one — CLAUDE.md section 1's "The opening":

A. On load, no scroll: a real landing page. Static low three-quarter
   FRONT shot, car off-axis right, engine and lights off. Hero text
   (name, role, one-line summary, links) is real DOM and renders
   immediately — it must not wait on the GLB. The car itself fades in
   once the model has loaded. Keep a minimal, separate loading
   indicator for that gap; it is not a splash screen and does not gate
   the hero.

B. First scroll, scroll-scrubbed and reversible: the cold start. Hero
   text eases out, camera swings from the hero shot to the chase shot.
   Needle sweep, headlights on (headlights_flash_lights_0), faint idle
   shudder. Car still parked. The needle sweep is the leg 2 telemetry
   HUD waking up — revs to a peak, settles to idle — not a separate
   name-reveal element; the name is already in the hero from beat A.

C. More scroll: the car pulls away, ordinary route driving.

Split the page's scroll height into three named px constants — HERO_PX,
COLD_START_PX, ROUTE_PX — summed for the total. ROUTE_PX must keep
whatever px-per-metre the route currently calibrates to (verify against
the HUD's speed readout on a steady scroll — see tools/measure-speed.mjs)
or the 60km/h cruise breaks; HERO_PX and COLD_START_PX are free to tune.

Leg 5, the cabin:
- Car decelerates and stops
- Tail lights brighten under braking (red_light_back_red_light_main_0 has
  an emissive texture)
- Driver's door opens — use the door object and hinge values that
  tools/prepare-model.mjs derived and printed
- Camera enters the cabin
- Contact details on the infotainment screen, AND as a real focusable
  <form> in the DOM
```

---

## 7 — Legs 1 to 4

```
Read sections 1, 5 and 8 of CLAUDE.md.

Build legs 1-4, one at a time, each finished before the next.

Leg 1 — projects, horizontal. The pinned track and the car's forward
motion are the SAME motion driven by one shared distance constant. Five
roadside markers, and the car drawing level with a marker is the card
transition. Watch the four gotchas in section 5 (Lenis wiring, the pin
spacer displacing the canvas, end-as-function, keyboard focus escaping).

Leg 2 — skills as the telemetry HUD. Real numbers from section 1.
Never percentage bars.

Leg 3 — experience as a dated service log. This is the only place
numbered markers are allowed.

Leg 4 — the road-risk pair. Road surface becomes the risk layer.
The only saturated colour in the environment. Zenodo DOI on its own line.
```

---

## 8 — Content and type

```
Read sections 2 and 8 of CLAUDE.md.

Real copy, real numbers, the left-column manual layout, responsive to
360px. Follow the copy rules — replace every generic line from the old
site. Specificity over adjectives.

Then footer: the CC BY 4.0 credit to n.brizitskaya linking to the
Sketchfab model page. This is required by the licence, not optional.
```

---

## 9 — Fallbacks

```
Read section 7 of CLAUDE.md. Build all of it:

- prefers-reduced-motion: no scroll-driven driving at all, static car,
  full content
- No WebGL: static hero render, site reads as a normal portfolio.
  Detect with a canvas probe.
- Mobile: light GLB, no cabin entry, leg 1 becomes a native
  overflow-x + scroll-snap track, NOT a pinned section
- Everything in the DOM, visible keyboard focus rings in --guards
```

---

## 10 — Performance and ship

```
Read section 6 of CLAUDE.md.

Run Lighthouse and a throttled-network test. Report against every number
in the budget: fps desktop and mobile, GLB sizes, JS+fonts gzipped, LCP.

Fix what's over. If simplify is needed, only on interior meshes —
plastic_all_bl_pl_M_int_0 (86k triangles) and logo_all_LOGO1_0 (25k)
take --ratio 0.4 without anyone noticing. Never wheels, never body panels.

Then set up the Vercel deploy.
```

---

## The parts that stay yours

Almost all of this is now pasteable. Three things aren't, and shouldn't be:

**Does the car look right.** After prompt 2, look at it. Wrong scale, odd lighting, or the paint colour not landing are things you'll see in a second and a spec won't catch.

**Does the motion feel good.** Prompt 4 is a tuning problem, not a code problem. Damping values, roll magnitude, camera lag — the numbers in the brief are starting points. Push them around until it feels heavy and planted rather than floaty.

**Is this how you want to be represented.** The curation call in section 8 — five projects on the road, the rest as a list, Spotify Clone dropped — is my read of your work, not a fact. You know what you want to be hired for. Change it if I've got it wrong.

Everything else is mechanical, and mechanical work is what prompts are for.