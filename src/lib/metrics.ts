/**
 * DEMO-ONLY synthetic metrics derived from area names.
 *
 * The four numbers shown in the info card are NOT real data — they are
 * deterministic hashes of the area name, kept so the visualization has
 * something plausible to display. Replace via task T6 (real metric source).
 *
 * The `<InfoCard>` surfaces a "Demo data" pill so this caveat is visible
 * to users; do not remove that pill until real data lands.
 */

import { CONFIG } from '../config';

/** Synthetic per-area metrics. All values are placeholders. */
export interface Metrics {
  /** "Visitor flow" — drives beam height. Range 100..999. */
  value: number;
  /** Capacity headline number. Range 1000..3999. */
  capacity: number;
  /** Traffic index in %. Range 60..94. */
  traffic: number;
  /** "Hot trend" indicator in %. Range 70..99. */
  trend: number;
}

/**
 * Deterministic 32-bit string hash (djb2-ish, no UTF-16 handling).
 * Used purely for placeholder metric generation.
 */
export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Build a stable `Metrics` object from an area name. */
export function metricsFor(name: string): Metrics {
  const h = hashStr(name);
  return {
    value: 100 + (h % 900),
    capacity: 1000 + ((h * 7) % 3000),
    traffic: 60 + ((h * 11) % 35),
    trend: 70 + ((h * 13) % 30),
  };
}

/**
 * Map a `metrics.value` (~100..999) to a beam height in scene units (4..18).
 * Used by `<Beam>` and the picking/highlight code.
 */
export function beamHeight(value: number): number {
  return CONFIG.beam.minHeight + (value / 1000) * CONFIG.beam.scaleByValue;
}
