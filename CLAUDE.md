# Cold Start — build brief v2

3D portfolio for Tanmay Tripathi. Hand this whole file to Claude Code as project context.

**Codename:** Cold Start. Firing an engine that's sat overnight — and the cold-start problem in ML. Both meanings are the point. The site opens at dawn.

> **v2 changes:** the car now drives along a route instead of being inspected while parked. Palette moved from service-bay grey to a dawn pastel world. Sections 1, 2, 5, 6, 9 substantially rewritten.

---

## 1. Concept

The site is a dawn test drive. The car starts cold, pulls away, runs a route, and arrives. You scroll, it drives.

**The route is the portfolio.** Each leg of road is a section. This matters because GridSense — the flagship project, with a published paper behind it — predicts traffic incident severity on real roads. A car actually driving on roads that carry that data is a far stronger fit than a parked car on a studio floor. The metaphor is load-bearing.

A live telemetry HUD reads out as the car moves. That thread runs through the work: GridSense reads traffic signals, NullTrace reads infrastructure signals, both predict failure before it happens. The HUD is that instinct made visible.

**The one bold moment:** at the end the car stops and the camera enters the cabin. This model has a fully detailed interior, which free car models almost never do. Almost no car site on the web goes inside, because almost none can. That's the memorable beat — everything before it stays disciplined so it lands.

### Route map

| Leg | Road state | Content | Car |
|---|---|---|---|
| 0 | Stationary, dawn, engine cold — see "The opening" below | Name, role, one line, links | Parked, then idle shudder |
| 1 | Straight stretch, section pinned | 5 projects, scrolling sideways | Accelerating, camera side-on |
| 2 | Cruise | Skills as telemetry HUD | Steady |
| 3 | Route markers passing | 4 internships, dated | Steady |
| 4 | Road surface becomes the risk layer | GridSense + RiskPath + the paper | Slows, low camera |
| 5 | Decelerates, stops | About + contact | **Camera enters cabin** |

The car is stationary through the whole of the opening (leg 0) and again at leg 5. It moves for everything between. That's also a performance win — the expensive interior geometry only needs to be in frame at the very end.

### The opening

Leg 0 is not one beat, it's three, and the third is the only one that scrolls the route:

**A. On load, no scroll — a real landing page.** The car sits parked, engine and lights off, as the backdrop to actual page content: a static low three-quarter *front* shot, car off-axis on the right of the frame (section 2's 64% stage, same side CHASE keeps it on throughout the drive). The left column carries name, role, a one-line summary, and links (GitHub, LinkedIn, email, resume) — real DOM, per section 2's layout. This text must never wait on the GLB: it renders on first paint regardless of model-load state, and the car fades in once it's ready. A minimal, separate loading indicator (not styled as a splash screen, not gating the hero) covers the gap while the model streams in.

**B. First scroll — the cold start.** Scroll-scrubbed and fully reversible, car still parked. The hero text eases out; the camera swings from the static hero shot to the driving chase shot. Alongside that: the ignition self-test (needle sweep), headlights on, a faint idle shudder through the chassis. The needle sweep is *not* a separate name-reveal element — the name already lives in the hero from beat A — it's the leg 2 telemetry HUD itself waking up: revs to a peak, settles to idle, and stays there until the car actually pulls away.

**C. More scroll — the car pulls away.** Ordinary route driving, as described everywhere else in this document.

The page's scroll height is split into three named pixel budgets — `HERO_PX` (A retreats), `COLD_START_PX` (B plays out), `ROUTE_PX` (C, the drive) — summed for the total scrollable height. `ROUTE_PX` is the one that calibrates the 60km/h cruise feel (scrollState.ts's own derivation); moving `HERO_PX` or `COLD_START_PX` must never change it.

### Leg 1: the projects run sideways

The projects section scrolls horizontally, and this is not a separate mechanic bolted onto the page — **the horizontal scroll is the car's forward motion.** One scroll input advances the car along the road and translates the project track left at the same time. They're the same movement seen two ways.

Three consequences that follow from that, and all three are requirements:

- **This stretch of road is straight.** Curves everywhere else, dead straight here. A straight road lets the camera run side-on and parallel, like a tracking shot from a camera car — which is exactly the visual grammar of horizontal scroll. On a curving road the two motions fight each other and it reads as two unrelated animations happening at once.
- **The projects are physical, not floating cards.** Four structures spaced along the roadside — the car passes each one in turn. As it draws level with a marker, that project's text slides into the left column. The passing is the transition; don't also fade or slide the cards independently.
- **Distance is shared.** Project marker spacing in world units and card spacing in pixels are derived from one constant. If a card is halfway across the screen, the car is halfway between markers. Any drift between them is instantly visible and ruins the effect.

Five markers on this leg, not fifteen. See section 8 on curation.

### Skills as telemetry, not percentage bars

Never build `React ████████░░ 85%`. It means nothing and it's the signature of a template portfolio.

The HUD shows numbers that are actually true:

- `8,173` incidents processed
- `63` engineered features
- `0.640` macro F1
- `75.5%` high-risk recall
- `4` shipped to production
- `1` published preprint

Languages and frameworks go underneath in a plain spec-sheet block, set like a manufacturer's technical data table. No bars, no ratings, no stars.

### Leg 4: the road-risk pair

Leg 4 is the payoff, and it carries two projects rather than one, because they belong together.

**GridSense** predicts traffic incident severity across Bangalore from 8,173 historical incidents, and has a published preprint behind it. **RiskPath**, built for the Road Safety Hackathon 2026 at IIT Madras, predicts route risk *before* you travel and surfaces hotspots, hazards and safer alternatives.

Two road-risk systems, one reading the network and one reading the route. Putting them on the same stretch of road makes a claim no single project can: this is a domain you work in, not a hackathon you happened to enter.

The road surface under the wheels stops being neutral asphalt and becomes the risk layer both projects output — the car driving over the data it was trained to read. This is the moment the metaphor stops being decorative and pays for itself.

It's also the **only** place saturated colour enters the environment. Everything else is pastel; risk is hot. That contrast is the meaning, so don't spend saturation anywhere else.

Keep it restrained: a shader on the road ribbon, warm cells for high severity. Don't animate traffic flowing. One state, revealed once, as the car passes over it. The Zenodo DOI sits here, on its own line.

---

## 2. Design tokens

### Palette — dawn, not candy

Pastel is right here, but it fails in two specific ways and both need guarding against.

**Failure one: everything pastel including the car.** Then the car reads as a toy and the composition has no focal point. **Rule: the world is pastel, the car is saturated.** Ground the paint in a real Porsche heritage colour — Guards Red is the 911's defining red, worn since the classic air-cooled cars through today, the colour most people picture the instant they picture a Porsche. Unlike the dawn palette around it, it has no pastel lineage at all, which is exactly what makes it read as the one saturated thing in the frame. That gives the choice a reason beyond "pastel is nice."

