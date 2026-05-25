// DEMO ONLY: these numbers are deterministic hashes of the area name,
// not real data. Replace with a real metric source for production.

export interface Metrics {
  value: number;     // "visitor flow"   100..999
  capacity: number;  // capacity         1000..3999
  traffic: number;   // traffic index    60..94
  trend: number;     // hot trend        70..99
}

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function metricsFor(name: string): Metrics {
  const h = hashStr(name);
  return {
    value: 100 + (h % 900),
    capacity: 1000 + ((h * 7) % 3000),
    traffic: 60 + ((h * 11) % 35),
    trend: 70 + ((h * 13) % 30),
  };
}

// Beam height as a function of "value" (4..18 scene units)
export function beamHeight(value: number): number {
  return 4 + (value / 1000) * 14;
}
