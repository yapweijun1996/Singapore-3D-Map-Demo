# Refactor + Follow-up Plan

Snapshot of what's done and what's left, **smallest blast-radius first**. Each tier is independently shippable.

---

## Tier 0 — Workspace structure ✅ (done 2026-05-25)

- [x] `scripts/` — `download_sg_geojson.py` moved here, paths via `__file__`.
- [x] `data/` — curated `sg-{regions,planning-areas,subzones}.geojson` checked in.
- [x] `output/` — gitignored (regenerable cache).
- [x] `.gitignore`, `scripts/requirements.txt`.
- [x] `docs/DATA-PIPELINE.md`; `README.md`, `CLAUDE.md`, `docs/DATA.md` updated.

---

## Tier 1 — Modularize the demo ✅ (done 2026-05-25, via React rewrite)

Originally planned as a vanilla-JS split of `sample.html`. **Superseded** by the React + Vite scaffold:

- [x] **T1.1** Canonical entry is now `index.html` (Vite). `sample.html` kept as reference.
- [x] **T1.2** Demo fetches `data/sg-<layer>.geojson` at runtime; no inline GeoJSON.
- [x] **T1.3** CSS extracted to `src/styles.css`.
- [x] **T1.4** Bootstrap in `src/main.tsx`.
- [x] **T1.5** Split into modules under `src/{lib,components}/`.
- [x] **T1.6** Globals replaced with `useState` in `src/App.tsx`.

Also done as part of T1:
- [x] Three-layer switcher (Regions / Areas / Subzones).
- [x] `<InfoCard>` shows a "Demo data" pill.
- [x] `Escape` closes the info card.
- [x] Empty-canvas click clears selection.

---

## Tier 2 — Tooling

- [x] **T2.3** Vite + `npm run dev` / `npm run build` (TypeScript via `tsc -b`).
- [x] **T2.4** GitHub Actions Pages deploy (`.github/workflows/deploy.yml`).
- [ ] **T2.1** `prettier` + `.editorconfig`.
- [ ] **T2.2** `eslint` (recommend `typescript-eslint` flat config).
- [ ] **T2.5** Extend CI to run `npm run typecheck` and a Python smoke (`python -m py_compile scripts/download_sg_geojson.py`).
- [ ] **T2.6** Lock Node version via `.nvmrc` / `engines` field (workflow uses Node 20; pin source-side).

---

## Tier 3 — Architectural cleanup

- [x] **T3.2** Plain `AreaModel` factory (`src/lib/geojson.ts`) — no magic `userData`. Done from day one in the React rewrite.
- [x] **T3.3** Highlight decoupled — `selectedName` lives in `App.tsx`, `<PlanningArea selected={…}>` reacts.
- [ ] **T3.1** Central `src/config.ts` collecting magic constants currently sprinkled across `Floor.tsx`, `Particles.tsx`, `RippleRings.tsx`, `Beam.tsx`, `MapScene.tsx`:
  ```ts
  export const config = {
    proj:       { center: [103.85, 1.35], scale: 200 },
    extrude:    { depth: 1.8 },
    camera:     { fov: 38, position: [0, 105, 135], minDist: 40, maxDist: 260 },
    bloom:      { intensity: 0.35, threshold: 0.85, smoothing: 0.5 },
    particles:  { count: 250, rMin: 30, rMax: 110 },
    ripple:     { count: 3, baseRadius: 20, speed: 0.18 },
    beam:       { minH: 4, scale: 14, segments: 6 },
  } as const;
  ```
- [ ] **T3.4** JSDoc/TS-doc on the `AreaModel`/`Metrics`/`Layer` types in `src/lib/geojson.ts`.

---

## Tier 4 — UX / a11y

- [x] **T4.1a** `Escape` closes the card.
- [x] **T4.3** "Demo data" pill in info card.
- [x] **T4.9** Light + dark + auto theme system. oklch tokens in `src/styles.css` (CSS) and `src/lib/theme.ts` (Three.js, via `oklchToHex` conversion). Toggle in HUD cycles auto → dark → light. Persists in `localStorage`.
- [ ] **T4.1b** Arrow keys (Left/Right) cycle areas alphabetically.
- [ ] **T4.2** Hover-only tag mode in addition to global toggle (reduces label collision at default zoom — important when switching to **Subzones** at 330 features).
- [ ] **T4.4** `prefers-reduced-motion`: skip ripple/particles, instant cuts on selection.
- [ ] **T4.5** Touch tap to select an area (OrbitControls handles drag/zoom on touch; only `onClick` event matters and r3f already maps `pointerup` correctly — verify on real device).
- [ ] **T4.6** Legend explaining beam-height encoding.
- [ ] **T4.7** Focus trap inside `.card` when open; restore focus on close.
- [ ] **T4.8** Persist `layer` + `toggles` to `localStorage`.

