# React App Architecture

The live demo is a **React 18 + Vite 5 + TypeScript** app using **react-three-fiber** (declarative Three.js) + **drei** (helpers) + **postprocessing** (bloom). It is the build target for `npm run build` and the GitHub Pages deploy.

> `sample.html` at repo root is the original single-file prototype and is **not** wired into the build. It is kept as a visual/behavioural reference. Do not edit it expecting changes to land in the deployed site.

## State model

All state lives in `src/App.tsx`:

| State            | Type                      | Owner / setter                            |
| ---------------- | ------------------------- | ----------------------------------------- |
| `layer`          | `'regions' \| 'planning-areas' \| 'subzones'` | `<LayerSwitcher>` |
| `models`         | `AreaModel[]`             | `useEffect([layer])` calls `loadLayer()`   |
| `loading`/`error`| boolean / string          | same effect                                |
| `selectedName`   | `string \| null`          | `<PlanningArea onClick>` + `Escape` + `onPointerMissed` |
| `toggles`        | `{ pillars, tags, ripple, particles }` | `<HUD>` button bar             |

No external state library. Switching `layer` triggers re-fetch and recompute of `models`; everything else is derived. A `cancelled` flag guards against stale responses.

## Data flow

```
data.gov.sg
   │   (offline, manual)
   ▼
scripts/download_sg_geojson.py
   │
   ▼
data/ + public/data/        (checked-in, served as static assets)
   │
   ▼ fetch(import.meta.env.BASE_URL + 'data/sg-<layer>.geojson')
   │
src/lib/geojson.ts::loadLayer()
   ├── parse FeatureCollection
   ├── pickName(props)          → tries PLN_AREA_N / SUBZONE_N / REGION_N / Name / name
   ├── project(lng,lat)         → src/lib/projection.ts (PROJ_CENTER=[103.85,1.35], PROJ_SCALE=200)
   ├── compute centroid         → mean of outer-ring projected vertices across all polygons
   └── metricsFor(rawName)      → src/lib/metrics.ts (DEMO hash-derived)
   │
   ▼  AreaModel[]
App.tsx — passes models to MapScene; passes selectedModel to InfoCard.
```

`AreaModel` is a **plain serializable object**, not an `Object3D` with magic `userData`. Renderer components consume it directly. (This is the structural improvement called out in task `T3.2` for the original sample, applied from day one here.)

## Scene tree (r3f)

```jsx
<Canvas gl={{ antialias, alpha, ACES }} dpr={[1,2]} camera={{ fov: 38, … }}>
  <color attach="background" />
  <ambientLight /> <directionalLight /> <directionalLight />
  <Floor />
  <RippleRings visible={toggles.ripple} />
  <Particles visible={toggles.particles} />

  {models.map(m =>
    <PlanningArea
       model={m}
       selected={m.name === selectedName}
       showTag={toggles.tags}
       showPillar={toggles.pillars}
       onClick={onSelect}
    />
  )}

  <OrbitControls enableDamping … />
  <EffectComposer><Bloom intensity={0.35} … /></EffectComposer>
</Canvas>
```

## Key differences from `sample.html`

| Concern               | sample.html                                      | React app                                                  |
| --------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| Data                  | `INLINE_GEOJSON` const                           | `fetch('data/sg-<layer>.geojson')`                         |
| Layer switching       | none — single hard-coded dataset                 | live switch between regions / areas / subzones             |
| Per-area material     | per-area `MeshPhongMaterial` cloned to allow highlight mutation | one `<meshPhongMaterial>` per area, `color`/`emissive` driven by `selected` prop |
| Picking               | manual `THREE.Raycaster` + `mousemove`/`click` listeners on the canvas, walks `parent` chain to find `userData.metrics` | r3f's built-in `onClick` / `onPointerOver` per mesh        |
| Tags                  | `THREE.CSS2DRenderer` + global `applyToggles` flipping `.visible` CSS class | drei's `<Html>` per area, conditionally rendered            |
| Animation loop        | one big `animate()` driving everything           | each visual primitive owns its `useFrame` (Particles, Ripple, Beam halo) |
| State                 | top-level `let highlighted = null`, `const toggles = {…}` mutables | React `useState` in `App.tsx`                              |
| Close card on Escape  | not implemented                                  | `useEffect` global keydown                                  |
| "Demo data" indicator | not surfaced (users could mistake hash for data) | pill in the info card eyebrow                              |

## Why r3f over imperative Three.js in `useEffect`

- Layer switching with imperative cleanup is fiddly — disposal of 330 meshes / materials / geometries is easy to get wrong. r3f handles it via the React tree's unmount.
- The selection-driven material recolor is naturally reactive — `selected` prop change → React re-renders `<meshPhongMaterial color={…}/>` → r3f updates the underlying material in place.
- The CSS2D label problem (one renderer instance, manual class toggle) becomes "render `<Html>` conditionally" — much simpler.

The trade-off is ~80 KB gzipped of extra deps. Worth it.

## Bundle size

```
dist/assets/index-*.js   1.09 MB  (304 KB gzipped)
dist/assets/index-*.css  7.4 KB   (1.9 KB gzipped)
dist/index.html          0.8 KB
dist/data/*.geojson      269 KB total
```

Most of the JS is three.js (~600 KB) + r3f/drei/postprocessing (~150 KB). Code-splitting (e.g. lazy-load drei extras) would cut this further — captured as a follow-up in `task.md`.
