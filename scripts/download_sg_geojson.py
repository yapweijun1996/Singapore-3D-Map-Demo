"""
Download URA Master Plan 2019 boundaries from data.gov.sg and simplify them
for use in the Three.js / react-three-fiber visualisation.

Dataset version: URA Master Plan 2019 (No Sea). IDs verified 2026-05-25.
If URA publishes a 2024+ vintage, update DATASETS below — the IDs change.

Usage:
    pip install -r requirements.txt
    python download_sg_geojson.py                # all three datasets
    python download_sg_geojson.py --dataset regions
    python download_sg_geojson.py --force        # ignore cached output
    python download_sg_geojson.py --promote      # also copy to data/ + public/data/

Outputs land in ./output/ (regenerable cache, gitignored):
    sg-regions.geojson         (5 features,  ~38 KB simplified)
    sg-planning-areas.geojson  (55 features, ~66 KB simplified)
    sg-subzones.geojson        (~330 features, ~164 KB simplified)
"""

import argparse
import json
import shutil
import sys
import time
from pathlib import Path

import requests
from shapely.geometry import shape, mapping
from shapely.geometry.polygon import Polygon
from shapely.geometry.multipolygon import MultiPolygon
from shapely.validation import make_valid

# ====== Dataset IDs (URA Master Plan 2019, No Sea) ======
DATASETS = {
    'regions':         'd_bf4d24df9129d5a8ff8cf82e20959ee0',
    'planning-areas':  'd_4765db0e87b9c86336792efe8a1f7a66',
    'subzones':        'd_8594ae9ff96d0c708bc2af633048edfb',
}

API_BASE = 'https://api-open.data.gov.sg/v1/public/api/datasets'
REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT_DIR = REPO_ROOT / 'output'

# Promote destinations (where the live app reads from).
PROMOTE_TARGETS = [REPO_ROOT / 'data', REPO_ROOT / 'public' / 'data']

# Retry policy: PENDING (server still generating) and network errors get
# separate budgets so a single TCP RST can't starve the PENDING wait.
PENDING_RETRIES = 15
ERROR_RETRIES = 8
PENDING_INITIAL_DELAY = 2     # seconds
PENDING_MAX_DELAY = 60        # cap so exp-backoff doesn't run forever
ERROR_INITIAL_DELAY = 2
ERROR_MAX_DELAY = 256

# Geometry filters.
MIN_POLY_AREA = 1e-7          # in lng/lat² — drop fragments below this


def _exp_backoff(initial: float, attempt: int, cap: float) -> float:
    """Exponential backoff `initial * 2**attempt`, capped at `cap`."""
    return min(initial * (2 ** attempt), cap)


def download_dataset(dataset_id: str) -> dict:
    """
    data.gov.sg uses an async poll-download API:
    1. Poll returns either `status: PENDING` (job still running) or a signed `url`.
    2. PENDING → wait + retry (separate budget from network errors).
    3. 429 → exp-backoff + retry (shares budget with network errors).
    4. Signed URL → fetch the JSON.
    """
    poll_url = f'{API_BASE}/{dataset_id}/poll-download'
    pending_attempts = 0
    error_attempts = 0

    while True:
        try:
            r = requests.get(poll_url, timeout=30)

            if r.status_code == 429:
                if error_attempts >= ERROR_RETRIES:
                    raise RuntimeError('rate-limited, retry budget exhausted')
                wait = _exp_backoff(ERROR_INITIAL_DELAY, error_attempts, ERROR_MAX_DELAY)
                print(f'  [poll] 429 rate-limited, wait {wait}s')
                time.sleep(wait)
                error_attempts += 1
                continue

            r.raise_for_status()
            payload = r.json()
            if payload.get('code') != 0:
                raise RuntimeError(f"API error: {payload.get('errMsg')}")

            data = payload.get('data', {})
            status = data.get('status')

            if status == 'PENDING':
                if pending_attempts >= PENDING_RETRIES:
                    raise RuntimeError('PENDING wait budget exhausted')
                wait = _exp_backoff(PENDING_INITIAL_DELAY, pending_attempts, PENDING_MAX_DELAY)
                print(f'  [poll] PENDING, retry in {wait:.0f}s (attempt {pending_attempts + 1}/{PENDING_RETRIES})')
                time.sleep(wait)
                pending_attempts += 1
                continue

            download_url = data.get('url')
            if not download_url:
                raise RuntimeError(f"no signed URL in response: {data}")

            print(f'  [download] {download_url[:80]}...')
            file_resp = requests.get(download_url, timeout=120)
            file_resp.raise_for_status()
            return file_resp.json()

        except requests.exceptions.RequestException as e:
            if error_attempts >= ERROR_RETRIES:
                raise RuntimeError(f'network retry budget exhausted: {e}') from e
            wait = _exp_backoff(ERROR_INITIAL_DELAY, error_attempts, ERROR_MAX_DELAY)
            print(f'  [poll] error: {e}, retry in {wait}s')
            time.sleep(wait)
            error_attempts += 1


