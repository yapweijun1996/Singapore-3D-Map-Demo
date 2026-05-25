"""
Download URA Master Plan 2019 boundaries from data.gov.sg
and simplify them for use in Three.js visualization.

Usage:
    pip install requests shapely
    python download_sg_geojson.py

Outputs three files into ./output/:
    sg-regions.geojson        (5 features, ~5KB simplified)
    sg-planning-areas.geojson (55 features, ~60KB simplified)
    sg-subzones.geojson       (~330 features, ~300KB simplified)
"""

import json
import os
import time
from pathlib import Path
import requests
from shapely.geometry import shape, mapping
from shapely.geometry.polygon import Polygon
from shapely.geometry.multipolygon import MultiPolygon

# ====== Dataset IDs (URA Master Plan 2019, No Sea) ======
DATASETS = {
    'regions':         'd_bf4d24df9129d5a8ff8cf82e20959ee0',
    'planning-areas':  'd_4765db0e87b9c86336792efe8a1f7a66',
    'subzones':        'd_8594ae9ff96d0c708bc2af633048edfb',
}

API_BASE = 'https://api-open.data.gov.sg/v1/public/api/datasets'
# Resolve relative to the repo root, so the script works regardless of cwd.
REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / 'output'
OUTPUT_DIR.mkdir(exist_ok=True)


def download_dataset(dataset_id, retries=8, retry_delay=2):
    """
    data.gov.sg 是 async poll-download API:
    第一次 poll 可能返回 status=PENDING，要轮询直到拿到真实下载 URL。
    如果遇到 429 (rate limit)，用指数退避重试。
    """
    poll_url = f'{API_BASE}/{dataset_id}/poll-download'
    for attempt in range(retries):
        try:
            r = requests.get(poll_url, timeout=30)

            # 处理 rate limit
            if r.status_code == 429:
                wait = retry_delay * (2 ** attempt)  # 指数退避: 2, 4, 8, 16...
                print(f'  [poll {attempt+1}] 429 Rate limited, wait {wait}s...')
                time.sleep(wait)
                continue

            r.raise_for_status()
            data = r.json()
            if data.get('code') != 0:
                raise RuntimeError(f"API error: {data.get('errMsg')}")

            # 检查 status 字段
            status = data['data'].get('status')
            if status == 'PENDING':
                print(f'  [poll {attempt+1}] PENDING, retry in {retry_delay}s...')
                time.sleep(retry_delay)
                continue

            # 拿到 signed URL
            download_url = data['data']['url']
            print(f'  [download] {download_url[:80]}...')
            file_resp = requests.get(download_url, timeout=60)
            file_resp.raise_for_status()
            return file_resp.json()

        except requests.exceptions.RequestException as e:
            wait = retry_delay * (2 ** attempt)
            print(f'  [poll {attempt+1}] error: {e}, retry in {wait}s...')
            time.sleep(wait)

    raise RuntimeError('Max retries exceeded')


def simplify_geojson(data, tolerance=0.0003, precision=5):
    """
    Douglas-Peucker simplification + coordinate rounding.
    tolerance is in degrees: 0.0003 ≈ 33m at the equator.
    """
    out_features = []
    for feat in data['features']:
        geom = shape(feat['geometry'])
        # preserve_topology=True 保证几何不会自相交
        simp = geom.simplify(tolerance, preserve_topology=True)

        # 过滤掉极小的微多边形（碎片）
        if isinstance(simp, MultiPolygon):
            big = [p for p in simp.geoms if p.area > 1e-7]
            if not big:
                big = list(simp.geoms)
            simp = big[0] if len(big) == 1 else MultiPolygon(big)

        new_geom = mapping(simp)
        new_geom['coordinates'] = _round_coords(new_geom['coordinates'], precision)

        # 只保留必要的 properties（减少体积）
        # URA 数据的 description 字段是一个 HTML table，超大且没用
        props = feat['properties']
        clean_props = {}
        for key in ['Name', 'PLN_AREA_N', 'REGION_N', 'SUBZONE_N', 'name']:
            if key in props and props[key]:
                clean_props[key] = props[key]

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


def count_points(geometry):
    coords = geometry['coordinates']
    def walk(c):
        if isinstance(c[0], (int, float)):
            return 1
        return sum(walk(x) for x in c)
    return walk(coords)


def main():
    datasets = list(DATASETS.items())
    for i, (name, dataset_id) in enumerate(datasets):
        print(f'\n=== {name} ({dataset_id}) ===')

        simp_path = OUTPUT_DIR / f'sg-{name}.geojson'
        raw_path = OUTPUT_DIR / f'sg-{name}.raw.geojson'

        # 已下载过就跳过
        if simp_path.exists() and raw_path.exists():
            simp_size = simp_path.stat().st_size / 1024
            raw_size = raw_path.stat().st_size / 1024
            print(f'  [skip] already exists: simplified {simp_size:.1f} KB, raw {raw_size:.1f} KB')
            continue

        # Dataset 之间间隔，避免触发 rate limit
        if i > 0:
            print('  [wait] sleep 5s before next request...')
            time.sleep(5)

        # Download
        raw = download_dataset(dataset_id)
        feat_count = len(raw['features'])
        total_pts_raw = sum(count_points(f['geometry']) for f in raw['features'])
        print(f'  features: {feat_count}, points: {total_pts_raw}')

        # Save raw
        with open(raw_path, 'w', encoding='utf-8') as f:
            json.dump(raw, f)
        raw_size = raw_path.stat().st_size / 1024

        # Simplify
        simplified = simplify_geojson(raw)
        total_pts_simp = sum(count_points(f['geometry']) for f in simplified['features'])

        # Save compact
        with open(simp_path, 'w', encoding='utf-8') as f:
            json.dump(simplified, f, separators=(',', ':'))
        simp_size = simp_path.stat().st_size / 1024

        print(f'  raw:        {raw_size:7.1f} KB')
        print(f'  simplified: {simp_size:7.1f} KB  ({total_pts_simp} points)')
        print(f'  reduction:  {raw_size / simp_size:.1f}x')


if __name__ == '__main__':
    main()
