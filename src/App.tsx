import { useCallback, useEffect, useMemo, useState } from 'react';
import { LAYERS, loadLayer, type AreaModel, type Layer } from './lib/geojson';
import { useTheme } from './lib/theme';
import { useDocumentVisible, useLocalStorageState, useReducedMotion } from './lib/hooks';
import { CONFIG } from './config';
import { MapScene } from './components/MapScene';
import { HUD } from './components/HUD';
import { LayerSwitcher } from './components/LayerSwitcher';
import { InfoCard } from './components/InfoCard';
import { ThemeToggle } from './components/ThemeToggle';
import { FpsBadge } from './components/FpsBadge';
import { SelectionBreadcrumb } from './components/SelectionBreadcrumb';

export type TagMode = 'all' | 'hover' | 'off';

export type Toggles = {
  pillars: boolean;
  tagMode: TagMode;
  ripple: boolean;
  particles: boolean;
};

function initialToggles(reducedMotion: boolean): Toggles {
  return {
    pillars: true,
    tagMode: 'all',
    ripple: !reducedMotion,
    particles: !reducedMotion,
  };
}

export default function App() {
  const reducedMotion = useReducedMotion();
  const visible = useDocumentVisible();

  const [layer, setLayer] = useLocalStorageState<Layer>('sg-map.layer', 'planning-areas');
  const [toggles, setToggles] = useLocalStorageState<Toggles>(
    'sg-map.toggles',
    initialToggles(reducedMotion),
  );

  const [models, setModels] = useState<AreaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const { pref, tokens, cycle } = useTheme();

  // Layer load with fade. `fading` drives a CSS opacity transition on the
  // canvas wrap so layer switches don't pop.
  const [fading, setFading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setFading(true);
    setLoading(true);
    setError(null);
    setSelectedName(null);
    setCardOpen(false);

    loadLayer(layer, import.meta.env.BASE_URL)
      .then((m) => {
        if (!cancelled) {
          setModels(m);
          setLoading(false);
          // One frame later, fade back in — gives the new geometry time to
          // upload to the GPU before becoming visible.
          requestAnimationFrame(() => requestAnimationFrame(() => setFading(false)));
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
          setFading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [layer]);

  const sortedModels = useMemo(
    () => [...models].sort((a, b) => a.name.localeCompare(b.name)),
    [models],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) {
        return;
      }

      if (e.key === 'Escape') {
        setCardOpen(false);
        return;
      }

      if (sortedModels.length === 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const idx = sortedModels.findIndex((m) => m.name === selectedName);
        const step = e.key === 'ArrowRight' ? 1 : -1;
        const len = sortedModels.length;
        const nextIdx = idx === -1 ? 0 : (idx + step + len) % len;
        setSelectedName(sortedModels[nextIdx].name);
        setCardOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sortedModels, selectedName]);

  const selectedModel = useMemo(
    () => models.find((m) => m.name === selectedName) ?? null,
    [models, selectedName],
  );

  // Camera-lerp target — scene position above the selected area centroid.
  // null when nothing is selected, in which case CameraTarget no-ops.
  const lerpTarget = useMemo<[number, number, number] | null>(() => {
    if (!selectedModel) return null;
    const [cx, cy] = selectedModel.center;
    return [cx, CONFIG.extrude.depth, -cy];
  }, [selectedModel]);

  const layerMeta = useMemo(() => LAYERS.find((l) => l.id === layer)!, [layer]);

  const handleToggle = useCallback(
    (key: keyof Toggles) => {
      setToggles((t) => {
        if (key === 'tagMode') {
          const next: TagMode =
            t.tagMode === 'all' ? 'hover' : t.tagMode === 'hover' ? 'off' : 'all';
          return { ...t, tagMode: next };
        }
        return { ...t, [key]: !t[key] };
      });
    },
    [setToggles],
  );

  const handleSelect = useCallback((m: AreaModel) => {
    setSelectedName(m.name);
    setCardOpen(true);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedName(null);
    setCardOpen(false);
  }, []);

  const handleCardClose = useCallback(() => setCardOpen(false), []);
  const handleBreadcrumbReopen = useCallback(() => setCardOpen(true), []);
  const handleContextLost = useCallback(() => setContextLost(true), []);

  return (
    <div className="app">
      <div className={`canvas-wrap${fading ? ' fading' : ''}`}>
        <MapScene
          models={models}
          selected={selectedName}
          hovered={hoveredName}
          tagMode={toggles.tagMode}
          toggles={toggles}
          theme={tokens}
          reducedMotion={reducedMotion}
          visible={visible}
          lerpTarget={lerpTarget}
          onSelect={handleSelect}
          onHover={setHoveredName}
          onDeselect={handleDeselect}
          onContextLost={handleContextLost}
        />
      </div>

      <HUD
        count={models.length}
        countLabel={layerMeta.label}
        toggles={toggles}
        onToggle={handleToggle}
      />

      <ThemeToggle pref={pref} onCycle={cycle} />
      <FpsBadge />
      <LayerSwitcher active={layer} onChange={setLayer} />

      <InfoCard
        model={cardOpen ? selectedModel : null}
        layerLabel={layerMeta.label}
        onClose={handleCardClose}
      />

      {selectedModel && !cardOpen && (
        <SelectionBreadcrumb
          name={selectedModel.name}
          onReopen={handleBreadcrumbReopen}
          onClear={handleDeselect}
        />
      )}

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="loading error">{error}</div>}
      {contextLost && (
        <div className="context-lost">
          <p className="loading error">WebGL context lost</p>
          <button onClick={() => window.location.reload()} className="reload-btn">
            Reload
          </button>
        </div>
      )}
    </div>
  );
}
