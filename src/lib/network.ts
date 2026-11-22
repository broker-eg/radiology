import { useSyncExternalStore } from 'react';

// The browser's own idea of connectivity. "Online" can still mean a dead connection, so
// callers treat it as a hint: a false here is reliable, a true is only hopeful.

function subscribe(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline);
}