**Failure two: low-contrast text.** Pastel backgrounds with pastel-adjacent text is an accessibility disaster. All text stays deep ink. No exceptions.

Dawn, rather than generic pastel, because the car starts cold — it sat overnight. Low sun means long raking shadows, which make the car read beautifully and are cheap to light.

```
--dawn-high   #A9BFD6   cool pale blue — sky overhead, still holding night
--dawn-low    #F7DCC2   warm apricot — horizon, low sun
--asphalt     #CDC7CE   pale warm grey — the road ribbon
--verge       #B7D3BF   soft sage — roadside and ground
--ink         #2B2733   deep plum-black — all text, never pure black
--guards      #D0111B   Guards Red — the car's paint, and one CTA. Nothing else.
```

`--guards` is rationed hard. Car paint plus a single CTA. If it shows up on a third thing, it's overused. No gradient washes as decoration — the only gradient is the sky, and that's an environment, not a UI treatment.

Light background means silhouette aliasing is very visible. SMAA is mandatory, `dpr={[1, 2]}`.

### HDRI: sunset, not dawn

The environment map is drei's `preset="sunset"` (`venice_sunset_1k.hdr`), despite the "dawn" concept — verified against real rendered pixels, not eyeballed. `preset="dawn"` (`kiara_1_dawn_1k.hdr`) was tried first, for the obvious naming reason, but its own colour cast is cool and blue, and that leaked directly into the ground: `--verge` rendered blue-dominant (B>G>R) against a token that's supposed to be green-dominant (G>B>R) — a wrong hue, not just under-saturated, and no tone-mapping curve fixes a wrong hue (ACES/AgX/Neutral were all tested against dawn first; none recovered the green because the problem was never the tone-mapping curve). Switching to `sunset`'s warmer HDRI put the rendered ground back in the token's own channel order. The low-sun directional light — the thing actually named "dawn" in this brief — still does the real work of the look (position, colour, raking shadow); the HDRI is reflections and ambient fill underneath it, and gets picked for colour accuracy on that fill, not for matching the concept's name.

### Type

Two families, clearly distinct, both variable, both self-hosted. No Google Fonts CDN — it's a render-blocking round trip.

- **Jost** — display and headings. Geometric, Futura lineage. Futura is the typographic world of both German industrial design and the high-key pastel cinema this palette borrows from, so it sits in both halves of the brief at once.
- **Archivo** — body, labels, and every numeral. Real tabular figures, which is non-negotiable when half the site is live-counting telemetry that must not jitter.

No monospace anywhere. Monospace for small technical labels is the generic tell; Archivo's tabular figures do the job with more character.

Scale: 1.25 minor third. Body 17px / 1.55. Line length under 70 characters.

Avoid: ALL-CAPS eyebrow labels, one accent-coloured word in a headline, `→` appended to buttons, meta strings joined with middle dots.

### Layout

Not centred cards stacked over a canvas. Content rides in a narrow column while the road holds the frame.

```
desktop ─────────────────────────────────────────
┌──────────────┬────────────────────────────────┐
│              │          ~~ sky gradient ~~    │
│  POWERTRAIN  │                                │
│              │       [car, moving, off-axis]  │
│  GridSense   │    ═══════════════════════     │
│  React, TS,  │        road ribbon             │
│  ML          │                                │
│  ─────────   │                                │
│  Upchaar     │                                │
└──────────────┴────────────────────────────────┘
  36% column        64% stage — car sits low, never centred

mobile ──────────────────────────────────────────
┌────────────────────┐
│   [ car, 45vh ]    │
├────────────────────┤
│  POWERTRAIN        │
│  GridSense         │
└────────────────────┘
```

Left column, left-aligned, ragged right. The car sits low in frame and off-centre — a low camera makes a car look fast and planted, a centred one makes it look like a product shot. Leg 5 is the exception: the column drops away and the interior fills the frame.

Numbered markers appear **only** in leg 3, the service log, because internships genuinely are a dated sequence. Nowhere else.

---

## 3. Asset pipeline

Inspect has been run. Everything below is from the actual file — build against these facts, not assumptions.

**Source:** https://sketchfab.com/3d-models/porsche-911-with-interior-877b1bc1739f4a2bb65d62fd7ffd9f75
**Author:** n.brizitskaya
**License: CC Attribution 4.0** — attribution mandatory. Visible credit in the footer linking to the model page. The `license.txt` in `raw/` is the record of this.

**Shape of the file:** 78 meshes, 37 materials, 46 textures, no animations, `KHR_materials_clearcoat` in use. ~424k triangles, of which ~179k (42%) is interior.

### Gate result: the wheels are merged. A Blender pass is required.

Sketchfab groups geometry by material rather than by object — the `{object}_{material}_0` naming is the giveaway, and every mesh reports `instances: 1`. All four wheels live inside single shared meshes:

| Mesh | Actually contains | Triangles |
|---|---|---|
| `wheel_rim_rim_black_0` | all four rims, black parts | 16,432 |
| `wheel_rim_rim_chrome_0` | all four rims, chrome parts | 4,868 |
| `AO_tire_main_tires_0` | all four tyres | 9,728 |
| `discs_Discs_0` | all four brake discs | 15,856 |
| `brakes_all_brakes_0` | all four calipers — **static, never spins** | 12,274 |
| `metal_parts_rim_chrome_0` | **not wheel-local — static** | 7,314 |

**Correction, verified against the file:** `metal_parts_rim_chrome_0` is not wheel geometry despite the name. It spans 3.12 m in X — reaching from the front wheels to the rear — and its front-left cluster extends 0.42 m toward the car's centreline. That's suspension and brake-line hardware, not lug nuts. Including it in the spinning group skewed the front-left axle origin by 51%. It belongs with the calipers as static per-wheel hardware.

Rotating any of these spins all four wheels around one shared origin — they would orbit the car rather than roll. Section 5's wheel derivation cannot run until this is fixed.

### Two more problems the same Blender trip fixes

**The model is not centred.** Bounding box: X −4.558 → −0.024, Y −0.160 → 1.151, Z −1.702 → 1.014. The car sits entirely in negative X with its centre roughly 2.3 m from origin, and it dips below Y=0. Any heading change or rotation would pivot around a point well outside the car. Everything in section 5 assumes origin at the car's centre with wheel contact at Y=0.

**Z spans 2.72 m**, wide for a 911 even counting mirrors. The doors may be posed open in the source. Check, and close them if so — the cabin-entry beat needs to open them itself.

### Blender pass — about 30 minutes

