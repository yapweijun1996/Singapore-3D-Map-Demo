# Singapore 3D Map Demo

An interactive 3D visualization of Singapore's URA planning areas — pick **Regions (5)**, **Areas (55)**, or **Subzones (~330)** and switch live. Each district is extruded from GeoJSON, decorated with a glowing "data pillar," and overlaid with animated ripples, particles, and a glass info card.

Stack: **React 18 + Vite 5 + TypeScript + react-three-fiber + drei + postprocessing**, served as a single static bundle from GitHub Pages.

> `sample.html` at the repo root is the original single-file prototype, kept as a visual reference. The live app is built from `src/`.

## Run locally

```sh
npm install
npm run dev       # http://localhost:5173
```

## Build

```sh
npm run build     # outputs dist/
npm run preview   # serve dist/ locally
```

`npm run build` first type-checks (`tsc -b`), then bundles with Vite. Data files in `public/data/` are copied into `dist/data/` as-is.

## Deploy to GitHub Pages

1. **Enable Pages from Actions**: repo → Settings → Pages → _Source: GitHub Actions_. One-time UI click.
2. Push to `main`. The workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys automatically.

Live URL: `https://<username>.github.io/Singapore-3D-Map-Demo/`

The base path is hard-coded in [`vite.config.ts`](vite.config.ts). For a different repo name (or custom domain), override:

```sh
VITE_BASE=/ npm run build      # root domain
VITE_BASE=/My-Repo/ npm run build
```

## Regenerate the data

`public/data/sg-*.geojson` are derived from data.gov.sg via the Python pipeline. The repo ships with current files, so this step is optional.

```sh
pip install -r scripts/requirements.txt
python scripts/download_sg_geojson.py     # writes ./output/
cp output/sg-*.geojson data/              # promote to source of truth
cp output/sg-*.geojson public/data/       # also expose to the demo
```

See [docs/DATA-PIPELINE.md](docs/DATA-PIPELINE.md).

## Controls

| Input                                             | Action                             |
| ------------------------------------------------- | ---------------------------------- |
| **Drag**                                          | Orbit the camera                   |
| **Scroll**                                        | Zoom                               |
| **Click** a area                                  | Highlight + open info card         |
| **Escape**                                        | Close the info card                |
| **Regions / Areas / Subzones** (top-right)        | Switch boundary layer              |
| **Pillars / Tags / Ripple / Atmosphere** (bottom) | Toggle visual layers               |
| **Theme toggle** (top-left)                       | Cycle auto (system) → dark → light |

## Repository layout

```
.
├── index.html                # Vite entry
├── src/
│   ├── App.tsx               # state: layer, models, selection, toggles
│   ├── main.tsx              # React mount
│   ├── styles.css            # design tokens + HUD/card/tag styles
│   ├── lib/
│   │   ├── projection.ts     # equirectangular lng/lat → scene XY
│   │   ├── metrics.ts        # DEMO synthetic metrics (name hash)
│   │   └── geojson.ts        # types, layer config, loader, centroid
│   └── components/
│       ├── MapScene.tsx      # <Canvas> + lights + composer
│       ├── PlanningArea.tsx  # one extruded area + tag + beam
│       ├── Beam.tsx          # glowing data pillar
│       ├── Particles.tsx     # 250 additive points
│       ├── RippleRings.tsx   # 3 expanding rings
│       ├── Floor.tsx         # radial-fade disc
│       ├── HUD.tsx           # hero, counter, hint, toggle bar
│       ├── LayerSwitcher.tsx # Regions / Areas / Subzones pills
│       └── InfoCard.tsx      # slide-in stats card
├── public/data/              # GeoJSON served at /<base>/data/*.geojson
├── data/                     # source-of-truth copies (also used elsewhere)
├── scripts/                  # Python data pipeline
├── output/                   # script's regenerable cache (gitignored)
├── docs/                     # architecture, data, rendering, interaction, pipeline
├── sample.html               # ⚠ original single-file reference (not used at runtime)
└── .github/workflows/        # Pages deploy
```

## Status

Demo-quality. The four numbers in the info card (**Visitor Flow / Capacity / Traffic / Hot trend**) are **deterministic hashes of the area name**, not real data — the "Demo data" pill in the card surfaces this. Replacing with real metrics is task **T6** in [task.md](task.md).

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — covers the original single-file `sample.html` reference
- [docs/DATA.md](docs/DATA.md) — GeoJSON shape, projection, synthetic metrics
- [docs/DATA-PIPELINE.md](docs/DATA-PIPELINE.md) — Python download/simplify pipeline
- [docs/RENDERING.md](docs/RENDERING.md) — scene graph, materials, animation loop (reference)
- [docs/INTERACTION.md](docs/INTERACTION.md) — raycasting, highlight, info card (reference)
- [task.md](task.md) — refactor roadmap

## License

[MIT](LICENSE) © 2026 YAP WEI JUN.

Boundary data is © Urban Redevelopment Authority of Singapore (URA Master Plan 2019), redistributed under the [Singapore Open Data License](https://data.gov.sg/open-data-licence). Fonts are © Vercel (Geist) and Instrument (Instrument Serif), both under the SIL Open Font License 1.1.
