# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

The repo holds **three independent code surfaces**:

1. **The live React app** (`src/`, `index.html`, `vite.config.ts`) — what `npm run build` produces and what GitHub Pages serves. React 18 + Vite 5 + TypeScript + react-three-fiber + drei + postprocessing. **Edit here for visible changes.**
2. **`sample.html`** at repo root — the original single-file prototype, kept as a visual/behavioural reference. **Not in the build.** Do not edit it expecting changes to land in the deployed site.
3. **`scripts/download_sg_geojson.py`** — Python pipeline that pulls URA Master Plan 2019 boundaries from data.gov.sg, simplifies via shapely Douglas-Peucker, and writes to `output/`. Promoted manually into `data/` and `public/data/`.

## Commands

### React app

```sh
npm install
npm run dev          # vite dev server on :5173
npm run build        # tsc -b && vite build → dist/
npm run preview      # serve dist/ locally
npm run typecheck    # tsc -b --noEmit
```

`npm run build` type-checks first; type errors fail the build. The deploy workflow runs `npm ci && npm run build`.

### Data pipeline

```sh
pip install -r scripts/requirements.txt
python scripts/download_sg_geojson.py    # → ./output/
cp output/sg-*.geojson data/             # promote to source of truth
cp output/sg-*.geojson public/data/      # also expose to the demo
```

Idempotent — skips datasets whose `*.geojson` and `*.raw.geojson` both already exist. Delete a file in `output/` to force re-download.

### Deploy

Push to `main`. `.github/workflows/deploy.yml` runs `npm ci && npm run build`, uploads `dist/`, and publishes via `actions/deploy-pages@v4`. One-time setup: repo → Settings → Pages → _Source: GitHub Actions_.

## Architecture — React app (big picture)

All state is in `src/App.tsx`. There is **no external state library**.

| State          | Source                                                                   |
| -------------- | ------------------------------------------------------------------------ |
| `layer`        | `<LayerSwitcher>` — `'regions' \| 'planning-areas' \| 'subzones'`        |
| `models`       | `useEffect([layer])` calls `loadLayer()` from `src/lib/geojson.ts`       |
| `selectedName` | `<PlanningArea onClick>`, Escape key, or `onPointerMissed` on `<Canvas>` |
| `toggles`      | `<HUD>` toggle buttons — `pillars / tags / ripple / particles`           |

`AreaModel` is a **plain object** (`name`, `polygons`, `center`, `metrics`) — not an `Object3D` with magic `userData`. The renderer consumes it as props.

### Patterns worth knowing before editing

- **Colors are oklch, single source of truth in `src/lib/theme.ts`.** CSS reads `oklch()` from `:root` / `:root[data-theme]` blocks in `src/styles.css`. Three.js reads pre-resolved sRGB hex from `THEME[resolved].xxx` in `src/lib/theme.ts`. Both come from the same `[L, C, H]` tuples in the `DARK` / `LIGHT` constants in that file — change one place, you **must** mirror the other. The `oklchToHex()` math (Björn Ottosson's oklab matrix) is in the same file; `THREE.Color` does not parse `oklch()` strings, so don't pass them as material props.
- **Theme has three preferences** (`'auto' | 'dark' | 'light'`). `'auto'` follows `prefers-color-scheme`. Set by `useTheme()` hook; writes `<html data-theme>` attribute (or removes it for auto) and `localStorage['sg-map.theme']`. Three components receive resolved tokens via props from `App → MapScene → children`. **Do not** read `getComputedStyle()` from inside r3f components.
- **GeoJSON property names are URA codes, not `name`.** `pickName()` in `src/lib/geojson.ts` tries `PLN_AREA_N` → `SUBZONE_N` → `REGION_N` → `Name` → `name`. New data sources must either ship one of those keys or extend the list.
- **Base path is hard-coded** to `/Singapore-3D-Map-Demo/` in `vite.config.ts` because GitHub Pages serves under repo name. Override with `VITE_BASE=/ npm run build` for root-domain hosting. Data is fetched with `import.meta.env.BASE_URL + 'data/...'`, so this is the only place to change.
- **Metrics are still synthetic.** `src/lib/metrics.ts::metricsFor()` derives values from `hashStr(name)` — same formula as the reference `sample.html`. The "Demo data" pill in `<InfoCard>` surfaces this. When real data lands, remove the pill and the hash module.
- **Highlight is reactive.** `<PlanningArea selected={…}>` flips `<meshPhongMaterial color/emissive>` props — r3f mutates the underlying material in place. **Do not** add per-area material cloning (the reference `sample.html` does that because it's imperative).
- **Each visual primitive owns its own `useFrame`** (`Particles`, `RippleRings`, `Beam`). There is no central `animate()` loop. To pause animation, gate the `useFrame` body on a `visible` prop (already done for ripple/particles).
- **Picking** uses r3f's built-in `onClick` / `onPointerOver` on each `<mesh>`. No manual raycaster. Empty-space click clears selection via `<Canvas onPointerMissed={…}>`.

## Architecture — `scripts/download_sg_geojson.py`

Single file, ~180 lines, three logical pieces:

| Function             | Role                                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `download_dataset()` | Polls data.gov.sg async `poll-download` API, handles PENDING + 429 + retries (exp backoff)                                                           |
| `simplify_geojson()` | shapely Douglas-Peucker (`tolerance=0.0003°` ≈ 33 m, `preserve_topology=True`); drops micro-polygons; 5-decimal rounding; whitelists name properties |
| `main()`             | Orchestrates three datasets; idempotent skip; 5 s inter-dataset pause                                                                                |

Dataset IDs are pinned to URA Master Plan 2019 — a future vintage means new IDs (update `DATASETS` dict). Known rough edges catalogued in `task.md` under "Data tooling" (D1–D8).

## Architecture — `sample.html` (reference only)

Single-file Three.js r181 demo, ~845 lines. Mixes six layers in one module scope. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the line-range map. Patterns to watch (in case you crib from it):

- Per-area top material cloned for highlight — **not** needed in the React app (reactive props handle it).
- Magic `userData.{ rawName, props, topMat, center, metrics }` — **not** needed in the React app (`AreaModel` plain object).
- Raycaster walks `parent` chain looking for `userData.metrics` — **not** needed in the React app (r3f `onClick`).

## Where deeper context lives

- `README.md` — quickstart, commands, deploy, repo layout
- `docs/REACT-APP.md` — state model, scene tree, differences from sample.html
- `docs/ARCHITECTURE.md` — `sample.html` line-range map (reference)
- `docs/DATA.md` — GeoJSON shape, projection, synthetic metrics
- `docs/DATA-PIPELINE.md` — Python pipeline stages, dataset IDs, sharp edges
- `docs/RENDERING.md` — scene graph, materials, animation loop (sample reference)
- `docs/INTERACTION.md` — raycaster, highlight, toggles (sample reference)
- `task.md` — refactor + follow-up backlog. If asked to "improve" the React app without further direction, look at Tier T4/T5/T6 items (a11y, perf, real data).
