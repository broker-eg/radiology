import { useSyncExternalStore } from 'react';

// Dark ("reading room") is the default; light ("lightbox") is opt-in and remembered per
// device. index.html applies the stored choice before first paint.
export type Theme = 'dark' | 'light';

const KEY = 'radiology:theme';
const THEME_COLOR: Record<Theme, string> = { dark: '#0A1220', light: '#E9EEF4' };
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

let theme: Theme = read();

function apply() {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

apply();

export function setTheme(next: Theme) {
  theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* per-device preference only */
  }
  apply();
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => theme,
  );
}
