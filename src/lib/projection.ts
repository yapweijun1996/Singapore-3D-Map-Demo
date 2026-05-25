// Equirectangular projection around Singapore's approximate center.
// Not equal-area, ignores Earth curvature — fine at city scale.
export const PROJ_CENTER: [number, number] = [103.85, 1.35];
export const PROJ_SCALE = 200;

export function project([lng, lat]: [number, number]): [number, number] {
  return [(lng - PROJ_CENTER[0]) * PROJ_SCALE, (lat - PROJ_CENTER[1]) * PROJ_SCALE];
}
