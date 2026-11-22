import { useSyncExternalStore } from 'react';

// Lets any screen (the header's "?" button) reopen the welcome tour.
let requests = 0;
const listeners = new Set<() => void>();

export function openTour() {
  requests += 1;
  listeners.forEach((l) => l());
}

/** Increases every time someone asks to see the tour again. */
export function useTourRequests(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => requests,
  );
}
