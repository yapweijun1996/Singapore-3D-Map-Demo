import { LAYERS, type Layer } from '../lib/geojson';

interface Props {
  active: Layer;
  onChange: (l: Layer) => void;
}

export function LayerSwitcher({ active, onChange }: Props) {
  return (
    <nav className="layer-switcher" aria-label="Boundary layer">
      {LAYERS.map((l) => (
        <button
          key={l.id}
          className={active === l.id ? 'active' : ''}
          onClick={() => onChange(l.id)}
          aria-pressed={active === l.id}
        >
          {l.label}
          <span className="count">{l.count}</span>
        </button>
      ))}
    </nav>
  );
}
