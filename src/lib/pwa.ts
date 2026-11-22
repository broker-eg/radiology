import { useEffect, useState } from 'react';

// Installability: the manifest + service worker make the suite an installable app
// (Android/desktop Chrome & Edge show an install prompt; iOS uses Share → Add to Home Screen).

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    // Relative URL + scope: works at the site root and under a GitHub Pages /<repo>/ prefix.
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      /* Installability degrades gracefully; the app works without the worker. */
    });
  });
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((l) => l());
  });
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export type InstallState =
  | { kind: 'installed' }
  | { kind: 'prompt'; install: () => Promise<void> }
  | { kind: 'ios' }
  | { kind: 'unavailable' };

function readState(): InstallState {
  if (isStandalone()) return { kind: 'installed' };
  if (deferredPrompt) {
    const prompt = deferredPrompt;
    return {
      kind: 'prompt',
      install: async () => {
        await prompt.prompt();
        await prompt.userChoice;
        deferredPrompt = null;
        listeners.forEach((l) => l());
      },
    };
  }
  if (isIos()) return { kind: 'ios' };
  return { kind: 'unavailable' };
}

export function useInstallState(): InstallState {
  const [state, setState] = useState<InstallState>(readState);
  useEffect(() => {
    const update = () => setState(readState());
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  return state;
}
