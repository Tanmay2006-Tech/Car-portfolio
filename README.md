# Cold Start

3D portfolio for Tanmay Tripathi. A sunrise test drive: the car starts cold, pulls away, runs a route past the work, and parks — then the camera gets in.

Built with Vite, React 18, TypeScript, React Three Fiber, GSAP ScrollTrigger and Lenis. The full design brief is in `CLAUDE.md`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ on http://localhost:4173
```

URL flags, for checking things without changing OS settings:

| Flag | What it does |
|---|---|
| `?debug` | Debug HUD, fps stats, route line, camera keys 1–4, `D` toggles the route line |
| `?static` | The reduced-motion layout (same path as `prefers-reduced-motion`) |
| `?nowebgl` | The no-WebGL layout with the still image |

## The route

| Leg | Content | Where it lives |
|---|---|---|
| 0 | Hero, cold start (ignition sweep, headlights) | `src/scene/HeroOverlay.tsx`, `Car.tsx` |
| 1 | Five projects, horizontal track synced to roadside markers | `src/sections/Sections.tsx`, `src/scene/RoadsideMarkers.tsx` |
| 2 | Telemetry: real numbers and a spec sheet | `Sections.tsx`, `src/sections/TelemetryGauge.tsx` |
| 3 | Service log: four internships, numbered posts | `Sections.tsx`, `RoadsideMarkers.tsx` |
| 4 | GridSense, RiskPath and the paper; the road becomes the risk layer | `Sections.tsx`, `src/scene/RiskLayer.tsx` (lazy-loaded) |
| 5 | About, then the car stops, the driver's door opens and the camera enters the cabin | `Car.tsx`, `cameraShots.ts`, `src/sections/ContactPanel.tsx` |

All copy lives in `src/content.ts`.

## Fallbacks

- **Reduced motion**: no scroll-driven driving; the car stays parked at the hero angle and every section reads as a normal page.
- **No WebGL / lost context**: the same page over a still render (`public/hero-static.jpg`).
- **Mobile**: interior-stripped 2.1 MB model, car in the top 45% of the screen, a native swipe track for projects, and leg 5 ends outside the car at the door.

## Tools

| Script | Purpose |
|---|---|
| `node tools/capture-legs.mjs [url] [--mobile]` | Screenshot every beat of the route |
| `node tools/capture-fallbacks.mjs [url]` | Screenshot both fallback layouts |
| `node tools/measure-drive.mjs [url] [--mobile] [--cpu=4]` | fps per leg and LCP while scrolling the whole route |
| `node tools/check-focus.mjs [url]` | Tab through the page and confirm every focus stop is on screen |
| `node tools/measure-speed.mjs [url?debug]` | Cruise speed, roll and braking calibration |
| `node tools/check-overflow.mjs [url]` | Every leg's text column fits the viewport at 1280×720 → 1920×1080 |
| `node tools/check-fast-scroll.mjs [url]` | Screenshots mid-flick through leg 1: the car must stay in frame |
| `node tools/profile-drive.mjs [url] [--mobile] [--cpu=4] [--source=dist/assets/index-*.js]` | CPU profile of a drive, top functions by self time |
| `node tools/capture-og.mjs [url]` | Renders the 1200×630 social-share image source |
| `node tools/prepare-model.mjs && bash tools/optimize.sh` | Rebuild both GLBs and the typed model component from `raw/` |

## Deploy

It's a static Vite build. On Vercel, import the repo and keep the detected defaults (build `npm run build`, output `dist`).

## Credits

3D model: [Porsche 911 with interior](https://sketchfab.com/3d-models/porsche-911-with-interior-877b1bc1739f4a2bb65d62fd7ffd9f75) by n.brizitskaya, CC BY 4.0. Porsche is a trademark of Dr. Ing. h.c. F. Porsche AG; this personal portfolio is not affiliated with or endorsed by Porsche.
