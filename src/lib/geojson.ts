import { project } from './projection';
import { metricsFor, type Metrics } from './metrics';

export type Layer = 'regions' | 'planning-areas' | 'subzones';

export const LAYERS: { id: Layer; label: string; file: string; count: number }[] = [
  { id: 'regions', label: 'Regions', file: 'sg-regions.geojson', count: 5 },
  { id: 'planning-areas', label: 'Areas', file: 'sg-planning-areas.geojson', count: 55 },
  { id: 'subzones', label: 'Subzones', file: 'sg-subzones.geojson', count: 330 },
];

// Raw GeoJSON shapes we care about
type Ring = [number, number][];           // [lng, lat]
type PolygonCoords = Ring[];               // outer + inner rings
type MultiPolygonCoords = PolygonCoords[];

interface RawFeature {
  type: 'Feature';
  properties: Record<string, string | number | null | undefined>;
  geometry:
    | { type: 'Polygon'; coordinates: PolygonCoords }
    | { type: 'MultiPolygon'; coordinates: MultiPolygonCoords };
}

interface RawFeatureCollection {
  type: 'FeatureCollection';
  features: RawFeature[];
}

// Normalized model used by the renderer
export interface AreaPolygon {
  outer: [number, number][];                 // projected XY
  holes: [number, number][][];               // projected XY
}

export interface AreaModel {
  id: string;                                // stable: layer/name/index
  name: string;                              // display name
  polygons: AreaPolygon[];                   // 1 for Polygon, N for MultiPolygon
  center: [number, number];                  // projected centroid
  metrics: Metrics;
}

function pickName(props: RawFeature['properties']): string {
  const candidates = ['PLN_AREA_N', 'SUBZONE_N', 'REGION_N', 'Name', 'name'];
  for (const k of candidates) {
    const v = props[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return 'Unknown';
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// GeoJSON rings close by repeating the first point as the last point.
// THREE.Shape auto-closes, so the duplicate creates a zero-length edge that
// earcut (THREE.ShapeUtils.triangulateShape) chokes on inside ExtrudeGeometry.
// Strip the closing duplicate and drop rings that collapse below 3 vertices.
function stripClosingPoint(ring: [number, number][]): [number, number][] {
  if (ring.length < 2) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  return fx === lx && fy === ly ? ring.slice(0, -1) : ring;
}

// Shoelace formula — absolute area in whatever units the ring is in.
function ringArea(ring: [number, number][]): number {
  let a = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

// In scene-space (PROJ_SCALE=200), 1 sq unit ≈ 1/40000 sq° ≈ 310,000 m².
// Holes below this are coordinate-rounding artifacts from the pipeline (we saw
// many zero-area 4-vertex "holes" in URA Master Plan data after 5-decimal
// rounding). Earcut's filterPoints would drop all their vertices and then
// crash with "list is undefined" inside eliminateHoles. Filter them here.
const MIN_HOLE_AREA = 1e-3;   // ≈ 310 m² in real-world terms
const MIN_OUTER_AREA = 1e-4;  // outers can legitimately be very small islands

function projectPolygon(coords: PolygonCoords): AreaPolygon | null {
  const outerRaw = coords[0];
  if (!outerRaw || outerRaw.length < 3) return null;

  const outer = stripClosingPoint(outerRaw.map(project));
  if (outer.length < 3) return null;
  if (ringArea(outer) < MIN_OUTER_AREA) return null;

  const holes = coords
    .slice(1)
    .map((r) => stripClosingPoint(r.map(project)))
    .filter((h) => h.length >= 3 && ringArea(h) >= MIN_HOLE_AREA);

  return { outer, holes };
}

function buildModel(feature: RawFeature, idx: number, layer: Layer): AreaModel {
  const rawName = pickName(feature.properties);
  const name = toTitleCase(rawName);

  const rawPolys =
    feature.geometry.type === 'Polygon'
      ? [projectPolygon(feature.geometry.coordinates)]
      : feature.geometry.coordinates.map(projectPolygon);

  const polygons: AreaPolygon[] = rawPolys.filter(
    (p): p is AreaPolygon => p !== null,
  );

  // Centroid = mean of all outer-ring vertices across polygons
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const p of polygons) {
    for (const [x, y] of p.outer) {
      sx += x;
      sy += y;
      n++;
    }
  }
  const center: [number, number] = n > 0 ? [sx / n, sy / n] : [0, 0];

  return {
    id: `${layer}/${rawName}/${idx}`,
    name,
    polygons,
    center,
    metrics: metricsFor(rawName),
  };
}

export async function loadLayer(layer: Layer, baseUrl: string): Promise<AreaModel[]> {
  const meta = LAYERS.find((l) => l.id === layer);
  if (!meta) throw new Error(`Unknown layer: ${layer}`);

  const url = `${baseUrl}data/${meta.file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);

  const data = (await res.json()) as RawFeatureCollection;
  return data.features.map((f, i) => buildModel(f, i, layer));
}

// Bounding box of all projected outer rings — used to recenter the camera target.
export function boundsOf(models: AreaModel[]): {
  cx: number;
  cy: number;
  size: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const m of models) {
    for (const p of m.polygons) {
      for (const [x, y] of p.outer) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    size: Math.max(maxX - minX, maxY - minY),
  };
}