def _filter_micropolys(geom):
    """
    Drop polygon fragments below MIN_POLY_AREA. Applies to both `Polygon` and
    `MultiPolygon`. For MultiPolygon: keep all that pass; if none pass, keep
    the single largest (instead of restoring everything — a true micro-
    fragment shouldn't survive).
    """
    if isinstance(geom, Polygon):
        return geom if geom.area >= MIN_POLY_AREA else None

    if isinstance(geom, MultiPolygon):
        big = [p for p in geom.geoms if p.area >= MIN_POLY_AREA]
        if big:
            return big[0] if len(big) == 1 else MultiPolygon(big)
        # All sub-polygons are below threshold — keep the largest single one.
        largest = max(geom.geoms, key=lambda p: p.area)
        return largest

    # Unknown geometry — pass through unchanged.
    return geom


def simplify_geojson(data: dict, tolerance: float = 0.0003, precision: int = 5) -> dict:
    """
    Douglas-Peucker simplification + coordinate rounding + property whitelist.

    `tolerance` is in degrees (0.0003° ≈ 33 m at the equator).
    `preserve_topology=True` prevents self-intersection at the cost of speed.
    """
    out_features = []
    for feat in data['features']:
        geom = shape(feat['geometry'])

        # Repair invalid geometry before simplifying. URA data has been clean
        # historically but this guards against future schema drift.
        if not geom.is_valid:
            geom = make_valid(geom)
            # make_valid can return GeometryCollection; pull polygons out.
            if hasattr(geom, 'geoms') and not isinstance(geom, (Polygon, MultiPolygon)):
                polys = [g for g in geom.geoms if isinstance(g, (Polygon, MultiPolygon))]
                if not polys:
                    continue
                geom = polys[0] if len(polys) == 1 else MultiPolygon(
                    [p for g in polys for p in (g.geoms if isinstance(g, MultiPolygon) else [g])]
                )

        simp = geom.simplify(tolerance, preserve_topology=True)
        filtered = _filter_micropolys(simp)
        if filtered is None:
            continue

        new_geom = mapping(filtered)
        new_geom['coordinates'] = _round_coords(new_geom['coordinates'], precision)

        # URA datasets ship many fields we don't need (OBJECTID, SHAPE.AREA,
        # INC_CRC, FMEL_UPD_D, sometimes a giant `Description` HTML blob).
        # Whitelist only the name-bearing ones.
        props = feat.get('properties', {})
        clean_props = {}
        for key in ['Name', 'PLN_AREA_N', 'REGION_N', 'SUBZONE_N', 'name']:
            v = props.get(key)
            if v:
                clean_props[key] = v

        out_features.append({
            'type': 'Feature',
            'properties': clean_props,
            'geometry': new_geom,
        })

    return {'type': 'FeatureCollection', 'features': out_features}


def _round_coords(coords, p):
    if isinstance(coords[0], (int, float)):
        return [round(c, p) for c in coords]
    return [_round_coords(c, p) for c in coords]


