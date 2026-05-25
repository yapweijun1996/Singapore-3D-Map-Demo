import type { ThemePref } from '../lib/theme';

interface Props {
  pref: ThemePref;
  onCycle: () => void;
}

// Three icons: ◐ auto (system), ● dark (moon), ○ light (sun)
const TITLE: Record<ThemePref, string> = {
  auto: 'Theme: auto (system)',
  dark: 'Theme: dark',
  light: 'Theme: light',
};

export function ThemeToggle({ pref, onCycle }: Props) {
  return (
    <button
      className="theme-toggle"
      onClick={onCycle}
      title={`${TITLE[pref]} — click to cycle`}
      aria-label={TITLE[pref]}
    >
      {pref === 'dark' && (
        // Moon
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      {pref === 'light' && (
        // Sun
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
      {pref === 'auto' && (
        // Half-circle (system)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}
