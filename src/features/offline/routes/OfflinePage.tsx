import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CircleCheck,
  Download,
  ExternalLink,
  FileDown,
  HardDriveDownload,
  Loader2,
  Lock,
  MonitorDown,
  Play,
  RefreshCw,
  Search,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import fallbackCover from '@/assets/branding/fallback-cover.webp';
import { InstallButton } from '@/components/InstallButton';
import { SiteHeader } from '@/components/SiteHeader';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { Workspace } from '@/features/catalog/components/Workspace';
import { useApps } from '@/features/catalog/hooks/useCatalog';
import { useT } from '@/lib/i18n';
import { useInstallState } from '@/lib/pwa';
import { cn, formatDate } from '@/lib/utils';
import type { OfflineApp, SuiteApp } from '@/types/domain';
import { offlineSupported } from '../api/offlineStore';
import {
  useConnected,
  useDownloadSizes,
  useOfflineHousekeeping,
  useOfflineLibrary,
  useRemoveOffline,
  useSaveFile,
  useStorageEstimate,
} from '../hooks/useOffline';
import { cancelDownloads, downloadApps, useDownloadProgress } from '../lib/downloads';
import { formatBytes } from '../lib/format';

/** A catalog-shaped app from a download's saved details (offline, the catalog may be absent). */
function fromOffline(e: OfflineApp): SuiteApp {
  return {
    id: e.appId,
    name: e.name,
    category: e.category,
    modality: e.modality,
    status: 'Integrated',
    badge: e.badge,
    description: '',
    duplicateOf: null,
    kind: 'integrated',
    externalUrl: null,
    htmlPath: e.htmlPath,
    coverPath: null,
    coverUrl: e.coverUrl,
    tier: e.tier,
    sortOrder: 0,
    updatedAt: e.version,
  };
}

function matches(query: string, ...fields: (string | null)[]): boolean {
  const q = query.trim().toLowerCase();
  return !q || fields.some((f) => f?.toLowerCase().includes(q));
}

function Thumb({ src }: { src: string | null }) {
  return (
    <img
      src={src ?? fallbackCover}
      alt=""
      loading="lazy"
      onError={(e) => {
        // Offline and never cached: the bundled film instead of a broken image.
        if (!e.currentTarget.src.endsWith(fallbackCover)) e.currentTarget.src = fallbackCover;
      }}
      className="scheme-dark hidden h-10 w-16 shrink-0 rounded-sm bg-ink-950 object-cover sm:block"
    />
  );
}

/**
 * The offline library: download generators to this device, see what's saved and how big it is,
 * open them with no connection, keep them current, or save one as a standalone file.
 */
