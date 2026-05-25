/**
 * Central registry of magic numbers driving the 3D scene.
 *
 * Color tokens live separately in {@link "./lib/theme"} because they have a
 * different change cadence (themes ship to users; these numbers are dev-only).
 *
 * Anything that a future Claude / dev would otherwise grep across components
 * to tune ("how tall is the extrude?", "how fast do ripples move?") should
 * land here. Read-only; mutate at your peril.
 */

export const CONFIG = {
  /** Equirectangular projection — see also `lib/projection.ts`. */
  proj: {
    /** Centre of the projection in `[lng, lat]`. Singapore approx. */
    center: [103.85, 1.35] as const,
    /** Scene units per degree. 200 → 1° lat ≈ 200 units. */
    scale: 200,
  },

  /** Extrude depth applied to every area polygon. */
  extrude: {
    /** Scene units. The whole map "thickness". */
    depth: 1.8,
  },

  /** Perspective camera + OrbitControls clamps. */
  camera: {
    fov: 38,
    near: 0.1,
    far: 2000,
    /** Starting position after the intro animation lands. */
    position: [0, 105, 135] as const,
    /** OrbitControls distance clamps (camera-to-target). */
    minDistance: 40,
    maxDistance: 260,
    /** OrbitControls polar clamps so the user can't fly underground. */
    minPolarAngle: 0.15,
    maxPolarAngle: Math.PI / 2.05,
    /** Damping factor for OrbitControls. */
    dampingFactor: 0.08,
  },

  /** Atmospheric particle field. Bloom-friendly additive points. */
  particles: {
    count: 250,
    /** Spawn-radius range in scene units around the origin (XZ plane). */
    rMin: 30,
    rMax: 110,
    /** Y range above the floor. */
    yMin: 10,
    yMax: 50,
    /** Per-particle Z-drift velocity bounds. */
    vMin: 0.05,
    vMax: 0.15,
    /** Wrap point on Z when a particle exits. */
    wrap: 110,
    /** Point size in scene units (before sizeAttenuation). */
    size: 0.5,
  },

  /** Three phase-offset rings on the ground. */
  ripple: {
    count: 3,
    /** Inner radius before scaling. */
    baseRadius: 20,
    /** Outer-edge thickness. */
    thickness: 0.12,
    /** Phase advance per second (cycles/sec). */
    speed: 0.18,
    /** Peak scale at end of a cycle. */
    maxScale: 6,
    /** Radial segments in the ring. */
    segments: 96,
  },

  /** "Data pillar" beam at each centroid. */
  beam: {
    /** Min beam height in scene units (corresponds to metric.value=0). */
    minHeight: 4,
    /** Multiplier added to minHeight, scaled by metric.value/1000. */
    scaleByValue: 14,
    /** Cylinder radial segments — 6 is a low-poly hexagonal pillar. */
    cylinderSegments: 6,
    /** Cylinder radius. */
    radius: 0.04,
    /** Sphere "tip" radius. */
    dotRadius: 0.18,
    /** Sphere halo radius. */
    haloRadius: 0.55,
    /** Halo pulse frequency (rad/sec). */
    pulseFreq: 1.3,
    /** Per-beam phase offset multiplier so they don't pulse in lockstep. */
    phaseSpread: 0.27,
  },

  /** Floor disc. */
  floor: {
    /** Radius of the ground plane. */
    radius: 280,
    /** Circle segments. */
    segments: 64,
  },

  /** Tag (drei `<Html>` label) sizing. */
  tag: {
    /** Y offset above the area surface where the dot sits. */
    yOffset: 0.25,
    /** drei distanceFactor — higher = labels shrink faster with distance. */
    distanceFactor: 75,
  },
} as const;
