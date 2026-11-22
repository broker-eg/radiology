import { CircleArrowDown, CircleCheck, Download, Loader2, WifiOff } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SuiteApp } from '@/types/domain';
import { offlineSupported } from '../api/offlineStore';
import { useConnected, useOfflineMap, useRemoveOffline } from '../hooks/useOffline';
import { downloadApps, useDownloadProgress } from '../lib/downloads';

/** Corner mark on a tile: this generator opens with no connection. */
export function OfflineMark({ className }: { className?: string }) {
  const t = useT();
  return (
    <CircleArrowDown
      role="img"
      aria-label={t.offline.mark}
      className={cn('h-3.5 w-3.5 shrink-0', className)}
    >
      <title>{t.offline.mark}</title>
    </CircleArrowDown>
  );
}

/** Details sheet: download for offline / downloading / available offline (press to remove). */
export function OfflineToggle({ app }: { app: SuiteApp }) {
  const t = useT();
  const connected = useConnected();
  const { data: saved } = useOfflineMap();
  const progress = useDownloadProgress();
  const remove = useRemoveOffline();
  if (!offlineSupported() || app.kind !== 'integrated' || !app.htmlPath) return null;

  const entry = saved?.get(app.id);
  if (progress.pending.has(app.id)) {
    return (
      <button type="button" className="btn-ghost" disabled>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t.offline.downloadingOne}
      </button>
    );
  }
  if (entry) {
    return (
      <button
        type="button"
        className="btn-ghost"
        aria-pressed
        title={t.offline.removeDownload}
        onClick={() => remove.mutate([entry])}
        disabled={remove.isPending}
      >
        <CircleCheck className="h-4 w-4 text-localizer" aria-hidden />
        {t.offline.availableOffline}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="btn-ghost"
      aria-pressed={false}
      onClick={() => downloadApps([app])}
      disabled={!connected}
      title={connected ? undefined : t.offline.needsConnection}
    >
      <Download className="h-4 w-4" aria-hidden />
      {t.offline.downloadForOffline}
    </button>
  );
}

/** Under the header while there's no connection: what still works, and where it is. */
export function OfflineBanner() {
  const t = useT();
  const connected = useConnected();
  const { pathname } = useLocation();
  const { data: saved } = useOfflineMap();
  if (connected) return null;
  return (
    <div className="border-t border-ink-700 bg-ink-850" role="status">
      <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-4 py-1.5 text-sm sm:px-6">
        <WifiOff className="h-4 w-4 shrink-0 text-alert" aria-hidden />
        <p className="min-w-0 flex-1 text-film-300">{t.offline.workingOffline}</p>
        {pathname !== '/offline' && (
          <Link
            to="/offline"
            className="shrink-0 font-medium text-localizer hover:underline touch:py-1.5"
          >
            {t.offline.openLibrary(saved?.size ?? 0)}
          </Link>
        )}
      </div>
    </div>
  );
}
