import { useEffect, useState, useSyncExternalStore } from 'react';

// Installability: the manifest + service worker make the suite an installable app.
// Chromium (Android, desktop Chrome/Edge) hands us a one-tap prompt (beforeinstallprompt);
// everywhere else we show the browser's own steps, with an arrow at the control to tap.

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
let justInstalled = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    justInstalled = true;
    emit();
  });
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Which manual steps fit this browser (null: no manual route, wait for a native prompt). */
export type InstallGuide =
  | 'ios-safari' // iOS ≤ 18: Share sits in the bottom toolbar
  | 'ios-safari-26' // iOS 26+: ••• in the bottom bar, then Share
  | 'ipad-safari' // Share at the top of the toolbar
  | 'ios-chrome' // Share in Chrome's address bar
  | 'ios-other'
  | 'android' // ⋮ browser menu
  | 'mac-safari' // File → Add to Dock
  | 'in-app'; // Instagram/Facebook…: can't install, open in a browser first

function detectGuide(): InstallGuide | null {
  const ua = navigator.userAgent;
  const iPad =
    /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const iPhone = /iPhone|iPod/.test(ua);
  const inApp = /FBAN|FBAV|Instagram|LinkedInApp|Snapchat|TikTok|musical_ly|Line\//i.test(ua);
  if (iPad || iPhone) {
    if (inApp) return 'in-app';
    if (/CriOS/.test(ua)) return 'ios-chrome';
    if (/FxiOS|EdgiOS|OPiOS|YaBrowser|GSA\//.test(ua)) return 'ios-other';
    if (iPad) return 'ipad-safari';
    // iOS 26 freezes the OS version in the UA, but Safari's own Version/ keeps counting.
    const safari = Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0);
    return safari >= 26 ? 'ios-safari-26' : 'ios-safari';
  }
  if (/Android/i.test(ua)) return inApp ? 'in-app' : 'android';
  if (
    /Macintosh/.test(ua) &&
    /Version\/(1[7-9]|[2-9]\d)/.test(ua) &&
    !/Chrome|Chromium|Edg|Firefox|OPR/.test(ua)
  )
    return 'mac-safari';
  return null;
}

const guide = typeof navigator === 'undefined' ? null : detectGuide();

export type InstallState =
  | { kind: 'installed' }
  | { kind: 'prompt'; install: () => Promise<boolean> }
  | { kind: 'manual'; guide: InstallGuide }
  | { kind: 'unavailable' };

function readState(): InstallState {
  if (justInstalled || isStandalone()) return { kind: 'installed' };
  if (deferredPrompt) {
    const prompt = deferredPrompt;
    return {
      kind: 'prompt',
      install: async () => {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        deferredPrompt = null;
        emit();
        return outcome === 'accepted';
      },
    };
  }
  if (guide) return { kind: 'manual', guide };
  return { kind: 'unavailable' };
}

export function useInstallState(): InstallState {
  const [state, setState] = useState<InstallState>(readState);
  useEffect(() => {
    const update = () => setState(readState());
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);
  return state;
}

/** Phones and tablets get the home-screen wording and an arrow at the browser control. */
export function isHandheld(g: InstallGuide | null = guide): boolean {
  return g !== null && g !== 'mac-safari';
}

/**
 * Where the browser control lives, in physical screen terms. The browser's own toolbar follows
 * the device language, not the page, so an Arabic phone puts "end" controls on the left.
 */
export function guideArrow(
  g: InstallGuide,
): { edge: 'top' | 'bottom'; side: 'left' | 'center' | 'right' } | null {
  const rtlChrome = /^(ar|he|fa|ur)\b/i.test(navigator.language);
  const end = rtlChrome ? 'left' : 'right';
  switch (g) {
    case 'ios-safari':
      return { edge: 'bottom', side: 'center' };
    case 'ios-safari-26':
      return { edge: 'bottom', side: end };
    case 'ipad-safari':
    case 'ios-chrome':
    case 'android':
      return { edge: 'top', side: end };
    default:
      return null;
  }
}

// --- "Not now" snooze and explicit requests ------------------------------------------------

const SNOOZE_KEY = 'radiology:install-snooze';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

export function isInstallSnoozed(): boolean {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

export function snoozeInstall() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    /* the prompt just comes back next visit */
  }
}

// Install buttons (header, menu, sign-in screen, tour) ask the install sheet to open.
let requests = 0;
const requestListeners = new Set<() => void>();

export function requestInstallHelp() {
  requests += 1;
  requestListeners.forEach((l) => l());
}

export function useInstallHelpRequests(): number {
  return useSyncExternalStore(
    (listener) => {
      requestListeners.add(listener);
      return () => requestListeners.delete(listener);
    },
    () => requests,
  );
}

/** One entry point for every "Install app" button: native prompt when we have it, else steps. */
export function startInstall(state: InstallState) {
  if (state.kind === 'prompt') void state.install();
  else requestInstallHelp();
}
