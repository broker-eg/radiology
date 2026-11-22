import { useSyncExternalStore } from 'react';

// Lets any screen (the header's "?" button) reopen the tour, and lets other overlays (the
// install suggestion) stay out of its way while it runs.
let requests = 0;
let active = false;
let shownThisSession = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openTour() {
  requests += 1;
  emit();
}

export function setTourActive(next: boolean) {
  if (next) shownThisSession = true;
  if (active === next) return;
  active = next;
  emit();
}

/** The tour includes an install step, so the suggestion doesn't repeat it in the same visit. */
export function tourShownThisSession(): boolean {
  return shownThisSession;
}

/** Increases every time someone asks to see the tour again. */
export function useTourRequests(): number {
  return useSyncExternalStore(subscribe, () => requests);
}

export function useTourActive(): boolean {
  return useSyncExternalStore(subscribe, () => active);
}