1. **Import.** File → Import → glTF 2.0 → `raw/scene.gltf`.
2. **Close the doors if they're open.** Rotate `door_1` and `door_2` groups shut. Note the hinge axis and closed/open rotation values as you go — section 5 needs both.
3. **Join the wheel meshes.** Select all six meshes from the table above, Ctrl+J into one object.
4. **Separate by loose parts.** Tab into Edit Mode, A to select all, then P → By Loose Parts. This explodes into many objects — spokes, bolts, tyres, discs — which is expected.
5. **Regroup into four wheels.** Top orthographic view (Numpad 7). Box-select everything in one corner of the car, Ctrl+J to join, rename `wheel_FL`. Repeat for `wheel_FR`, `wheel_RL`, `wheel_RR`.
6. **Set each wheel's origin to its own axle.** With one wheel selected: Object → Set Origin → Origin to Geometry, Bounds Center. A wheel's bounding-box centre is its axle centre, so this is exact. Repeat for all four. **Getting this wrong is the difference between rolling and wobbling** — verify by rotating each wheel in the viewport before moving on.
7. **Re-centre the car.** Select everything, open the N panel, and translate until the car straddles the origin with the tyre contact patches at Z=0 (Blender is Z-up; the exporter converts to glTF Y-up).
8. **Optional, only if step 6 went smoothly:** separate the steering-wheel rim. `steering_wheel_signs_pl_leather_int_0` exists but is only the badge and controls — the rim itself is merged into the interior leather. Nice to have, not required.
9. **Export.** File → Export → glTF 2.0, format **glTF Binary (.glb)**, to `raw/porsche-split.glb`.

### What's already separate — the good news

- **Both doors are fully separate objects.** Meshes 43–59 are `door_1`, 60–77 are `door_2`, each carrying its own body panel, glass, leather, chrome, mirror and logo. The cabin entry works as designed.
- **Lights are addressable.** `headlights_flash_lights_0`, `lights_pattern_all_headlights_pattern_0`, and `red_light_back_red_light_main_0` — the last already carries an emissive texture. Both the ignition headlight moment and brake lights under deceleration are available.
- **Body paint is a material constant, not a texture.** Material 7 `body_main` has only occlusion and metallicRoughness maps, no baseColorTexture. Recolouring the car to `--guards` is a one-line `baseColorFactor` change with no texture editing. That is exactly what section 2's saturated-car rule needs.

### Derived model facts — use these, don't rediscover them

Output of `tools/prepare-model.mjs`. Verified against the real vehicle: wheelbase 2.4513 m vs 2.450 m actual, bbox 4.5343 × 1.3104 × 2.0051 vs 4.535 × 1.303 × 2.024 actual.