export function OfflinePage() {
  const t = useT();
  const connected = useConnected();
  const { hasPro, isFresh: profileFresh } = useProfile();
  const appsQ = useApps();
  const library = useOfflineLibrary();
  const storage = useStorageEstimate();
  const sizes = useDownloadSizes(connected);
  const progress = useDownloadProgress();
  const remove = useRemoveOffline();
  const saveFile = useSaveFile();
  const install = useInstallState();
  const [query, setQuery] = useState('');
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false);

  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const apps = useMemo(() => appsQ.data ?? [], [appsQ.data]);
  const saved = useMemo(() => library.data ?? [], [library.data]);
  const canLaunch = useCallback((app: SuiteApp) => hasPro || app.tier === 'free', [hasPro]);
  useOfflineHousekeeping(apps, canLaunch, connected && appsQ.isFetchedAfterMount && profileFresh);

  const byId = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);
  const savedById = useMemo(() => new Map(saved.map((e) => [e.appId, e])), [saved]);
  const integrated = apps.filter((a) => a.kind === 'integrated' && !!a.htmlPath);
  // What this account may keep offline. Anything already saved counts too: offline, the plan
  // may not be known yet, and a saved generator opens regardless.
  const downloadable = integrated.filter((a) => canLaunch(a) || savedById.has(a.id));
  const lockedCount = integrated.length - downloadable.length;
  const externalCount = apps.length - integrated.length;
  const notSaved = downloadable.filter((a) => !savedById.has(a.id));
  const outdated = downloadable.filter((a) => {
    const entry = savedById.get(a.id);
    return !!entry && entry.version !== a.updatedAt;
  });
  const sizeOf = (app: SuiteApp) => sizes.data?.get(app.htmlPath as string) ?? 0;
  const notSavedBytes = notSaved.reduce((sum, a) => sum + sizeOf(a), 0);
  const savedBytes = saved.reduce((sum, e) => sum + e.bytes, 0);
  const downloading = progress.pending.size > 0;

  const shownSaved = saved
    .filter((e) => matches(query, e.name, e.category, e.modality, e.badge))
    .sort((a, b) => a.name.localeCompare(b.name));
  const shownAvailable = notSaved.filter((a) =>
    matches(query, a.name, a.category, a.modality, a.badge),
  );

  // ?run= opens the workspace over this page, like the catalog (the back button closes it).
  const runId = params.get('run');
  const runEntry = runId ? savedById.get(runId) : undefined;
  const runCatalogApp = runId ? byId.get(runId) : undefined;
  const runApp = runCatalogApp ?? (runEntry ? fromOffline(runEntry) : null);
  const openApp = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('run', id);
    setParams(next);
  };
  const closeApp = () => {
    if (location.key !== 'default') navigate(-1);
    else setParams({}, { replace: true });
  };

  if (!offlineSupported()) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-10 text-center text-film-300">
          {t.offline.unsupported}
        </main>
      </div>
    );
  }

  const done = progress.done + progress.failed;
  const pct = progress.total ? Math.round((done / progress.total) * 100) : 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-[1100px] px-4 pb-[max(4rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-8">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <h1 className="type-condensed text-3xl font-semibold text-film-50 sm:text-4xl">
              {t.offline.title}
            </h1>
            <p className="mt-1 max-w-2xl text-film-400">{t.offline.lead}</p>
          </div>
          <span
            className={cn(
              'mt-1.5 inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-0.5 text-[13px] font-medium',
              connected ? 'border-ink-600 text-film-300' : 'border-alert/50 text-alert',
            )}
            role="status"
          >
            <span
              aria-hidden
              className={cn('h-2 w-2 rounded-full', connected ? 'bg-localizer' : 'bg-alert')}
            />
            {connected ? t.offline.online : t.offline.offline}
          </span>
        </div>

        {/* The device at a glance, read like a study's corner annotations. */}
        <section className="mt-6 rounded-md border border-ink-700 bg-ink-850">
          <dl className="grid grid-cols-3 [&>*+*]:border-s [&>*+*]:border-ink-700">
            <div className="px-3 py-3 sm:px-5">
              <dt className="text-[13px] text-film-500">{t.offline.statSaved}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-film-50 sm:text-2xl">
                {downloadable.length
                  ? t.offline.savedOf(downloadable.length - notSaved.length, downloadable.length)
                  : saved.length}
              </dd>
            </div>
            <div className="px-3 py-3 sm:px-5">
              <dt className="text-[13px] text-film-500">{t.offline.statOnDevice}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-film-50 sm:text-2xl">
                {formatBytes(savedBytes)}
              </dd>
            </div>
            <div className="px-3 py-3 sm:px-5">
              <dt className="text-[13px] text-film-500">{t.offline.statUpdates}</dt>
              <dd
                className={cn(
                  'mt-0.5 text-lg font-semibold tabular-nums sm:text-2xl',
                  outdated.length ? 'text-localizer' : 'text-film-50',
                )}
              >
                {outdated.length}
              </dd>
            </div>
          </dl>

          <div className="border-t border-ink-700 px-3 py-3 sm:px-5">
            {downloading ? (
              <div>
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-localizer" aria-hidden />
                  <p className="min-w-0 flex-1 text-sm text-film-100" aria-live="polite">
                    {t.offline.downloading(Math.min(done + 1, progress.total), progress.total)}
                    <span className="ms-2 tabular-nums text-film-500">
                      {formatBytes(progress.bytes)}
                    </span>
                  </p>
                  <button type="button" className="btn-quiet px-3 py-1.5" onClick={cancelDownloads}>
                    <X className="h-4 w-4" aria-hidden />
                    {t.offline.stop}
                  </button>
                </div>
                <div
                  className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-700"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                  aria-valuenow={done}
                >
                  <div
                    className="h-full rounded-full bg-localizer transition-[width] duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ) : !connected ? (
              <p className="flex items-center gap-2 text-sm text-film-300">
                <WifiOff className="h-4 w-4 shrink-0 text-alert" aria-hidden />
                {t.offline.needsConnection}
              </p>
            ) : notSaved.length || outdated.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {notSaved.length > 0 && (
                  <button
                    type="button"
                    className="btn-primary touch:min-h-11"
                    onClick={() => downloadApps(notSaved)}
                  >
                    <HardDriveDownload className="h-4 w-4" aria-hidden />
                    {saved.length
                      ? t.offline.downloadRest(notSaved.length)
                      : t.offline.downloadAll(notSaved.length)}
                    {notSavedBytes > 0 && (
                      <span className="font-normal tabular-nums opacity-80">
                        · {formatBytes(notSavedBytes)}
                      </span>
                    )}
                  </button>
                )}
                {outdated.length > 0 && (
                  <button
                    type="button"
                    className="btn-quiet touch:min-h-11"
                    onClick={() => downloadApps(outdated)}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    {t.offline.updateAll(outdated.length)}
                  </button>
                )}
              </div>
            ) : downloadable.length ? (
              <p className="flex items-center gap-2 text-sm text-film-300">
                <CircleCheck className="h-4 w-4 shrink-0 text-localizer" aria-hidden />
                {t.offline.allSaved}
              </p>
            ) : null}
            {storage.data && (
              <p className="mt-2 text-[13px] tabular-nums text-film-500">
                {t.offline.storageUse(
                  formatBytes(storage.data.usage),
                  formatBytes(storage.data.quota),
                )}
              </p>
            )}
          </div>
        </section>

        {(saved.length > 0 || notSaved.length > 0) && (
          <div className="relative mt-6">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-localizer"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.offline.filterLabel}
              aria-label={t.offline.filterLabel}
              autoComplete="off"
              className="field ps-9"
            />
          </div>
        )}

        <section className="mt-6" aria-labelledby="saved-heading">
          <div className="flex items-center gap-3 border-b border-ink-700 pb-2">
            <h2 id="saved-heading" className="me-auto text-sm font-medium text-film-300">
              {t.offline.sectionSaved}
              <span className="ms-2 tabular-nums text-film-500">{saved.length}</span>
            </h2>
            {saved.length > 1 &&
              (confirmRemoveAll ? (
                <button
                  type="button"
                  className="btn-danger px-3 py-1.5"
                  onClick={() => {
                    remove.mutate(saved);
                    setConfirmRemoveAll(false);
                  }}
                  disabled={remove.isPending}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {t.offline.confirmRemoveAll(saved.length)}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-ghost px-3 py-1.5 text-film-400"
                  onClick={() => setConfirmRemoveAll(true)}
                >
                  {t.offline.removeAll}
                </button>
              ))}
          </div>

          {library.isLoading ? (
            <div className="space-y-3 py-4" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-ink-800" />
              ))}
            </div>
          ) : saved.length === 0 ? (
            <div className="py-10 text-center">
              <HardDriveDownload className="mx-auto h-7 w-7 text-film-500" aria-hidden />
              <p className="mt-3 font-semibold text-film-50">{t.offline.emptyTitle}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-film-400">{t.offline.emptyBody}</p>
            </div>
          ) : shownSaved.length === 0 ? (
            <p className="py-6 text-sm text-film-500">{t.offline.filterEmpty}</p>
          ) : (
            <ul className="divide-y divide-ink-700">
              {shownSaved.map((entry) => {
                const app = byId.get(entry.appId);
                const isOutdated = !!app && app.updatedAt !== entry.version;
                const updating = progress.pending.has(entry.appId);
                return (
                  <li key={entry.appId} className="flex items-center gap-3 py-3">
                    <Thumb src={app?.coverUrl ?? entry.coverUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="data-text line-clamp-2 font-medium leading-snug text-film-50">
                        {entry.name}
                      </p>
                      <p className="mt-0.5 text-[13px] text-film-500">
                        <span className="data-text inline">{entry.category}</span>
                        <span className="tabular-nums"> · {formatBytes(entry.bytes)}</span>
                        <span className="max-sm:hidden">
                          {' · '}
                          {t.offline.savedOn(formatDate(entry.savedAt))}
                        </span>
                        {' · '}
                        <span className={isOutdated ? 'text-localizer' : undefined}>
                          {isOutdated ? t.offline.updateAvailable : t.offline.upToDate}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                      {isOutdated && app && connected && (
                        <button
                          type="button"
                          className="btn-ghost px-2.5"
                          onClick={() => downloadApps([app])}
                          disabled={updating}
                          aria-label={t.offline.update}
                          title={t.offline.update}
                        >
                          <RefreshCw
                            className={cn('h-4 w-4 text-localizer', updating && 'animate-spin')}
                            aria-hidden
                          />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-ghost px-2.5"
                        onClick={() => saveFile.mutate(entry)}
                        aria-label={t.offline.saveFile}
                        title={t.offline.saveFile}
                      >
                        <FileDown className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost px-2.5 hover:text-alert"
                        onClick={() => remove.mutate([entry])}
                        disabled={remove.isPending}
                        aria-label={t.offline.remove}
                        title={t.offline.remove}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="btn-primary ms-1 px-3 py-1.5"
                        onClick={() => openApp(entry.appId)}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                        {t.offline.open}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {notSaved.length > 0 && (
          <section className="mt-10" aria-labelledby="available-heading">
            <h2
              id="available-heading"
              className="border-b border-ink-700 pb-2 text-sm font-medium text-film-300"
            >
              {t.offline.sectionAvailable}
              <span className="ms-2 tabular-nums text-film-500">{notSaved.length}</span>
            </h2>
            {shownAvailable.length === 0 ? (
              <p className="py-6 text-sm text-film-500">{t.offline.filterEmpty}</p>
            ) : (
              <ul className="divide-y divide-ink-700">
                {shownAvailable.map((app) => {
                  const pending = progress.pending.has(app.id);
                  const bytes = sizeOf(app);
                  return (
                    <li key={app.id} className="flex items-center gap-3 py-3">
                      <Thumb src={app.coverUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="data-text line-clamp-2 font-medium leading-snug text-film-100">
                          {app.name}
                        </p>
                        <p className="mt-0.5 text-[13px] text-film-500">
                          <span className="data-text inline">{app.category}</span>
                          {' · '}
                          {app.modality}
                          {bytes > 0 && (
                            <span className="tabular-nums"> · {formatBytes(bytes)}</span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-quiet shrink-0 px-3 py-1.5"
                        onClick={() => downloadApps([app])}
                        disabled={!connected || pending}
                        title={connected ? undefined : t.offline.needsConnection}
                      >
                        {pending ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Download className="h-4 w-4" aria-hidden />
                        )}
                        <span className="max-sm:sr-only">{t.offline.download}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {(lockedCount > 0 || externalCount > 0) && (
          <div className="mt-6 space-y-1.5 text-sm text-film-500">
            {lockedCount > 0 && (
              <p className="flex items-start gap-2">
                <Lock className="mt-1 h-3.5 w-3.5 shrink-0 text-caliper" aria-hidden />
                {t.offline.lockedNote(lockedCount)}
              </p>
            )}
            {externalCount > 0 && (
              <p className="flex items-start gap-2">
                <ExternalLink className="flip-rtl mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
                {t.offline.externalNote}
              </p>
            )}
          </div>
        )}

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <section className="rounded-md border border-ink-700 p-4">
            <h2 className="flex items-center gap-2 font-semibold text-film-50">
              <MonitorDown className="h-4 w-4 text-localizer" aria-hidden />
              {t.offline.installTitle}
            </h2>
            <p className="mt-1.5 text-sm text-film-400">
              {install.kind === 'installed' ? t.offline.installed : t.offline.installBody}
            </p>
            <InstallButton className="-ms-2.5 mt-2" />
          </section>
          <section className="rounded-md border border-ink-700 p-4">
            <h2 className="flex items-center gap-2 font-semibold text-film-50">
              <FileDown className="h-4 w-4 text-localizer" aria-hidden />
              {t.offline.fileTitle}
            </h2>
            <p className="mt-1.5 text-sm text-film-400">{t.offline.fileBody}</p>
          </section>
        </div>
      </main>

      {runApp && (
        <Workspace app={runApp} allowed={!!runEntry || canLaunch(runApp)} onClose={closeApp} />
      )}
    </div>
  );
}
