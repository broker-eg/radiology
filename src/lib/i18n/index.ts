import { useSyncExternalStore } from 'react';
import { ar } from './ar';
import { en, type Messages } from './en';

// English is the default; Arabic switches the whole interface to right-to-left. The choice is
// remembered per device and applied before first paint by index.html. Catalog content (names,
// descriptions, regions) comes from the database and stays as written.
export type Lang = 'en' | 'ar';
export type { Messages };

const KEY = 'radiology:lang';
const MESSAGES: Record<Lang, Messages> = { en, ar };
const listeners = new Set<() => void>();

function read(): Lang {
  try {
    return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

let lang: Lang = read();

function apply() {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

apply();

export function setLang(next: Lang) {
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* per-device preference only */
  }
  apply();
  listeners.forEach((l) => l());
}

export function getLang(): Lang {
  return lang;
}

/** Messages for code outside React (toasts, services). */
export function t(): Messages {
  return MESSAGES[lang];
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, () => lang);
}

export function useT(): Messages {
  return MESSAGES[useLang()];
}

/**
 * Locale for Intl formatters: the browser's own for English; Arabic keeps Western digits so
 * dates read like the scores around them (LI-RADS 4, TI-RADS 3).
 */
export function locale(l: Lang = lang): string | undefined {
  return l === 'ar' ? 'ar-EG-u-nu-latn' : undefined;
}
