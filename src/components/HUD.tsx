interface Toggles {
  pillars: boolean;
  tags: boolean;
  ripple: boolean;
  particles: boolean;
}

interface Props {
  count: number;
  countLabel: string;
  toggles: Toggles;
  onToggle: (key: keyof Toggles) => void;
}

const ITEMS: { key: keyof Toggles; label: string }[] = [
  { key: 'pillars', label: 'Pillars' },
  { key: 'tags', label: 'Tags' },
  { key: 'ripple', label: 'Ripple' },
  { key: 'particles', label: 'Atmosphere' },
];

export function HUD({ count, countLabel, toggles, onToggle }: Props) {
  return (
    <>
      <header className="hero">
        <div className="title">Singapore</div>
        <div className="meta">
          Planning Areas <span className="dot">·</span> URA Master Plan
        </div>
      </header>

      <div className="counter">
        <div className="num">{count}</div>
        <div className="label">{countLabel}</div>
      </div>

      <div className="hint">
        <span className="key">Click</span>to explore
        <br />
        <span className="key">Drag</span>to rotate
        <span style={{ margin: '0 12px', color: 'var(--text-4)' }}>·</span>
        <span className="key">Scroll</span>to zoom
      </div>

      <nav className="controls" aria-label="Visual layers">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            className={toggles[item.key] ? 'active' : ''}
            onClick={() => onToggle(item.key)}
            aria-pressed={toggles[item.key]}
          >
            <span className="indicator" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="vignette" />
    </>
  );
}
