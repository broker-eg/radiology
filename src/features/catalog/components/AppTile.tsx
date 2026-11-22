import { Viewport } from '@/components/Viewport';
import { OfflineMark } from '@/features/offline/components/OfflineBits';
import { useT } from '@/lib/i18n';
import type { SuiteApp } from '@/types/domain';
import { coverOf } from '../lib/cover';
import { FavoriteButton, LaunchButton, TierAnnotation } from './AppBits';
import { Highlight } from './Highlight';

export interface AppActions {
  isFavorite: (app: SuiteApp) => boolean;
  canLaunch: (app: SuiteApp) => boolean;
  /** Saved on this device: opens with no connection. */
  isOffline: (app: SuiteApp) => boolean;
  onToggleFavorite: (app: SuiteApp) => void;
  onOpenDetails: (app: SuiteApp) => void;
  onLaunch: (app: SuiteApp) => void;
  /** Likely launch (hover/focus/touch on Launch): warm the generator's HTML. */
  onIntent: (app: SuiteApp) => void;
}

/**
 * A generator. Phones: a compact row — thumbnail, name, scoring system, actions — so a region
 * fits on a screen. From `sm` up: the full viewport card with DICOM corner annotations.
 */
export function AppTile({
  app,
  tokens,
  showRegion,
  actions,
}: {
  app: SuiteApp;
  tokens: string[];
  showRegion: boolean;
  actions: AppActions;
}) {
  const t = useT();
  const locked = !actions.canLaunch(app);
  const favorite = actions.isFavorite(app);
  const toggle = () => actions.onToggleFavorite(app);

  return (
    <article
      data-tour="tile"
      className="group grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3.5 sm:flex sm:flex-col"
    >
      <div className="relative row-span-2 sm:row-span-1">
        <button
          type="button"
          onClick={() => actions.onOpenDetails(app)}
          className="block h-full w-full rounded-md text-start"
          aria-label={t.app.detailsFor(app.name)}
        >
          <Viewport
            src={coverOf(app)}
            alt=""
            className="h-full min-h-[5.5rem] rounded-md border border-ink-700 transition-colors group-hover:border-localizer/50 sm:aspect-[16/10] sm:h-auto"
            imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
            topLeft={
              <div className="annot max-sm:hidden">
                <p>{app.modality}</p>
                {app.status === 'Draft' && <p className="text-caliper-300">{t.app.draft}</p>}
              </div>
            }
            bottomLeft={
              app.badge ? (
                <p className="annot data-text line-clamp-2 max-sm:hidden">{app.badge}</p>
              ) : undefined
            }
            bottomRight={
              <div className="flex items-center gap-1.5">
                {actions.isOffline(app) && (
                  <OfflineMark className="text-film-100 drop-shadow-[0_0_2px_rgb(0_0_0/0.9)]" />
                )}
                <TierAnnotation app={app} locked={locked} />
              </div>
            }
          />
        </button>
        <FavoriteButton
          active={favorite}
          onToggle={toggle}
          className="scheme-dark absolute end-1.5 top-1.5 max-sm:hidden"
        />
      </div>

      <div className="min-w-0 sm:mt-3 sm:flex-1">
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-film-500 sm:hidden">
              {app.modality}
              {app.status === 'Draft' && (
                <span className="ms-2 text-caliper-300">{t.app.draft}</span>
              )}
            </p>
            {showRegion && (
              <p className="data-text truncate text-[13px] text-film-500 max-sm:hidden">
                {app.category}
              </p>
            )}
            <h3 className="data-text text-[15px] font-semibold leading-snug text-film-50 max-sm:line-clamp-2 sm:text-base">
              <Highlight text={app.name} tokens={tokens} />
            </h3>
          </div>
          <FavoriteButton
            active={favorite}
            onToggle={toggle}
            className="-me-2.5 -mt-1.5 shrink-0 text-film-400 sm:hidden"
          />
        </div>
        {app.duplicateOf && (
          <p className="data-text mt-0.5 truncate text-[13px] text-caliper-300/80 sm:whitespace-normal">
            {app.duplicateOf}
          </p>
        )}
        {app.badge && (
          <p className="data-text mt-0.5 truncate text-[13px] text-film-400 sm:hidden">
            <Highlight text={app.badge} tokens={tokens} />
          </p>
        )}
        <p className="data-text mt-1.5 line-clamp-2 text-sm leading-relaxed text-film-400 max-sm:hidden">
          {app.description}
        </p>
      </div>

      <div className="col-start-2 mt-2.5 flex gap-2 sm:mt-3">
        <LaunchButton
          app={app}
          locked={locked}
          onLaunch={() => actions.onLaunch(app)}
          onLocked={() => actions.onOpenDetails(app)}
          onIntent={() => actions.onIntent(app)}
          className="flex-1 max-sm:py-1.5"
        />
        <button
          type="button"
          onClick={() => actions.onOpenDetails(app)}
          className="btn-ghost max-sm:py-1.5"
        >
          {t.app.details}
        </button>
      </div>
    </article>
  );
}
