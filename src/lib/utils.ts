import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getLang, locale, t, type Lang } from '@/lib/i18n';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(lang: Lang, withTime: boolean): Intl.DateTimeFormat {
  const key = `${lang}:${withTime}`;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale(lang), {
      dateStyle: 'medium',
      ...(withTime ? { timeStyle: 'short' } : {}),
    });
    formatters.set(key, fmt);
  }
  return fmt;
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? formatter(getLang(), false).format(new Date(iso)) : '—';
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? formatter(getLang(), true).format(new Date(iso)) : t().common.never;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}