---

## Tier 5 — Performance & robustness

- [x] **T5.2** `dpr={[1, 2]}` on `<Canvas>` caps pixel ratio.
- [ ] **T5.1** Pause `useFrame` when tab hidden (`document.visibilityState`).
- [ ] **T5.3** Debounce resize (r3f's `<Canvas>` already debounces by default — verify, then drop this item if confirmed).
- [ ] **T5.4** `webglcontextlost` listener → friendly reload prompt.
- [ ] **T5.5** Subzones (~330 features) currently builds 330 `ExtrudeGeometry`, 330 `<Html>` overlays, 330 `<Beam>` groups. Profile; consider:
  - Lazy-mount `<Beam>` and `<Html>` only for in-view areas, OR
  - Merge per-layer geometries into a single `BufferGeometry` with per-vertex color attribute.
- [ ] **T5.6** Code-split: dynamic `import('@react-three/postprocessing')` so the bloom bundle doesn't block first paint.
- [ ] **T5.7** Bundle currently 1.09 MB (304 KB gzip). Most is three.js. Investigate `three/webgpu` or aggressive tree-shaking once r3f supports it cleanly.

---

## Tier 6 — Real data (unblocked — `AreaModel` is plain data)

- [ ] **T6.1** Source real per-area metrics (population, transit stops, sales, etc.). Static JSON keyed by the same name `pickName()` returns.
- [ ] **T6.2** Replace `metricsFor()` with a lookup; remove `hashStr` and the "Demo data" pill from `<InfoCard>`.
- [ ] **T6.3** Metric selector UI (currently "Visitor Flow" is the only headline).
- [ ] **T6.4** Each layer (regions vs areas vs subzones) needs its own metrics file or join key.

---

## Tier 7 — UI/UX layout audit (2026-05-25)

Findings from a top-to-bottom layout review. Each item carries its **observation**, **proposed change**, and **trade-off** so future you can decide on the spot. Priorities A → D = "biggest perceived impact" → "out-of-scope but on the radar". Items that overlap with earlier tiers carry a `see T4.x` cross-reference instead of being duplicated.

### Priority A — current obvious gaps

- [ ] **UI-A1** **Layout breaks on narrow viewports** (everything uses fixed 48 px inset). At ≤640 px the LayerSwitcher (top-right) collides with Hero (top-center); Counter overlaps Controls. → Add breakpoints ≤768 / ≤480; change insets to `clamp(16px, 4vw, 48px)`; on narrow widths move LayerSwitcher into a sticky top bar, shrink Hero to ~36 px, hide Hint. *Trade-off:* ~30 lines of CSS; without it mobile is unusable.
- [ ] **UI-A2** **Right corner is crowded and InfoCard overlaps LayerSwitcher**. FpsBadge (top:16) + LayerSwitcher (top:56) + InfoCard sliding in from right all compete in one zone. → Two options:
  - **(a)** Move FpsBadge to bottom-left (group with Hint as "session info"); LayerSwitcher stays.
  - **(b)** Convert LayerSwitcher into a top-center segmented control next to the Hero meta — frees right side entirely for the card.
  *Trade-off:* (a) is 5 min and conservative; (b) ~30 min and more modern.
- [ ] **UI-A3** **No `:focus-visible` styles**. Tab navigation has no visible focus ring. → Global `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`; extract `--accent` as a real theme token. *Trade-off:* ~10 lines CSS; a11y blocker fix.
- [ ] **UI-A4** **Bottom toggle bar has no hierarchy**. Pillars / Tags affect data perception; Ripple / Atmosphere are pure ambiance. → Split into two groups with a 1px `var(--text-4)` divider: `[Pillars][Tags] · [Ripple][Atmosphere]`. *Trade-off:* 5 min; instant clarity gain.
- [ ] **UI-A5** **Hint shows mouse-only verbs on touch**. "Click / Drag / Scroll" don't apply to touch. → `@media (hover: none) { … }` swap to Tap / Pan / Pinch, or hide on touch entirely. See also `T4.5` (touch tap select). *Trade-off:* 1 min.

### Priority B — refinements

- [ ] **UI-B1** "Demo data" pill is only visible *after* clicking an area. → Surface globally in the Hero meta line as `Planning Areas · URA Master Plan · Demo data`. Extends existing `T4.3`.
- [ ] **UI-B2** Card close button touch target is 28 × 28. → Keep visual size but pad to 44 × 44 hit area. WCAG 2.5.5 (target size) compliance.
- [ ] **UI-B3** **Selected state is lost when the card closes** — user clicks Bishan, scrolls camera, closes card, forgets what was selected. → Persistent bottom breadcrumb `Currently viewing: Bishan ✕`; only the ✕ truly deselects; clicking the breadcrumb reopens the card.
- [ ] **UI-B4** **Subzones (330) tag overlap**. → Add a "Tag mode" toggle: All / Hover only / Off. Same as existing `T4.2` (hover-only mode). Faster path: just add the hover-only variant.

### Priority C — polish

- [ ] **UI-C1** Hero 72 px feels too large on medium screens. → `font-size: clamp(36px, 6vw, 72px)`.
- [ ] **UI-C2** No data attribution. → Small footer line `URA Master Plan 2019 · data.gov.sg` near the bottom-left or bottom-center.
- [ ] **UI-C3** Layer switch is abrupt. → 50–80 ms fade-out → load → fade-in transition on the models group.
- [ ] **UI-C4** Selection doesn't recenter the camera. → On click, lerp `OrbitControls.target` to the selected area's centroid over ~400 ms. drei `<CameraControls>` has a one-liner, but it conflicts with the existing damping setup — test first.
- [ ] **UI-C5** Theme switch is instant for Three.js but 320 ms for CSS — feels desynchronized. → Either drop the CSS transition to 0 or fake a Three-side fade via a 200 ms `bloomIntensity` ramp to mask the discontinuity.

### Priority D — out of UI scope (future features)

- [ ] **UI-D1** Search-by-name input (`Cmd/Ctrl+K`) to jump to a specific area.
- [ ] **UI-D2** Compare mode — multi-select, side-by-side stats panel.
- [ ] **UI-D3** URL share — `?layer=areas&select=Bishan` deep-links restore selection + layer + (optionally) toggles.
- [ ] **UI-D4** Real metrics replacement — already tracked as `T6.*`.

### Recommended bundles

- **5–10 min — instant wins:** UI-A4 + UI-A2(a). Visible hierarchy + a less crowded corner.
- **~30 min — "ship-ready":** add UI-A1 + UI-A3 + UI-A5. Responsive layout, focus a11y, touch-correct hint.
- **~1–2 h — "polished demo":** add UI-B1 + UI-B3 + UI-B4. Persistent selection state, demo-data clarity, tag declutter at Subzones layer.

---

## Data tooling — `scripts/download_sg_geojson.py`

Independent of the React work. Each item is small.

- [ ] **D1** Separate retry budgets for PENDING vs `RequestException`. Today they share `attempt`, so a single network blip can starve the PENDING budget. Suggested: `pending_retries=15`, `error_retries=8`, each with own counter.
- [ ] **D2** Exp-backoff PENDING too (cap at ~60 s); current fixed 2 s × 8 = 16 s ceiling is too tight for first-time generation on big datasets.
- [ ] **D3** Run micro-polygon filter on `Polygon` results too. And when *all* sub-polygons fall below the 1e-7 threshold, prefer "keep the largest" over the current "restore everything" fallback.
- [ ] **D4** `make_valid` (or `buffer(0)`) repair pass before simplification.
- [ ] **D5** CLI flags: `--dataset {name}`, `--force`, `--tolerance`, `--output-dir`.
- [ ] **D6** Auto-promote on success: copy `output/sg-*.geojson` → `data/` + `public/data/` behind a `--promote` flag.
- [ ] **D7** Pin dataset versions in a top-level comment: "URA Master Plan 2019, last verified YYYY-MM-DD."
- [ ] **D8** `pyproject.toml` with `[project]` metadata + script entry point.

---

## Sequencing

```
T0 ✓  T1 ✓
       ├─▶ T2 (partial: dev/build/deploy done; lint/format/typecheck-in-CI pending)
       ├─▶ T3 (partial: T3.2/T3.3 done; T3.1 config + T3.4 docs pending)
       ├─▶ T4 (a11y/UX — important before adding Subzones to default)
       ├─▶ T5 (perf — needed if Subzones default + on slow devices)
       ├─▶ T6 (real data — fully unblocked)
       └─▶ T7 (UI/UX layout audit — see "Recommended bundles" for entry points)
D1..D8 — anytime, independent.
```
