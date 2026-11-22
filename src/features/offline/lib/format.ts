import { getLang, locale } from '@/lib/i18n';

/** 1.4 MB, 820 KB — units stay Latin in Arabic, like the scores around them. */
export function formatBytes(bytes: number): string {
  const fmt = (n: number, digits: number) =>
    new Intl.NumberFormat(locale(getLang()), { maximumFractionDigits: digits }).format(n);
  const mb = 1024 * 1024;
  if (bytes >= 1024 * mb) return `${fmt(bytes / (1024 * mb), bytes >= 100 * 1024 * mb ? 0 : 1)} GB`;
  if (bytes >= mb) return `${fmt(bytes / mb, 1)} MB`;
  return `${fmt(Math.max(1, Math.round(bytes / 1024)), 0)} KB`;
}

/** A file name the OS accepts: "Liver MRI — LI-RADS.html". */
export function htmlFileName(name: string): string {
  const base = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return `${base || 'generator'}.html`;
}
