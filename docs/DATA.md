# Data

## Source

Singapore's URA Master Plan 2019 boundaries from [data.gov.sg](https://data.gov.sg/). Three resolutions are produced by `scripts/download_sg_geojson.py` and shipped in `data/`:

| File                            | Granularity     | Features | Size   |
| ------------------------------- | --------------- | -------- | ------ |
| `data/sg-regions.geojson`       | 5 broad regions | 5        | 38 KB  |
| `data/sg-planning-areas.geojson`| Planning areas  | 55       | 66 KB  |
| `data/sg-subzones.geojson`      | Subzones        | ~330     | 164 KB |

The demo (`sample.html`) currently uses **planning-areas**, but inlined as `INLINE_GEOJSON` rather than fetched from `data/`. Moving to `fetch('./data/sg-planning-areas.geojson')` is task **T1.2** in [task.md](../task.md).

For how `data/` is produced and refreshed, see [DATA-PIPELINE.md](DATA-PIPELINE.md).

### Feature shape (post-simplification)

```jsonc
{
  "type": "Feature",
  "properties": { "PLN_AREA_N": "BEDOK", "REGION_N": "EAST REGION" },
  "geometry": {
    "type": "Polygon" | "MultiPolygon",
    "coordinates": [ ... ]   // [lng, lat], rounded to 5 decimals (~1.1m)
  }
}
```

URA exposes the area name as `PLN_AREA_N` for planning areas, `REGION_N` for regions, `SUBZONE_N` for subzones. The pipeline whitelists these and discards bloated fields (`OBJECTID`, `Description` HTML table, `SHAPE.AREA`, `INC_CRC`, `FMEL_UPD_D`, etc.).

The demo's `drawFeature()` (`sample.html:473`) currently reads from `properties.name`, which works because the **inline** GeoJSON inside `sample.html` was manually massaged into that key. When T1.2 lands, `drawFeature` will need to read `PLN_AREA_N` (or the loader will normalize).

Both `Polygon` and `MultiPolygon` are handled.

## Projection

A trivial equirectangular projection around Singapore's approximate center:

```js
const PROJ_CENTER = [103.85, 1.35];    // [lng, lat]
const PROJ_SCALE  = 200;               // scene units per degree
function projection([lng, lat]) {
  return [(lng - PROJ_CENTER[0]) * PROJ_SCALE,
          (lat - PROJ_CENTER[1]) * PROJ_SCALE];
}
```

Not equal-area, ignores Earth curvature — fine at city scale, wrong at country scale.

## Synthetic metrics

The four numbers shown in the info card are **deterministic hashes of the area name**, *not* real data:

```js
const h = hashStr(rawName);
const value    = 100 + h        % 900;   // "visitor flow"
const capacity = 1000 + (h * 7) % 3000;
const traffic  = 60   + (h * 11) % 35;
const trend    = 70   + (h * 13) % 30;
```

The beam height at each centroid scales with `value`:

```js
const h = 4 + (value / 1000) * 14;       // 4..18 scene units
```

Placeholder — see [task.md](../task.md) Tier 6 for the real-data path.

## Centroid

Computed at extrude time as the mean of the *outer* ring vertices (post-projection):

```js
if (isOuter) {
  ring.forEach(pt => { const [x,y] = projection(pt); cxSum += x; cySum += y; cN++; });
}
```

Tag, beam, and "selected" highlight all attach to this centroid. For elongated or concave areas this is rough — visual artifact is a tag drifting outside its area boundary in extreme cases.
