interface Props {
  name: string;
  onReopen: () => void;
  onClear: () => void;
}

/**
 * Persistent "Currently viewing: X" pill, shown when a selection exists but
 * the info card has been closed. Click the body to reopen the card; click
 * the ✕ to fully deselect (which the canvas-empty-click does too).
 */
export function SelectionBreadcrumb({ name, onReopen, onClear }: Props) {
  return (
    <div className="breadcrumb">
      <button
        className="breadcrumb-body"
        onClick={onReopen}
        title="Reopen details"
        aria-label={`Reopen ${name} details`}
      >
        <span className="breadcrumb-label">Viewing</span>
        <span className="breadcrumb-name">{name}</span>
      </button>
      <button
        className="breadcrumb-clear"
        onClick={onClear}
        title="Clear selection"
        aria-label={`Clear ${name} selection`}
      >
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M2 2 L12 12 M12 2 L2 12" />
        </svg>
      </button>
    </div>
  );
}
