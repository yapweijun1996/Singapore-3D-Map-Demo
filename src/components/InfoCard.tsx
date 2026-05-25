import type { AreaModel } from '../lib/geojson';

interface Props {
  model: AreaModel | null;
  layerLabel: string;
  onClose: () => void;
}

export function InfoCard({ model, layerLabel, onClose }: Props) {
  // Keep the previously selected model rendered during the close animation
  // so the card doesn't pop empty as it slides out.
  const m = model;

  return (
    <aside className={`card ${m ? 'show' : ''}`}>
      <button className="close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M2 2 L12 12 M12 2 L2 12" />
        </svg>
      </button>
      <div className="eyebrow">
        <span>{layerLabel}</span>
        <span className="demo-pill">Demo data</span>
      </div>
      <div className="name">{m?.name ?? '—'}</div>
      <div className="stat">
        <div className="stat-label">Visitor Flow</div>
        <div className="stat-value">
          {m?.metrics.value ?? '—'}
          <span className="unit">k</span>
        </div>
      </div>
      <div className="stat">
        <div className="stat-label">Capacity</div>
        <div className="stat-value">{m?.metrics.capacity ?? '—'}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Traffic</div>
        <div className="stat-value">
          {m?.metrics.traffic ?? '—'}
          <span className="unit">%</span>
        </div>
      </div>
      <div className="stat">
        <div className="stat-label">Hot trend</div>
        <div className="stat-value">
          {m?.metrics.trend ?? '—'}
          <span className="unit">%</span>
        </div>
      </div>
    </aside>
  );
}
