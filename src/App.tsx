import { useCallback, useEffect, useMemo, useState } from 'react';
import { LAYERS, loadLayer, type AreaModel, type Layer } from './lib/geojson';
import { useTheme } from './lib/theme';
import { MapScene } from './components/MapScene';
import { HUD } from './components/HUD';
import { LayerSwitcher } from './components/LayerSwitcher';
import { InfoCard } from './components/InfoCard';
import { ThemeToggle } from './components/ThemeToggle';
import { FpsBadge } from './components/FpsBadge';

type Toggles = {
  pillars: boolean;
  tags: boolean;
  ripple: boolean;
  particles: boolean;
};

const INITIAL_TOGGLES: Toggles = {
  pillars: true,
  tags: true,
  ripple: true,
  particles: true,
};

export default function App() {
  const [layer, setLayer] = useState<Layer>('planning-areas');
  const [models, setModels] = useState<AreaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [toggles, setToggles] = useState<Toggles>(INITIAL_TOGGLES);
  const { pref, tokens, cycle } = useTheme();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedName(null);

    loadLayer(layer, import.meta.env.BASE_URL)
      .then((m) => {
        if (!cancelled) {
          setModels(m);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [layer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedName(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selectedModel = useMemo(
    () => models.find((m) => m.name === selectedName) ?? null,
    [models, selectedName],
  );

  const layerMeta = useMemo(() => LAYERS.find((l) => l.id === layer)!, [layer]);

  const handleToggle = useCallback((key: keyof Toggles) => {
    setToggles((t) => ({ ...t, [key]: !t[key] }));
  }, []);

  return (
    <div className="app">
      <div className="canvas-wrap">
        <MapScene
          models={models}
          selected={selectedName}
          toggles={toggles}
          theme={tokens}
          onSelect={(m) => setSelectedName(m.name)}
          onDeselect={() => setSelectedName(null)}
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
        model={selectedModel}
        layerLabel={layerMeta.label}
        onClose={() => setSelectedName(null)}
      />

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="loading error">{error}</div>}
    </div>
  );
}
