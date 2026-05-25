# Data Pipeline

How the GeoJSON files in `data/` are produced.

## Source

All boundary data comes from [data.gov.sg](https://data.gov.sg/), URA Master Plan 2019 (No Sea) series:

| Dataset         | data.gov.sg ID                            | Features (raw) |
| --------------- | ----------------------------------------- | -------------- |
| `regions`       | `d_bf4d24df9129d5a8ff8cf82e20959ee0`      | 5              |
| `planning-areas`| `d_4765db0e87b9c86336792efe8a1f7a66`      | 55             |
| `subzones`      | `d_8594ae9ff96d0c708bc2af633048edfb`      | ~330           |

These IDs are pinned to the 2019 vintage. A future URA update ships under new IDs — search data.gov.sg manually and update `scripts/download_sg_geojson.py`.

## Tool

`scripts/download_sg_geojson.py`. One file, no CLI flags. Run from repo root:

```sh
pip install -r scripts/requirements.txt
python scripts/download_sg_geojson.py
```

Outputs land in `output/` (gitignored — regenerable cache):

```
output/
├── sg-regions.geojson           # simplified, compact-JSON
├── sg-regions.raw.geojson       # untouched API response
├── sg-planning-areas.geojson
├── sg-planning-areas.raw.geojson
├── sg-subzones.geojson
└── sg-subzones.raw.geojson
```

The simplified files in `output/` are the candidates. The curated copies the demo actually uses live in `data/` (checked in). After regenerating, **promote manually**:

```sh
cp output/sg-*.geojson data/
```

This split is deliberate: `output/` is the script's working area, `data/` is the contract with the demo.

## Pipeline stages

```
data.gov.sg
   │   1. poll-download (async API)        │
   │   2. wait for status != PENDING       │   download_dataset()
   │   3. fetch from signed URL            │
   ▼
raw GeoJSON  ──▶ output/sg-{name}.raw.geojson  (verbatim, ~1–2 MB each)
   │
   │   4. shapely Douglas–Peucker          │
   │      tolerance=0.0003° (~33 m)        │   simplify_geojson()
   │      preserve_topology=True           │
   │   5. drop micro-polygons (<1e-7 area) │
   │   6. round coords to 5 decimals       │   _round_coords()
   │   7. property whitelist               │
   │      (Name, PLN_AREA_N, REGION_N,     │
   │       SUBZONE_N, name)                │
   ▼
simplified GeoJSON ──▶ output/sg-{name}.geojson  (~38–164 KB)
   │
   │   8. manual promote                   │
   ▼
data/sg-{name}.geojson  ← what the demo reads
```

## Sizes

| File                              | Raw      | Simplified | Reduction |
| --------------------------------- | -------- | ---------- | --------- |
| `sg-regions.geojson`              | 1.2 MB   | 38 KB      | ~31x      |
| `sg-planning-areas.geojson`       | 1.7 MB   | 66 KB      | ~26x      |
| `sg-subzones.geojson`             | 2.5 MB   | 164 KB     | ~15x      |

## Reliability features

- **Idempotent**: if both `*.geojson` and `*.raw.geojson` already exist, the dataset is skipped. Delete the file to force re-download.
- **Rate limit aware**: catches HTTP 429, exponential backoff (2, 4, 8, 16, … up to 256 s).
- **Async-poll aware**: `data.gov.sg`'s `poll-download` endpoint may return `status: PENDING` on first call; the script retries until a signed URL is returned.
- **Inter-dataset pause**: 5 s between datasets to dodge rate limits.

## Known sharp edges

See `task.md` → "Data tooling" for the punch list, including:
- PENDING and network errors share one retry budget; busy days can exhaust it.
- Micro-polygon filter only runs for `MultiPolygon` results.
- No `make_valid` / `buffer(0)` repair step on input geometry.
- No CLI flags (`--dataset`, `--force`, `--tolerance`).
