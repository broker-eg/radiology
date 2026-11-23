import { useEffect, useRef, useState } from 'react';
import { ExternalLink, ImageIcon, Link2, Lock, Pencil, Star, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/Dialog';
import { Viewport } from '@/components/Viewport';
import { OfflineToggle } from '@/features/offline/components/OfflineBits';
import { useT } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { cn, copyToClipboard } from '@/lib/utils';
import type { SuiteApp } from '@/types/domain';
import { coverOf } from '../lib/cover';
import { openGeneratorTab } from '../lib/launch';
import { fetchAppHtmlForTab } from '../lib/tabLoader';
import { LaunchButton, TierAnnotation } from './AppBits';
import { GeneratorName } from './GeneratorName';

interface AppDialogProps {
  app: SuiteApp;
  locked: boolean;
  isFavorite: boolean;
  isHero: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onLaunch: () => void;
  /** Called once on open: the person is likely to launch, so start loading it. */
  onIntent: () => void;
  onToggleFavorite: () => void;
  onSetHero: (appId: string | null) => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

export function AppDialog({
  app,
  locked,
  isFavorite,
  isHero,
  isAdmin,
  onClose,
  onLaunch,
  onIntent,
  onToggleFavorite,
  onSetHero,
  onEdit,
  onDelete,
  deleting,
}: AppDialogProps) {
  const t = useT();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const onIntentRef = useRef(onIntent);
  onIntentRef.current = onIntent;
  useEffect(() => {
    if (!locked) onIntentRef.current();
  }, [app.id, locked]);

  const copyLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}#/?app=${encodeURIComponent(app.id)}`;
    toast.info((await copyToClipboard(link)) ? t.app.linkCopied : t.app.copyUnavailable);
  };

  const isPro = app.tier === 'pro';
  const facts: [string, string, boolean?][] = [
    [t.app.factRegion, app.category],
    [t.app.factModality, app.modality],
    [t.app.factScoring, app.badge ?? '—'],
    [t.app.factRuns, app.kind === 'integrated' ? t.app.runsInside : t.app.runsAws],
    [t.app.factPlan, isPro ? t.common.pro : t.common.free, isPro],
  ];
  if (app.status === 'Draft') facts.push([t.app.factStatus, t.app.draft]);

  const openTab = () =>
    openGeneratorTab(app.name, () => fetchAppHtmlForTab(app)).catch((err: unknown) =>
      toast.error(err),
    );
  const primary = !locked && (
    <div className="flex gap-2">
      <LaunchButton
        app={app}
        locked={false}
        onLaunch={onLaunch}
        onLocked={() => undefined}
        className="flex-1 touch:min-h-11"
      />
      {app.kind === 'integrated' && app.htmlPath && (
        <button type="button" className="btn-quiet touch:min-h-11" onClick={openTab}>
          <ExternalLink className="flip-rtl h-4 w-4" aria-hidden />
          {t.app.openNewTab}
        </button>
      )}
    </div>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={
        <span className="data-text block">
          <GeneratorName name={app.name} />
        </span>
      }
      context={app.category}
      size="xl"
      footer={primary ? <div className="sm:hidden">{primary}</div> : undefined}
    >
      <div className="grid gap-6 md:grid-cols-[1.25fr_1fr]">
        <div>
          <Viewport
            src={coverOf(app)}
            alt={t.app.coverAlt(app.name)}
            loading="eager"
            className="aspect-[16/10] rounded-md border border-ink-700"
            topLeft={<p className="annot">{app.modality}</p>}
            bottomLeft={app.badge ? <p className="annot">{app.badge}</p> : undefined}
            bottomRight={<TierAnnotation app={app} locked={locked} />}
          />
          {app.duplicateOf && (
            <p className="data-text mt-3 text-sm text-caliper-300/90">{app.duplicateOf}</p>
          )}
          <p className="data-text mt-3 max-w-prose leading-relaxed text-film-300">
            {app.description}
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <dl className="divide-y divide-ink-700 rounded-md border border-ink-700 text-sm">
            {facts.map(([k, v, gold]) => (
              <div key={k} className="flex gap-3 px-3 py-2">
                <dt className="w-32 shrink-0 text-film-500">{k}</dt>
                <dd className={cn('data-text min-w-0 text-film-100', gold && 'text-caliper')}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>

          {locked && (
            <div className="rounded-md border border-caliper/40 bg-caliper/5 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-caliper">
                <Lock className="h-4 w-4" aria-hidden />
                {t.app.proRequired}
              </p>
              <p className="mt-1 text-film-300">{t.app.proRequiredBody}</p>
            </div>
          )}

          {primary && <div className="max-sm:hidden">{primary}</div>}

          <div className="flex flex-wrap gap-1.5 border-t border-ink-700 pt-4">
            {!locked && <OfflineToggle app={app} />}
            <button
              type="button"
              className="btn-ghost"
              onClick={onToggleFavorite}
              aria-pressed={isFavorite}
            >
              <Star
                className={cn('h-4 w-4', isFavorite && 'fill-caliper text-caliper')}
                aria-hidden
              />
              {isFavorite ? t.app.favorited : t.app.addFavorite}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => onSetHero(isHero ? null : app.id)}
            >
              <ImageIcon className="h-4 w-4" aria-hidden />
              {isHero ? t.app.restoreCover : t.app.useAsCover}
            </button>
            <button type="button" className="btn-ghost" onClick={() => void copyLink()}>
              <Link2 className="h-4 w-4" aria-hidden />
              {t.app.copyLink}
            </button>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 border-t border-ink-700 pt-4">
              <span className="me-auto text-sm text-film-500">{t.common.admin}</span>
              <button type="button" className="btn-quiet" onClick={onEdit}>
                <Pencil className="h-4 w-4" aria-hidden />
                {t.app.edit}
              </button>
              {confirmDelete ? (
                <button type="button" className="btn-danger" onClick={onDelete} disabled={deleting}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {t.app.deleteForEveryone}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-ghost text-alert"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {t.app.delete}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
