import type { TagMode, Toggles } from '../App';

interface Props {
  count: number;
  countLabel: string;
  toggles: Toggles;
  onToggle: (key: keyof Toggles) => void;
}

const TAG_MODE_LABEL: Record<TagMode, string> = {
  all: 'All',
  hover: 'Hover',
  off: 'Off',
};

export function HUD({ count, countLabel, toggles, onToggle }: Props) {
  const tagOn = toggles.tagMode !== 'off';

  return (
    <>
      <header className="hero">
        <div className="title">Singapore</div>
        <div className="meta">
          Planning Areas <span className="dot">·</span> URA Master Plan
          <span className="dot">·</span>
          <span className="meta-warn">Demo data</span>
        </div>
      </header>

      <div className="counter">
        <div className="num">{count}</div>
        <div className="label">{countLabel}</div>
      </div>

      <div className="hint">
        <span className="hint-pointer">
          <span className="key">Click</span>to explore
          <br />
          <span className="key">Drag</span>to rotate
          <span className="hint-sep">·</span>
          <span className="key">Scroll</span>to zoom
        </span>
        <span className="hint-touch">
          <span className="key">Tap</span>to explore
          <br />
          <span className="key">Drag</span>to rotate
          <span className="hint-sep">·</span>
          <span className="key">Pinch</span>to zoom
        </span>
      </div>

      <nav className="controls" aria-label="Visual layers">
        <div className="controls-group" aria-label="Data">
          <button
            className={toggles.pillars ? 'active' : ''}
            onClick={() => onToggle('pillars')}
            aria-pressed={toggles.pillars}
          >
            <span className="indicator" />
            Pillars
          </button>
          <button
            className={tagOn ? 'active' : ''}
            onClick={() => onToggle('tagMode')}
            aria-label={`Cycle tag mode (current: ${TAG_MODE_LABEL[toggles.tagMode]})`}
          >
            <span className="indicator" />
            Tags
            <span className="control-meta">{TAG_MODE_LABEL[toggles.tagMode]}</span>
          </button>
        </div>

        <span className="controls-divider" aria-hidden="true" />

        <div className="controls-group" aria-label="Ambiance">
          <button
            className={toggles.ripple ? 'active' : ''}
            onClick={() => onToggle('ripple')}
            aria-pressed={toggles.ripple}
          >
            <span className="indicator" />
            Ripple
          </button>
          <button
            className={toggles.particles ? 'active' : ''}
            onClick={() => onToggle('particles')}
            aria-pressed={toggles.particles}
          >
            <span className="indicator" />
            Atmosphere
          </button>
        </div>
      </nav>

      <footer className="attribution" aria-label="Data source">
        <span>URA Master Plan 2019</span>
        <span className="attribution-sep">·</span>
        <a
          href="https://data.gov.sg"
          target="_blank"
          rel="noopener noreferrer"
          className="attribution-link"
        >
          data.gov.sg
        </a>
      </footer>

      <div className="vignette" />
    </>
  );
}