- **Axes.** Length is X, height is Y, width is Z. **Front is +X, rear is −X.** Wheel axle axis is **Z**.
- **Driver's side is −Z**, which makes **`door_2` the driver's door** — the one leg 5 opens.
- **Wheel origins.** FL/FR at X 1.2526, Y 0.3488. RL/RR at X −1.1987, Y 0.3535. Mirrored on Z.
- **Wheel radii differ.** Front 0.3488, rear 0.3535 — the car's real staggered setup. Ground is Y=0, so each origin's Y is that wheel's radius.
- **Ground plane is Y=0** and the car is centred on X and Z. No offset compensation needed anywhere.
- **Static, never rotate with the wheels:** `brake_*` (calipers) and `hardware_*` (suspension and brake lines).
- **Door 2 hinge**, for leg 5. **Correction, verified by rendering the result and looking, not just by reading transforms:** closed is NOT identity. door_1 (never posed open) carries a −90°-about-X rotation, (−0.7071, 0, 0, 0.7071) — a universal FBX→glTF axis correction baked onto every top-level part (mirror_middle, the car's own centrally-mounted interior mirror with no left/right side at all, carries the identical rotation), not something specific to either door's pose. An earlier pass reset door_2 to true identity instead of this shared correction; the visible symptom was mirror_door_2 (and the rest of door_2's subtree) rendering in the wrong place — not a small per-mirror offset, the whole door_2 closing to the wrong reference frame. Closed is translation (0,0,0), rotation (−0.7071, 0, 0, 0.7071) — door_1's own pose. Open is translation (−106.3989, 0, 90.7349), rotation (−0.6533, −0.2706, −0.2706, 0.6533). Slerp between them. The large translation numbers are correct — they're in pre-ancestor-scale local units, the same space the glTF already uses for that node.
- **Open is 45°** relative to the corrected closed pose (recomputed from the closed→open delta, not from world identity — the old 98.42° figure was measuring against the same wrong identity reference and is superseded). 45° is a believable real-door swing on its own, so the cabin entry can slerp to something close to the full value rather than needing to hold back — tune by eye once leg 5 is built.

### Textures: 280 MB of VRAM is the real problem

Geometry is not what will break this. The 46 textures request roughly **280 MB of GPU memory** — six 2048×2048 maps at 22.37 MB each, twenty-two 1024×1024 at 5.59 MB each. That will stall or crash mid-range phones outright.

Several are wildly disproportionate to what they're on:

| Texture | Now | Why it's absurd | Target |
|---|---|---|---|
| `belts_normal` + `belts_metallicRoughness` | 2048² each, 44.7 MB VRAM | **Seat belts.** 2,932 triangles, barely visible. Worst ratio in the file. | 512² |
| `hedlights_grid_normal` | 2048², 22.4 MB | Sits on an **80-triangle** mesh | 256² |
| `Discs_baseColor` + `Discs_metallicRoughness` | 2048² each, 44.7 MB | Brake discs, mostly hidden behind rims | 512² |
| `tires_normal` | 2048², 22.4 MB | Tread detail, never seen this close | 1024² |
| `LOGO1_clearcoat` | 512², 195 **bytes** | 195 bytes means it's a flat colour. Delete it and set clearcoat as a material constant. | delete |
| `leather_int_baseColor` | 1024², 12.6 KB | Compresses to nothing — it's near-flat colour | 256² |
| `number_plate1_baseColor` | 1024², 18 KB | Same | 256² |

Also: **every one of the 37 materials is `doubleSided: true`.** That disables backface culling and roughly doubles fragment shading cost across the whole car. Set the exterior panels, glass and body single-sided in Blender while you're in there — it's a free 30–40% fragment win and costs nothing visually on a closed car body.

### Optimise

After the Blender export, run:

```bash
npx @gltf-transform/cli dedup     raw/porsche-split.glb  s1.glb
npx @gltf-transform/cli prune     s1.glb                 s2.glb
npx @gltf-transform/cli weld      s2.glb                 s3.glb
npx @gltf-transform/cli resize    s3.glb                 s4.glb --width 1024 --height 1024
npx @gltf-transform/cli uastc     s4.glb                 s5.glb
npx @gltf-transform/cli meshopt   s5.glb                 public/models/porsche-desktop.glb
```

Capping textures by role plus WebP takes the desktop GLB from 26 MB to about 4.5 MB. That single step matters more than any geometry work.

**Mobile needs geometry removal, not smaller textures.** Once textures are handled, geometry dominates both files — the mobile variant sits barely under desktop because it carries the same ~424k triangles. Since section 7 skips the cabin entry on mobile, the interior is never seen there, so strip it in `prepare-model.mjs` when emitting the mobile source. Select by material rather than mesh name: `carbon_int`, `chrom_int`, `pl_leather_int`, `leather_int`, `leather_seam`, `leather_perforated`, `bl_pl_M_int`, `interior_grid`, `rug_interior`, `upholstery`, `belts`. That's roughly 170k triangles, about 40% of the model, and takes mobile to ~2.1 MB.

Two materials need care:

- **`bl_pl__GL_int_ext` stays.** The name says it — shared with exterior geometry.
- **`monitor` is not purely interior.** It carries three meshes: `monitors_seconds_monitor_0` (the dash screen, safe to remove) and `mirror_cover_door_1/2_monitor_0`, which are exterior trim on the door mirrors. Mobile sees the car from outside for the whole site, so removing those leaves visible gaps in both mirror housings to save 342 triangles. Remove by mesh name here, not by material.

**Only then consider `simplify`.** Three rules if you do:

- **Never simplify the wheels.** Decimated rims read as visibly polygonal the moment they spin, and they're on screen for the entire site.
- **Never simplify exterior body panels.** The roofline and rear fender curve are the whole read of a 911.
- **Do simplify the interior.** `plastic_all_bl_pl_M_int_0` alone is 86,178 triangles of interior trim — the largest mesh in the file by a wide margin — and `logo_all_LOGO1_0` spends 25,217 triangles on badges. Both take `--ratio 0.4` without anyone noticing.

**Budget:** desktop GLB ≤ 8 MB, mobile ≤ 3 MB.

### Typed component

```bash
npx gltfjsx public/models/porsche-desktop.glb -t -K -r public
```

**Never pass `-T` here.** It runs gltfjsx's own draco/prune/resize pass, which flattens every group node — including `wheel_FL/FR/RL/RR` and the door groups. Those nodes are the entire point of the prep step: rotating one spins a wheel, rotating another swings a door. `-T` would silently delete them and the model is already optimised by the chain above anyway.

`-K` keeps group nodes. `-r public` makes the generated `useGLTF()` path resolve against the public directory instead of 404ing under Vite.

Output is typed JSX with named refs, including the four `wheel_*` nodes. Those refs are what the animation layer drives.

## 4. Stack

```
vite + react 18 + typescript
three
@react-three/fiber
@react-three/drei
@react-three/postprocessing   # SMAA only
gsap + ScrollTrigger
lenis                          # smooth scroll
zustand                        # tiny store, section index only
```

**No bloom.** Pointless on a light scene and it's the neon-portfolio signature.

**Don't use drei's `<ScrollControls>`.** Real DOM sections with a fixed canvas behind keeps text real, indexable, selectable and keyboard-navigable, and lets GSAP handle pinning properly. `ScrollControls` renders content into the canvas and you lose all of it.

### On component generators (21st.dev Magic and similar)

Useful for the DOM overlay only — project cards, the contact form, nav, footer. Not for anything inside the `<Canvas>`; generated three.js is reliably worse than hand-written and much harder to debug when the camera goes wrong.

The real risk is styling. These tools emit shadcn/Tailwind defaults: uniform rounded cards, soft grey shadows, gradient washes, one border-radius on everything regardless of hierarchy. That's the component-kit look, and dropped in unmodified it will fight the dawn palette and make the site look like every other generated portfolio — which defeats the entire point of the 3D work.

So: generate structure and interaction logic, then strip the styling and re-skin against the tokens in section 2. Better still, paste the token block into the generation prompt up front. Anything that arrives with a shadow, a gradient, or a border-radius you didn't ask for gets it removed.

---

## 5. Motion architecture

The most important engineering section in the document. A driving car is four coupled systems, and getting any one wrong makes the whole thing read as fake.

### One curve drives everything

A single `THREE.CatmullRomCurve3` is the source of truth for the car's position, the car's heading, the road geometry, and the camera. Build the road by extruding a ribbon along that same curve. Nothing can desync because there's nothing to desync.

### Never setState during scroll

One mutable object, written by ScrollTrigger, read by `useFrame`. Zero React re-renders while scrolling. This is what separates 60fps from jank and it's the mistake almost everyone makes.

```ts
// scrollState.ts — plain mutable object, NOT react state
export const scroll = { progress: 0, velocity: 0, section: 0 }

ScrollTrigger.create({
  trigger: '#page',
  start: 'top top',
  end: 'bottom bottom',
  scrub: true,
  onUpdate: (self) => {
    scroll.progress = self.progress
    scroll.velocity = self.getVelocity()
  },
})
```

Push the section index into Zustand **only when it changes** — that's the one thing React needs, for text transitions.

### Wheel rotation — derive it, never spin it

The single biggest tell of a fake driving car is wheels turning at a constant rate while the car moves at variable speed. Derive rotation from distance actually travelled:

```ts
const pos = curve.getPointAt(p)
const dist = pos.distanceTo(prevPos)
const dir = Math.sign(p - prevP)          // handles reverse scroll
// Per-wheel radius: this car runs a staggered setup (245/35R20 front,
// 315/30R21 rear), so the rear wheels are ~4.7mm larger. Ground is at
// y=0, so each wheel's origin Y *is* its radius — read it, don't guess.
wheels.forEach(w => {
  const radius = w.userData.radius       // set once from node origin Y
  w.rotation.z += (dist / radius) * dir  // axle is Z: length is X, width is Z
})
prevPos.copy(pos); prevP = p
```

Scroll is scrubbed, so users can scroll backwards and the car drives in reverse. Let it — wheels reverse too and it feels responsive. Don't clamp it.

### Steering from path curvature

Front wheels turn into corners. Take the tangent now and slightly ahead, take the signed angle between them, clamp and damp:

```ts
const t0 = curve.getTangentAt(p)
const t1 = curve.getTangentAt(Math.min(p + 0.002, 1))
const yaw = Math.atan2(t1.x, t1.z) - Math.atan2(t0.x, t0.z)
const steer = THREE.MathUtils.clamp(yaw * STEER_GAIN, -0.5, 0.5)
frontWheelGroups.forEach(g => g.rotation.y = damp(g.rotation.y, steer, 6, dt))
```

If the steering wheel is a separate node, drive it from the same value at roughly 8× the angle. Cheap, and it's the detail people notice without knowing why.

### Body dynamics — small numbers

Roll into corners, pitch under acceleration and braking. This is what implies 1,640 kg.

- **Roll** — from lateral acceleration, `-yawRate * speed * ROLL_GAIN`. Maximum about 3°.
- **Pitch** — from change in speed. Nose lifts under power, dives under braking. Maximum about 1.5°.

Both damped. Overdo either and it looks like a boat, not a Porsche. If in doubt, halve it.

### Car heading

Don't snap the car to the immediate tangent — it judders on tight curves. `lookAt` a point slightly ahead on the curve and damp the resulting quaternion.

### Chase camera

Offset in the car's local space, but damped with a **longer lambda than the car itself** so it lags slightly through corners. That lag is the difference between a camera car and a rigid mount, and it's a one-line change that does most of the cinematic work.

Per-leg overrides on top: drop to wheel height for the GridSense leg, rise for the projects overview, swing to the driver's door and push in for the cabin.

### Horizontal pinning for leg 1

One ScrollTrigger pins the section and drives both the track translation and the car's progress along that segment.

```ts
gsap.timeline({
  scrollTrigger: {
    trigger: '#projects',
    start: 'top top',
    end: () => `+=${track.scrollWidth}`,   // function, so it recalcs on resize
    pin: true,
    scrub: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => { scroll.legProgress = self.progress },
  },
}).to(track, {
  x: () => -(track.scrollWidth - window.innerWidth),
  ease: 'none',
})
```

Four things that will bite:

- **Lenis and ScrollTrigger must be explicitly wired together.** `lenis.on('scroll', ScrollTrigger.update)` and drive `lenis.raf` from `gsap.ticker`, with `gsap.ticker.lagSmoothing(0)`. Skip this and pinning desyncs from smooth scroll in ways that look like random jitter. This is the single most common bug in this stack.
- **Pinning injects a spacer element into the DOM.** The `<Canvas>` must live outside the pinned container or it'll get displaced mid-section. Put it in a fixed wrapper at the root.
- **`end` must be a function and `invalidateOnRefresh` must be true**, or the section breaks on resize and on mobile browser-chrome collapse.
- **Keyboard focus escapes the viewport.** Pinned horizontal tracks are notorious for this — Tab moves focus to a card that's still 2000px off-screen and the page appears frozen. Listen for `focusin` on the track and scroll the timeline to bring the focused card into view.

### Speed cues

Skip motion blur — expensive, and it muddies a pastel scene. Road markings passing under the car are the speed cue and they're free. Instance them along the curve and let them do the work.

---

## 6. Performance budget

Hard numbers, verified by measurement, not vibes.

- 60 fps desktop, 30+ fps mid-range Android
- Desktop GLB ≤ 8 MB, mobile ≤ 3 MB
- JS + fonts ≤ 2 MB gzipped
- LCP < 2.5s
- One `<Canvas>` for the whole page

**On VRAM.** The original ~20–30 MB target assumed KTX2 compression. Without KTX-Software installed, WebP cuts download size but still decodes to full uncompressed RGBA on the GPU, so texture memory lands nearer 75 MB desktop and 36 MB mobile. That is fine: desktop GPUs carry 4–8 GB, and 36 MB on mobile is unremarkable. The alarming number was the original 280 MB, and that's long gone. Treat measured fps as the real budget and revisit KTX2 only if a real device says otherwise.

Techniques:

- `dpr={[1, 2]}` with `<AdaptiveDpr />`
- `<Preload all />` so the first frame doesn't hitch on shader compile
- **One HDRI environment map plus one low-angle directional light.** Not five lights. An env map does most of the work on reflective paint and costs almost nothing, and the low sun gives the long shadows the palette is built around.
- Roadside scenery via `InstancedMesh` along the curve. Keep the forms abstract — simple pastel volumes read as intentional, whereas low-poly buildings read as under-budget. Don't attempt a city.
- Cull scenery aggressively outside the frustum; the car is always visible so it gets no culling win.
- Lazy-load the GridSense heat-map shader — not needed until leg 4.
- Interior geometry stays hidden until leg 5 approaches.

---

## 7. Fallbacks — build them, don't defer them

**`prefers-reduced-motion`** — no scroll-driven driving. Car renders once at a good three-quarter angle and stays put. Sections appear normally. Full content, zero motion sickness. A site where scroll moves a vehicle through space is exactly the case this media query exists for, so treat it as a real requirement.

**No WebGL or failed context** — static hero render as an image, the whole site reads as a normal portfolio. Detect with a canvas probe, don't assume.

**Mobile** — light GLB, skip the cabin entry (leg 5 becomes an exterior close-up at the driver's door), fewer camera keyframes, less scenery.

**Mobile, leg 1 specifically** — don't ship the pinned horizontal section to touch. Pinned horizontal scroll on mobile hijacks the gesture users rely on to get down the page, and it's a known source of people getting stuck. Swap it for a native `overflow-x: auto` track with `scroll-snap-type: x mandatory`. Better UX, far less code, and the car just drives past at its own pace underneath.

**Always** — every piece of content lives in the DOM. The contact form on the infotainment screen must also be a real, focusable, submittable `<form>`. Visible keyboard focus rings throughout, in `--guards`.

---

## 8. Content

Source of truth is the live site at tanmay-portfolio-3.vercel.app — it has fifteen projects, considerably more than the resume. Pull names, stacks, bullets and both links from there. Verbatim numbers, no inflation.

### Curate hard: fifteen down to seven

Fifteen markers along a road is not a portfolio, it's a traffic jam. Each one gets a few seconds of attention, the leg becomes enormous, and the average quality of the set drops to the level of its weakest member. A 3D showcase is an argument for your best work, not an archive of all of it.

**Leg 4 — the road-risk pair.** GridSense and RiskPath, together, as described in section 1.

**Leg 1 — five, scrolling horizontally:**

| Project | Why it earns a marker |
|---|---|
| NooK | Real-time occupancy across 90+ seats, server-authoritative sessions, automated seat recovery. Genuine systems work, not CRUD. |
| bunkr | Invite-code roles, RLS on every table, signed-URL media. Shows you think about security unprompted. |
| Groq Docs RAG | Scrape, chunk, embed, retrieve, generate, with a TF-IDF fallback. The ML-infrastructure signal. |
| NullTrace | Log analysis, service health, automated incident insight. Same diagnostic instinct the whole site runs on. |
| Zeno | Groq chat, four personas, sub-200ms streaming, Three.js orb. AI product sense plus 3D. |

**Everything else goes in a plain text list at the end** — name, one line, GitHub link, no images, no cards. Cognify, Upchaar, EchoForge-AI, RetainIQ, Feedora, Tanmay Studio, RepoScan. Being complete is fine; being complete in the same visual weight as your best work is not.

**Drop Spotify Clone from the new site.** A CSS-only clone of someone else's UI is a tutorial exercise, and on a page that also contains a published ML paper it pulls the average down more than it adds coverage.

### Experience

ShadowFox (07/2025) → Intern Career Path (05–06/2026) → Ladybird Web Solution (06/2026) → Google Gemini Student Ambassador (05–09/2026). Chronological, numbered, dated like a service log. Education goes in the plain list at the end, not on the road.

### Publication

GridSense preprint, Zenodo, DOI 10.5281/zenodo.21724749, co-authored with Anandi Mahajan. Its own line in leg 4. A published preprint as an undergraduate is the single strongest thing on the page and it's currently buried — give it room.

### Copy rules

The current site says "I design and engineer digital experiences for the web," "Creative developer," and "Passionate about building scalable web applications." Every one of those could be on anyone's portfolio, which means none of them say anything. Replace them all.

Plain verbs, sentence case, no filler. The voice is someone writing up a test drive, not a brand writing a tagline. "Shipped to production," not "crafting digital experiences." Buttons say what happens: "Open GridSense", "Read the paper", "Send message".

Specificity is the whole game. "8,173 incidents, 0.640 macro F1" beats any adjective available.

---

## 9. Build order

In sequence. Verify each before moving on.

1. **Asset only.** Vite + R3F scaffold, optimised model rendering, correct scale and orientation, HDRI plus low sun, contact shadow. Static camera, nothing else. Check fps and bundle size — if this isn't 60fps parked, nothing later will be.
2. **The curve.** Build the CatmullRomCurve3, extrude the road ribbon along it, and render the curve as a visible debug line. Get the route shape right before anything drives on it.
3. **Driving.** Car follows the curve on scroll. Then wheels, then steering, then body roll and pitch, in that order, tuning each before adding the next. Debug HUD showing progress, speed, steer angle, fps. Expect to spend real time here — this is the site.
4. **Chase camera.** Base follow plus per-leg overrides.
5. **Legs 0 and 5.** The needle sweep and the cabin entry are the two beats the site is judged on. Build the hardest things while you have energy for them.
6. **Legs 1–4.** One at a time, each finished before the next.
7. **Type and content.** Real copy, real numbers, the column layout, responsive to 360px.
8. **Fallbacks.** Reduced motion, no-WebGL, mobile variant.
9. **Perf pass.** Lighthouse, real device, throttled network. Fix against section 6.

---

## 10. Footer requirements

- Model credit: "Porsche 911 with interior by n.brizitskaya, CC BY 4.0", linking to the Sketchfab page. **Required by the licence.**
- Porsche is a trademark of Dr. Ing. h.c. F. Porsche AG. A personal non-commercial portfolio is low risk, but don't imply endorsement and don't use Porsche's crest, wordmark, or official typeface.

---

## Status

**2026-09-21 — Car visual quality pass.** Diagnosed and fixed all four items:

1. **Normal quantization** — the meshopt step's own default was already 10 bits, not 8; a raw-vs-optimised pixel diff at a grazing angle on body_main showed the gap was sub-perceptual even before this. Raised explicitly to 12 (`--quantize-normal 12` in `tools/optimize.sh`) anyway as cheap insurance.
2. **Clearcoat** — `body_main` shipped with none (only `LOGO1`'s badge material had it). Added `clearcoat=1`, `clearcoatRoughness=0.05` in `Car.tsx`'s material setup, since the source `.glb` has no baseColorTexture to edit.
3. **Reflections** — `environmentIntensity={0.35}` on `<Environment>` dims the HDRI scene-wide to protect `--verge`'s ground colour. Every car material now sets `envMapIntensity = 1/0.35` in the same traversal, cancelling that dim for the car only; `Ground.tsx` is untouched and stays at the protected 0.35.
4. **Anti-aliasing** — added a `useQuality` store (`src/scene/quality.ts`) written by `QualityMonitor.tsx`, true only during leg 0/5 of the route (`LEG_START[1]`/`LEG_START[5]`) — **superseded** by the "cold start fps" fix in the 2026-09-22 bug-fix entry below, which narrowed this to the camera actually being still, not just the car. While stationary: `<AdaptiveDpr>` is unmounted (so dpr can't be scaled below the device's native ratio) and `EffectComposer`'s `multisampling` goes from 0 to 4. **Measured, not assumed**: forcing `dpr` to a literal `2` (rather than leaving the `[1,2]` clamp alone) was tried first and cost an order of magnitude — parked fps fell from ~52 to ~7–15 on this dev machine, because its real `devicePixelRatio` is 1 and a literal 2 forced 4x the native pixel count. Fixed by never touching the `dpr` prop and only toggling `AdaptiveDpr`. `multisampling={8}` was also tried and measured (~29fps parked) before settling on `multisampling={4}` (~36–38fps parked) as the better cost/quality trade-off. Driving fps is unaffected (~52–53fps mean, matching pre-pass numbers) since all four changes are inert once the car starts moving.

Also spent the desktop GLB's slack (4.77MB → ~4.80MB of the 8MB budget) on wheel, tyre and badge textures (`rim_black`/`rim_chrome`/`tires`/`LOGO1` metallicRoughness kept at their original 1024, `tires_normal` kept at 2048) by naming them out of `optimize.sh`'s broad resize rules instead of resizing everything uniformly.

Before/after screenshots at the same hero angle: `screenshots/quality-before.png` / `quality-after.png` (full frame) and `-crop.png` (zoomed on the rear deck/roof, where clearcoat + reflections + AA are most visible).

**2026-09-22 — Opening redesign (hero / cold start / drive).** Rewrote CLAUDE.md section 1 and PROMPTS.md step 6 first, then built to match:

- New `src/scene/HeroOverlay.tsx` (real DOM, mounts unconditionally — never waits on the GLB) and `src/scene/ModelLoader.tsx` (a separate, minimal `useProgress()` readout, not a splash screen). `Car.tsx` fades every material's opacity 0→1 on mount instead of popping in.
- `scrollState.ts` now splits the page into three named px budgets — `HERO_PX` (700), `COLD_START_PX` (2200), `ROUTE_PX` (28,000, **unchanged** from the old single-phase constant) — and derives `scroll.phase`/`scroll.phaseProgress`/`scroll.routeP` each `ScrollTrigger` update (`ScrollSetup.tsx`). `Car.tsx` now drives the curve from `scroll.routeP` (0 through hero+cold-start, real progress only in the route budget) instead of raw `scroll.progress`.
- `cameraShots.ts` gained a `HERO` shot (low three-quarter front, off-axis right) and an exported `lerpShot` helper; `ChaseCamera.tsx` holds `HERO` through the hero phase and blends `HERO → CHASE` across the cold-start budget, handing off exactly onto the route's own progress-0 keyframe.
- `Car.tsx` also drives the ignition self-test: headlights (`materials.lights`, no baked emissive colour so one had to be set explicitly), a faint idle-shudder jitter on top of the roll/pitch dynamics, and `telemetry.rpm` (revs to a peak, settles to idle) — all pure functions of `scroll.phase`/`phaseProgress`, so scrolling backward genuinely reverses the sequence. `DebugHud.tsx` surfaces `phase`/`rpm` as the stand-in for "the leg 2 telemetry HUD waking up" — there's no separate needle-reveal element.
- **Caught and fixed by the "verify with the HUD" check**: `QualityMonitor.tsx` was still comparing `LEG_START`'s route-relative thresholds against raw whole-page `scroll.progress`, which the new budgets made the wrong scale entirely (would have driven the parked-quality logic off the wrong signal). Fixed to check `scroll.phase !== 'route'` first, then `scroll.routeP` against `LEG_START`. `tools/measure-speed.mjs` also had to jump past the new `HERO_PX + COLD_START_PX` runway before starting its timed cruise measurement.
- Calibration re-verified after the change: steady cruise reads 58.8–65.1 km/h (target ~60), roll peaks at 2.99° through the first bend (`ROLL_MAX_RAD` is 3°), braking decays to 0 within 2s — all matching pre-change numbers, confirming `ROUTE_PX` staying at 28,000 preserved the calibration.
- GitHub/LinkedIn links were `href="#"` placeholders — the real URLs weren't discoverable in this repo or the live site's client-rendered markup, so they were asked for rather than guessed. Filled in once provided (see the 2026-09-22 bug-fix entry below).

Screenshots at the four requested moments: `screenshots/opening-0-hero.png` (on load), `opening-1-midcoldstart.png`, `opening-2-endcoldstart.png`, `opening-3-drive5pct.png`. Captured by the new `tools/capture-opening.mjs`.

**2026-09-22 — Two bugs, hero links, one quality setting.**

1. **Wheels stopped spinning.** Confirmed via git history: `tools/optimize.sh` regenerates `Porsche.tsx` with gltfjsx, and that command only ever passed `-K` (`--keepgroups`, keeps the `<group>` wrapper from being pruned) — never `-k` (`--keepnames`, lowercase, the *separate* flag gltfjsx actually gates `name="..."` on: `src/utils/parser.js`, `if (obj.name.length && (options.keepnames || ...))`). Re-running the visual-quality pass's `optimize.sh` regenerated the component without `-k`, silently dropping `wheel_FL/FR/RL/RR` and `door_1`/`door_2`'s `name=` attributes; `Car.tsx`'s own `if (wheels.FL)` guard swallowed the resulting lookup failure with no error anywhere. Fixed at the source — `optimize.sh` now passes `-t -k -K -r public`, so names survive every future regeneration — rather than working around it with a runtime traversal. Also added `src/scene/modelIntegrity.ts`: any future missing wheel or door now `console.error`s AND shows a `--guards`-red banner on the debug HUD, so this specific failure mode can never be silent again. Verified with an actual mid-spin image sequence (`screenshots/wheel-spin-*-crop.png`), not just the HUD's angle readout.
2. **Doubled side mirror.** `tools/prepare-model.mjs` closed the posed-open `door_2` by resetting its local transform to *true* identity — wrong for this file: `door_1` (never opened, so its own local transform IS the correct "closed" reference) carries a −90°-about-X rotation that's a universal FBX→glTF axis correction baked onto every top-level part (`mirror_middle`, the car's own centrally-mounted interior mirror with no left/right side at all, carries the identical rotation — confirming it's not part of either door's specific pose). Resetting to true identity instead of that shared correction rotated door_2's *entire* subtree by an extra ~90° it should never have had; the mirror was just the part of that where it was most obvious. Fixed by deriving the closed pose from whichever door was never open, instead of assuming a fixed value — verified directly: doing so puts `mirror_door_1`/`mirror_door_2`'s world centres at symmetric (X, Y, ±Z) positions (dX=dY=0, Z sum=0, down from wildly asymmetric before). This also corrected the previously-documented door hinge angle from 98.42° (measured against the same wrong identity reference) to a believable 45°. Verified with `screenshots/mirror-driver-side.png` / `mirror-passenger-side.png`, both now showing a single, correctly-placed mirror.
3. **Hero links** — `HeroOverlay.tsx`'s GitHub/LinkedIn placeholders replaced with the real profile URLs. Resume now points at `/resume.pdf`, this project's own copy (downloaded once from the old portfolio site into `public/resume.pdf`, so this site doesn't depend on that one staying up).
4. **Cold-start fps** — `QualityMonitor.tsx`'s "stationary" flag was true for the entire cold-start budget because the *car* is parked there, but the *camera* keeps swinging `HERO -> CHASE` the whole time (`ChaseCamera.tsx`) — spending the parked-quality settings (multisampling 4, `AdaptiveDpr` off) on a moving shot made it choppy at ~37fps instead of smooth. Narrowed to the two moments the camera is actually still: the hero phase itself, and the route's `FINAL_HOLD_P` (0.985, newly exported from `cameraShots.ts`) once `DOOR_PUSH` is fully settled — leg 5 up to that point still swings through `DOOR_SWING`, so it no longer counts either. Mid-cold-start fps measured at ~48.6fps after the fix (was ~37fps).

All four verified against a rebuilt pipeline (`node tools/prepare-model.mjs && bash tools/optimize.sh`), a clean `tsc --noEmit`, and the screenshots referenced above.

**2026-10-05 — Legs 1–5, content, fallbacks, perf pass. Feature-complete.**

- **Scroll model.** `#page` is now `PAGE_HEIGHT_PX + 100vh` tall, so ScrollTrigger's range is exactly `PAGE_HEIGHT_PX` and scroll px map 1:1 onto the budgets (`routeToScrollPx()` in `scrollState.ts`). Every leg's DOM section is absolutely placed at its own pixel span with a sticky column inside — no GSAP pin, no pin spacer. Cruise re-measured after the change: 55.5–64.5 km/h, peak roll 2.64°, braking back to 0 within 2s.
- **Leg 1.** Five roadside slabs (`RoadsideMarkers.tsx`) at `MARKER_FIRST_M + i * MARKER_SPACING_M` (`routeMarks.ts`); the card track's offset is computed from the same two constants (`Sections.tsx` `trackOffset`), with a symmetric hold so a card is still while the car is near its marker. Focus on an off-screen card drives the car to that card's marker (`scrollToPx` via Lenis). Mobile uses a native `overflow-x` + scroll-snap track instead.
- **Leg 2.** Real numbers counting up on entry (reversible, pure function of `routeP`), plus a spec-sheet `<table>`. The live gauge (`TelemetryGauge.tsx`) is the needle sweep from the cold start and stays on through the drive; rpm now follows smoothed road speed.
- **Leg 3.** Four numbered posts (the only numbered markers on the site); the DOM log highlights the entry whose post was last passed.
- **Leg 4.** `RiskLayer.tsx`, lazy-loaded once the car reaches leg 3: a ShaderMaterial ribbon over the leg-4 road, value-noise severity per cell, heat ramp revealed 26m ahead of the car. Only saturated colour in the world; tops out orange-red, not `--guards`.
- **Leg 5.** The car brakes to a stop via `driveP()` (constant deceleration from the cruise slope, no speed jump), while scroll keeps running the camera: `DOOR_SWING → DOOR_PUSH → CABIN_ENTER → CABIN`. `door_2` slerps between the documented closed/open poses. A cabin fill light ramps up with the door. Contact details are drawn on the dash's centre screen (`InfotainmentScreen.tsx`; position found by raycasting the rendered cabin: x=0.452, facing −X), and the real `<form>` (mailto hand-off, no backend) sits in a panel over the passenger side so the wheel and screen stay visible. `--guards` CTA: "Send message", the only one.
- **Bug fixed on the way:** the car's fade-in reset every material's opacity to 1, so the glass rendered opaque black and the model's `invisible_all` helper meshes showed as white blobs. It now fades each material to its own original opacity.
- **Legibility.** A pale column pane (`ColumnPane.tsx`) sits behind leg text on desktop; scenery got a small emissive lift and sits further from the road. A short-viewport media query keeps every column inside 720px (checked at 1280×720, 1366×768, 1440×900) — Lenis owns the wheel, so a column can't scroll on its own.
- **Fallbacks.** `src/env.ts` probes once: reduced motion (`?static`), WebGL via a canvas probe (`?nowebgl`), mobile, `?debug`. Static layout = hero + all sections as a normal page over the parked car or `public/hero-static.jpg` (rendered by `tools/capture-static-hero.mjs`). A lost WebGL context mid-drive drops to the same static page. Mobile loads `porsche-mobile.glb` (`Porsche.tsx` takes `url` and optional-chains geometry; `optimize.sh` re-applies both patches on regeneration).
- **Debug scaffolding** (HUD, Stats, route line, camera keys) only mounts with `?debug`.
- **Measured on the production build** (`tools/measure-drive.mjs`): desktop 1440×900 — LCP 628ms, legs 1–4 at 57–66fps mean, cold start ~50, leg 5 ~52 (parked MSAA on). Mobile 390×844 @2x with 4× CPU throttle — 34–39fps mean, LCP 1.3s. JS 464KB gzip + fonts ~135KB; desktop GLB 4.9MB, mobile 2.1MB. All inside section 6's budget.
- Screenshots: `screenshots/leg-*.png` (desktop, every beat), `m-*.png` (mobile), `fallback-*.png`, `short-leg4.png`.

**2026-10-05 — Feedback pass: smoothness, framing, sunrise, scenery, column.**

- **Car left the frame on fast scroll.** `ChaseCamera.tsx` damped the camera's *world* position, which lags by speed/lambda — a flick through leg 1's side-on shot outran it. The camera is now carried rigidly by the car and only its *offset* (and the aim's offset) is damped (`CAMERA_OFFSET_LAMBDA`). Verified mid-flick with `tools/check-fast-scroll.mjs`: the car stays framed in every shot.
- **Jerky motion.** The car followed raw scroll, so every wheel notch was a jolt. `Car.tsx` now eases its own route progress toward scroll (`ROUTE_FOLLOW_LAMBDA` 3.2, ~0.3s) with a top speed (`ROUTE_MAX_SPEED_MPS` 120), published as `carPose.routeP`; camera shots, the leg 1 track, the door and the cabin light all read that. Cruise now reads 59.5–59.9 km/h steady (was 55–65 jittery). Keyboard focus jumps set `carPose.snap` so the car appears at the focused card instead of driving there.
- **Static sky.** `DawnCycle.tsx`: the drive is the sunrise — pre-dawn lilac/rose at the hero, the exact `--dawn-high`/`--dawn-low` tokens by the projects, clear morning by the cabin. Sky colours, a soft sun disc and horizon glow (`Sky.tsx`), fog, sun colour/intensity/elevation (6°→24°, shadows shorten) and a `--sky-horizon` CSS variable for the DOM all follow it.
- **Scenery.** `Scenery.tsx` rewritten: avenues of lollipop/poplar trees at a steady rhythm on both verges (kept clear of signs), rows of rounded pastel buildings squared to the road and pushed back behind leg 1's boards, soft hills on the horizon. No shadow casting/receiving — the sun's shadow camera only spans the car, so it was pure cost. Project markers are now framed signboards on two ink posts carrying the project's key figure; leg 3 posts are numbered panels.
- **Column.** Frosted pane tinted with the live horizon colour, an instrument strip (current leg, trip km, a dawn clock 05:38→06:40), a to-scale route map with the car beside the speed gauge, project cards with a key figure (`content.ts` `figure`), outlined stack tags, a five-step position indicator, and a heat-ramp legend in leg 4.
- Re-checked: no column overflow at 1280×720 through 1920×1080, every keyboard focus stop on screen, mobile layout.

**2026-10-05 — Visual redesign at the owner's direction. Supersedes section 2's palette and type.**

The owner found the pastel look too basic ("font and color is also simple... add background more eye catching") and asked for a more professional redesign of every content section, new fonts and new colours. New direction: **sunrise over the test track**, shot like a car launch.

- **Palette** (`src/index.css`): night `#141A3C`, violet `#5B3F7E`, apricot glow `#F49A5E`, gold `#F2B65E` (numbers and highlights), ivory `#F3ECE2` (all text), Guards Red `#D0111B` still only the car and the single "Send message" CTA. Text is ivory on dark glass panels; focus rings are gold (red was too dark on the night sky).
- **Type**: Archivo at full 125% width, weights 700–800, for display (car-badging feel); Instrument Sans for body. Jost removed.
- **Scene** (`DawnCycle.tsx`, `Sky.tsx`, `colors.ts`, `Scenery.tsx`): indigo sky with a violet band, apricot horizon and fading stars, warming to gold and early-morning blue over the drive; deep teal fields, slate road (`ASPHALT #3D3C4C`, `VERGE #36544F`), dusk-toned trees/buildings, low violet hills far back.
- **Layout**: fixed top bar (`TopNav.tsx`) with name, live leg/trip/clock, jump links that snap the car (`carPose.snap`) and a Resume button; a rebuilt hero with a huge two-line wide name, one credential line for the published paper, and "See the work" / "Resume" buttons; every leg on a dark frosted column with gold figures.
- Re-checked: no column overflow 1280×720–1920×1080, every focus stop on screen, mobile, ~50fps through the legs on the dev machine (unchanged from before the redesign). `public/hero-static.jpg` regenerated in the new look.
