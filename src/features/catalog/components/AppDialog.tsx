import { useState } from 'react';
import { ExternalLink, ImageIcon, Link2, Lock, Pencil, Star, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/Dialog';
import { Viewport } from '@/components/Viewport';
import { toast } from '@/lib/toast';
import { cn, copyToClipboard } from '@/lib/utils';
import type { SuiteApp } from '@/types/domain';
import { coverOf } from '../lib/cover';
import { openGeneratorTab } from '../lib/launch';
import { fetchAppHtmlForTab } from '../lib/tabLoader';
import { LaunchButton, TierAnnotation } from './AppBits';

interface AppDialogProps {
  app: SuiteApp;
  locked: boolean;
  isFavorite: boolean;
  isHero: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onLaunch: () => void;
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
  onToggleFavorite,
  onSetHero,
  onEdit,
  onDelete,
  deleting,
}: AppDialogProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const copyLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}#/?app=${encodeURIComponent(app.id)}`;
    toast.info((await copyToClipboard(link)) ? 'Link copied' : 'Copy isn’t available here');
  };

  const facts: [string, string][] = [
    ['Region', app.category],
    ['Modality', app.modality],
    ['Scoring system', app.badge ?? '—'],
    ['Runs', app.kind === 'integrated' ? 'Inside the suite' : 'On AWS Quick (opens a new tab)'],
    ['Plan', app.tier === 'pro' ? 'Pro' : 'Free'],
  ];
  if (app.status === 'Draft') facts.push(['Status', 'Draft']);

  return (
    <Dialog open onClose={onClose} title={app.name} context={app.category} size="xl">
      <div className="grid gap-6 md:grid-cols-[1.25fr_1fr]">
        <div>
          <Viewport
            src={coverOf(app)}
            alt={`${app.name} cover`}
            loading="eager"
            className="aspect-[16/10] rounded-md border border-ink-700"
            topLeft={<p className="annot">{app.modality}</p>}
            bottomLeft={app.badge ? <p className="annot">{app.badge}</p> : undefined}
            bottomRight={<TierAnnotation app={app} locked={locked} />}
          />
          {app.duplicateOf && <p className="mt-3 text-sm text-caliper-300/90">{app.duplicateOf}</p>}
          <p className="mt-3 max-w-prose leading-relaxed text-film-300">{app.description}</p>
        </div>

        <div className="flex flex-col gap-5">
          <dl className="divide-y divide-ink-700 rounded-md border border-ink-700 text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="flex gap-3 px-3 py-2">
                <dt className="w-32 shrink-0 text-film-500">{k}</dt>
                <dd className={cn('text-film-100', k === 'Plan' && v === 'Pro' && 'text-caliper')}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>

          {locked && (
            <div className="rounded-md border border-caliper/40 bg-caliper/5 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-caliper">
                <Lock className="h-4 w-4" aria-hidden />
                Pro plan required
              </p>
              <p className="mt-1 text-film-300">
                Your account is on the Free plan. Ask your suite administrator to move you to Pro to
                open this generator.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!locked && (
              <LaunchButton
                app={app}
                locked={false}
                onLaunch={onLaunch}
                onLocked={() => undefined}
                className="flex-1"
              />
            )}
            {!locked && app.kind === 'integrated' && app.htmlPath && (
              <button
                type="button"
                className="btn-quiet"
                onClick={() =>
                  openGeneratorTab(app.name, () => fetchAppHtmlForTab(app)).catch((err: unknown) =>
                    toast.error(err),
                  )
                }
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Open in new tab
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-ink-700 pt-4">
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
              {isFavorite ? 'Favorited' : 'Add to favorites'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => onSetHero(isHero ? null : app.id)}
            >
              <ImageIcon className="h-4 w-4" aria-hidden />
              {isHero ? 'Restore default cover' : 'Use as home cover'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => void copyLink()}>
              <Link2 className="h-4 w-4" aria-hidden />
              Copy link
            </button>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 border-t border-ink-700 pt-4">
              <span className="mr-auto text-sm text-film-500">Admin</span>
              <button type="button" className="btn-quiet" onClick={onEdit}>
                <Pencil className="h-4 w-4" aria-hidden />
                Edit
              </button>
              {confirmDelete ? (
                <button type="button" className="btn-danger" onClick={onDelete} disabled={deleting}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete for everyone
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-ghost text-alert"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
