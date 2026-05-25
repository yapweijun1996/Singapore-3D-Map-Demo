import { useCallback, useEffect, useState } from 'react';

// ─── OKLCH → sRGB hex (Björn Ottosson's oklab matrix) ─────────────────────────
// Pure math, no DOM, no browser dependency. So the Three.js colors match what
// CSS would render for the same oklch() value.

function oklchToHex(L: number, C: number, H: number): number {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const toGamma = (v: number): number =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

  const clamp = (v: number): number => Math.max(0, Math.min(1, v));

  const r = Math.round(clamp(toGamma(rLin)) * 255);
  const g = Math.round(clamp(toGamma(gLin)) * 255);
  const b2 = Math.round(clamp(toGamma(bLin)) * 255);

  return (r << 16) | (g << 8) | b2;
}

// ─── Tokens ──────────────────────────────────────────────────────────────────
// Source of truth for both CSS and Three.js. CSS reads `${L} ${C} ${H}` via
// var(); Three.js reads the pre-resolved hex via TOKENS[theme].
// Keep this in sync with src/styles.css `:root[data-theme]` blocks.

type Oklch = readonly [L: number, C: number, H: number];

interface ThreeTokens {
  // Scene
  sceneBg: number;
  floor: number;

  // Lighting
  ambientI: number;
  keyI: number;
  fillI: number;
  keyLight: number;
  fillLight: number;

  // Areas
  areaTop: number;
  areaTopSelected: number;
  areaEmissive: number;
  areaEmissiveSelected: number;
  areaLine: number;
  areaLineOpacity: number;

  // Beam
  beamCore: number;
  beamCoreOpacity: number;
  beamHalo: number;
  beamHaloOpacity: number;

  // Particles
  particle: number;
  particleOpacity: number;

  // Ripple
  ripple: number;
  rippleOpacity: number;

  // Post
  bloomIntensity: number;
  bloomThreshold: number;
  bloomSmoothing: number;
}

// ─── "Night Atlas" — dark theme ───────────────────────────────────────────────
// Concept: a navigator's table at night. Cool teal base (water/floor), warm
// amber accent (selection/beam). Opposite-hue accent gives instant recognition.
const DARK: Record<string, Oklch> = {
  sceneBg: [0.085, 0.015, 230], // deep teal-navy water
  floor: [0.135, 0.025, 225],   // visible above bg, hint of chroma

  keyLight: [0.96, 0.05, 80],   // warm key (gold)
  fillLight: [0.55, 0.07, 240], // cool fill (blue)

  areaTop: [0.42, 0.04, 225],   // mid-luminance teal land — Δ 0.29 vs floor
  areaTopSel: [0.78, 0.16, 70], // warm amber — opposite hue family, jumps out
  areaEmissive: [0, 0, 0],
  areaEmissiveSel: [0.5, 0.14, 65], // amber glow boost on selection

  areaLine: [0.62, 0.06, 218],  // teal line, cohesive with bg family

  beam: [0.96, 0.08, 75],       // warm-white pillar (high L → bloom)
  halo: [0.82, 0.18, 70],       // amber halo, signature color
  particle: [0.82, 0.08, 218],  // cool blue atmospheric dust
  ripple: [0.95, 0.10, 75],     // warm white ripple, matches beam family
};

// ─── "Paper Atlas" — light theme ─────────────────────────────────────────────
// Concept: a refined map print. Warm cream paper, cool oceanic blue accent.
// Selection uses LOWER luminance (paper convention: highlighted = "inked").
const LIGHT: Record<string, Oklch> = {
  sceneBg: [0.965, 0.012, 85],  // warm cream paper
  floor: [0.91, 0.014, 240],    // subtle cool tint underneath, hints at water

  keyLight: [0.97, 0.025, 80],  // warm key, soft
  fillLight: [0.75, 0.05, 240], // cool fill, gentle

  areaTop: [0.86, 0.025, 78],   // paper-warm land tile
  areaTopSel: [0.48, 0.14, 235],// deep oceanic blue — "inked" selection
  areaEmissive: [0, 0, 0],
  areaEmissiveSel: [0, 0, 0],   // ZERO — Phong emissive ADDS light, would
                                // wash out the deliberate dark-selected color
  areaLine: [0.55, 0.04, 75],   // warm gray, calligraphic

  beam: [0.50, 0.20, 245],      // saturated brand blue (high chroma → bloom)
  halo: [0.60, 0.18, 240],
  particle: [0.50, 0.06, 75],   // warm gray dust
  ripple: [0.48, 0.14, 235],    // brand blue ripple, matches selection family
};

