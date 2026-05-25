# Architecture

The entire app lives in `sample.html` (~845 lines, ~93 KB). It is organized top-to-bottom as one HTML document with one `<style>` block and one `<script type="module">` block.

## File anatomy

| Lines     | Section                                                                           |
| --------- | --------------------------------------------------------------------------------- |
|   1– 29   | `<head>`, font preconnect, CSS variables (`--bg`, `--text-*`, `--glass`, `--ease`)|
|  30–218   | CSS — hero, controls bar, hint, counter, info `#card`, `.mapTag`, vignette        |
| 220–267   | `<body>` — `#threejs` mount, hero, controls, `#card` template                     |
| 269–276   | `<script type="importmap">` — pins `three` and `three/addons/` to jsdelivr        |
| 278–290   | Module imports + **inline GeoJSON** (one giant line)                              |
| 293–338   | Renderer, scene, camera, CSS2D, OrbitControls, lights, post-processing            |
| 340–346   | Equirectangular projection helpers                                                |
| 348–389   | Map materials — `sideMaterial` (custom shader) + `createTopMaterial` (Phong)      |
| 391–419   | Floor (CircleGeometry + shader)                                                   |
| 421–438   | Particle field (250 Points, additive blending)                                    |
| 440–458   | Ripple rings (3 rings, animated phase offset)                                     |
| 460–558   | **`drawFeature()`** — extrude polygon, edge line, CSS2D tag, beam                 |
| 559–620   | `hashStr`, `makeBeam` (cylinder + dot + halo), `centerMap`                        |
| 632–650   | `loadMap()` — iterate `INLINE_GEOJSON.features`, build models                     |
| 652–700   | Info card — show / close / highlight / clear highlight                            |
| 703–732   | Raycaster — hover cursor + click selection                                        |
| 734–757   | Toggle buttons — pillars / tags / ripple / particles                              |
| 759–803   | **`animate()`** — RAF loop driving ripples, particles, beam halos, composer       |
| 805–815   | `resize` handler                                                                  |
| 816–840   | `introAnim` — camera flies in (quintic ease)                                      |

## Logical layers (currently entangled)

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION   hero, counter, controls, #card, .mapTag     │
├─────────────────────────────────────────────────────────────┤
│  INTERACTION    raycaster, hover, click, toggles, OrbitCtrl │
├─────────────────────────────────────────────────────────────┤
│  RENDERING      scene, lights, post-processing, RAF loop    │
├─────────────────────────────────────────────────────────────┤
│  MESH BUILDING  drawFeature, makeBeam, createTopMaterial    │
├─────────────────────────────────────────────────────────────┤
│  PROJECTION     projection(), PROJ_CENTER, PROJ_SCALE       │
├─────────────────────────────────────────────────────────────┤
│  DATA           INLINE_GEOJSON, hashStr-derived metrics     │
└─────────────────────────────────────────────────────────────┘
```

All six layers currently share one module scope. The refactor plan in [task.md](../task.md) targets splitting these into separate ES modules.

## External dependencies

| Source                                  | Loaded as              |
| --------------------------------------- | ---------------------- |
| `cdn.jsdelivr.net/.../three@0.181.0`    | importmap → ESM        |
| `fonts.googleapis.com` (Geist, Instrument Serif) | `<link rel=stylesheet>` |

No npm, no bundler, no fallback if either CDN is unreachable.

## Entry sequence

1. Browser parses HTML → CSS animates `.hero`, `.controls`, `.hint`, `.counter` in (1.6 s–2 s).
2. Module script runs → builds renderer, scene, camera, lights, floor, particles, ripples.
3. `loadMap()` iterates inline GeoJSON, builds 55 area models, centers the group.
4. `animate()` starts RAF.
5. `setTimeout(introAnim, 600)` flies the camera into final orbit position over 2.4 s.
