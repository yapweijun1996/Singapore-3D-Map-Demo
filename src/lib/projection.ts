/**
 * Equirectangular projection helpers around Singapore's approximate center.
 * Not equal-area, ignores Earth curvature — fine at city scale, would distort
 * noticeably at country/continent scale.
 *
 * Shape of the math: `(lng - center.lng) * scale, (lat - center.lat) * scale`.
 *
 * @see {@link "../config"} for the canonical values (mirrored here for direct
 * import without pulling all of CONFIG).
 */

/** Centre of the projection in `[lng, lat]`. */
export const PROJ_CENTER: [number, number] = [103.85, 1.35];

/**
 * Scene units per degree. 200 means 1° latitude ≈ 200 scene units, which
 * makes Singapore's ~50 km diameter render as ~90 units across at this scale.
 */
export const PROJ_SCALE = 200;

/**
 * Project a `[lng, lat]` coordinate into local scene XY.
 *
 * Note: the consumer is responsible for rotating the resulting plane up onto
 * the world XZ plane (typically via `geometry.rotateX(-Math.PI / 2)`).
 */
export function project([lng, lat]: [number, number]): [number, number] {
  return [(lng - PROJ_CENTER[0]) * PROJ_SCALE, (lat - PROJ_CENTER[1]) * PROJ_SCALE];
}
