import { useEffect, useState, useCallback } from 'react';

/**
 * `useState` that persists to `localStorage` under `key`. SSR-safe.
 * Parsing failures fall back to `initial`.
 */
export function useLocalStorageState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota / privacy mode — silently drop */
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * Tracks the user's `prefers-reduced-motion: reduce` media query.
 * Returns true if the system reports a preference for reduced motion.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * Stable callback wrapper for setState patterns where consumers want a
 * setter that takes `T` directly (no functional-update overload).
 * Useful for prop chains that don't want to leak React's setter signature.
 */
export function useSetter<T>(set: (next: T) => void): (v: T) => void {
  return useCallback((v: T) => set(v), [set]);
}

/**
 * Tracks `document.visibilityState === 'visible'`. Use to pause RAF-driven
 * work when the user backgrounds the tab.
 */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true;
    return document.visibilityState === 'visible';
  });

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible;
}