def count_points(geometry: dict) -> int:
    coords = geometry['coordinates']

    def walk(c):
        if isinstance(c[0], (int, float)):
            return 1
        return sum(walk(x) for x in c)

    return walk(coords)


def process_dataset(
    name: str,
    dataset_id: str,
    output_dir: Path,
    tolerance: float,
    force: bool,
) -> tuple[Path | None, Path | None]:
    """
    Returns `(simplified_path, raw_path)` on success, `(None, None)` if skipped.
    """
    print(f'\n=== {name} ({dataset_id}) ===')

    simp_path = output_dir / f'sg-{name}.geojson'
    raw_path = output_dir / f'sg-{name}.raw.geojson'

    if not force and simp_path.exists() and raw_path.exists():
        simp_kb = simp_path.stat().st_size / 1024
        raw_kb = raw_path.stat().st_size / 1024
        print(f'  [skip] cached: simplified {simp_kb:.1f} KB, raw {raw_kb:.1f} KB '
              f'(rerun with --force to refresh)')
        return simp_path, raw_path

    raw = download_dataset(dataset_id)
    feat_count = len(raw['features'])
    pts_raw = sum(count_points(f['geometry']) for f in raw['features'])
    print(f'  features: {feat_count}, points (raw): {pts_raw}')

    with open(raw_path, 'w', encoding='utf-8') as f:
        json.dump(raw, f)
    raw_kb = raw_path.stat().st_size / 1024

    simplified = simplify_geojson(raw, tolerance=tolerance)
    pts_simp = sum(count_points(f['geometry']) for f in simplified['features'])

    with open(simp_path, 'w', encoding='utf-8') as f:
        json.dump(simplified, f, separators=(',', ':'))
    simp_kb = simp_path.stat().st_size / 1024

    print(f'  raw:        {raw_kb:8.1f} KB')
    print(f'  simplified: {simp_kb:8.1f} KB  ({pts_simp} points, {pts_raw / pts_simp:.1f}x point reduction)')
    print(f'  reduction:  {raw_kb / simp_kb:.1f}x by size')

    return simp_path, raw_path


def promote(output_dir: Path, names: list[str]) -> None:
    """Copy output/sg-<name>.geojson into each promote target."""
    print(f'\n=== promote → {", ".join(str(p) for p in PROMOTE_TARGETS)} ===')
    for target in PROMOTE_TARGETS:
        target.mkdir(parents=True, exist_ok=True)
        for name in names:
            src = output_dir / f'sg-{name}.geojson'
            if not src.exists():
                print(f'  [skip] {src.name} not found in {output_dir}')
                continue
            dst = target / src.name
            shutil.copy2(src, dst)
            print(f'  copied {src.name} → {dst.relative_to(REPO_ROOT)}')


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description='Fetch and simplify URA Master Plan 2019 boundaries from data.gov.sg.',
    )
    p.add_argument(
        '--dataset',
        choices=list(DATASETS.keys()),
        help='Process only this dataset (default: all three).',
    )
    p.add_argument(
        '--force',
        action='store_true',
        help='Re-download and re-simplify even if cached output exists.',
    )
    p.add_argument(
        '--tolerance',
        type=float,
        default=0.0003,
        help='Douglas-Peucker tolerance in degrees (default: 0.0003, ~33 m).',
    )
    p.add_argument(
        '--output-dir',
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help='Output directory (default: <repo>/output).',
    )
    p.add_argument(
        '--promote',
        action='store_true',
        help='On success, copy output/sg-*.geojson into data/ + public/data/.',
    )
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    if args.dataset:
        items = [(args.dataset, DATASETS[args.dataset])]
    else:
        items = list(DATASETS.items())

    processed_names = []
    for i, (name, dataset_id) in enumerate(items):
        if i > 0:
            print('  [wait] 5s pause to avoid rate-limit on the next dataset...')
            time.sleep(5)
        process_dataset(name, dataset_id, args.output_dir, args.tolerance, args.force)
        processed_names.append(name)

    if args.promote:
        promote(args.output_dir, processed_names)

    return 0


if __name__ == '__main__':
    sys.exit(main())