function resolveTokens(t: Record<string, Oklch>, isLight: boolean): ThreeTokens {
  return {
    sceneBg: oklchToHex(...t.sceneBg),
    floor: oklchToHex(...t.floor),

    // Light mode wants near-flat ambient (paper has no dramatic shadow);
    // dark mode wants directional theatre.
    ambientI: isLight ? 0.95 : 0.5,
    keyI: isLight ? 0.4 : 0.65,
    fillI: isLight ? 0.2 : 0.3,
    keyLight: oklchToHex(...t.keyLight),
    fillLight: oklchToHex(...t.fillLight),

    areaTop: oklchToHex(...t.areaTop),
    areaTopSelected: oklchToHex(...t.areaTopSel),
    areaEmissive: oklchToHex(...t.areaEmissive),
    areaEmissiveSelected: oklchToHex(...t.areaEmissiveSel),
    areaLine: oklchToHex(...t.areaLine),
    areaLineOpacity: isLight ? 0.55 : 0.55,

    beamCore: oklchToHex(...t.beam),
    beamCoreOpacity: isLight ? 0.95 : 0.9,
    beamHalo: oklchToHex(...t.halo),
    beamHaloOpacity: isLight ? 0.35 : 0.28,

    particle: oklchToHex(...t.particle),
    particleOpacity: isLight ? 0.45 : 0.5,

    ripple: oklchToHex(...t.ripple),
    rippleOpacity: isLight ? 0.45 : 0.5,

    // Lower threshold in light mode so the saturated brand-blue beam still
    // triggers bloom; higher in dark mode (white beam blows past easily).
    bloomIntensity: isLight ? 0.3 : 0.45,
    bloomThreshold: isLight ? 0.55 : 0.78,
    bloomSmoothing: 0.5,
  };
}

export const THEME: Record<ResolvedTheme, ThreeTokens> = {
  dark: resolveTokens(DARK, false),
  light: resolveTokens(LIGHT, true),
};

// ─── Theme preference / resolution ───────────────────────────────────────────

export type ThemePref = 'auto' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'sg-map.theme';

function readStoredPref(): ThemePref {
  if (typeof window === 'undefined') return 'auto';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'dark' || v === 'light' || v === 'auto' ? v : 'auto';
}

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyHtmlAttr(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
}

export function useTheme(): {
  pref: ThemePref;
  resolved: ResolvedTheme;
  tokens: ThreeTokens;
  cycle: () => void;
} {
  const [pref, setPref] = useState<ThemePref>(readStoredPref);
  const [sysIsLight, setSysIsLight] = useState<boolean>(
    () => systemTheme() === 'light',
  );

  // Sync with system pref + write attribute/localStorage
  useEffect(() => {
    applyHtmlAttr(pref);
    window.localStorage.setItem(STORAGE_KEY, pref);
  }, [pref]);

  // Listen to system-pref changes while pref === 'auto'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e: MediaQueryListEvent) => setSysIsLight(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved: ResolvedTheme =
    pref === 'auto' ? (sysIsLight ? 'light' : 'dark') : pref;

  const cycle = useCallback(() => {
    setPref((p) => (p === 'auto' ? 'dark' : p === 'dark' ? 'light' : 'auto'));
  }, []);

  return { pref, resolved, tokens: THEME[resolved], cycle };
}

export type { ThreeTokens };
