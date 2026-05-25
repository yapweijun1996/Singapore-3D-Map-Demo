import { useEffect, useRef } from 'react';
import type { AreaModel } from '../lib/geojson';

interface Props {
  model: AreaModel | null;
  layerLabel: string;
  onClose: () => void;
}

export function InfoCard({ model, layerLabel, onClose }: Props) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus management + Tab trap while the card is open.
  useEffect(() => {
    if (!model) return;
    const card = ref.current;
    if (!card) return;

    // Remember what was focused so we can restore on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = card.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [model]);

  return (
    <aside ref={ref} className={`card ${model ? 'show' : ''}`} aria-hidden={!model}>
      <button ref={closeRef} className="close" onClick={onClose} aria-label="Close details">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M2 2 L12 12 M12 2 L2 12" />
        </svg>
      </button>
      <div className="eyebrow">
        <span>{layerLabel}</span>
        <span className="demo-pill">Demo data</span>
      </div>
      <div className="name">{model?.name ?? '—'}</div>
      <div className="stat">
        <div className="stat-label">Visitor Flow</div>
        <div className="stat-value">
          {model?.metrics.value ?? '—'}
          <span className="unit">k</span>
        </div>
      </div>
      <div className="stat">
        <div className="stat-label">Capacity</div>
        <div className="stat-value">{model?.metrics.capacity ?? '—'}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Traffic</div>
        <div className="stat-value">
          {model?.metrics.traffic ?? '—'}
          <span className="unit">%</span>
        </div>
      </div>
      <div className="stat">
        <div className="stat-label">Hot trend</div>
        <div className="stat-value">
          {model?.metrics.trend ?? '—'}
          <span className="unit">%</span>
        </div>
      </div>
    </aside>
  );
}
