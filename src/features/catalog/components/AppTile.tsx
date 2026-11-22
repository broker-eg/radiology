import { Viewport } from '@/components/Viewport';
import type { SuiteApp } from '@/types/domain';
import { coverOf } from '../lib/cover';
import { FavoriteButton, LaunchButton, TierAnnotation } from './AppBits';
import { Highlight } from './Highlight';

export interface AppActions {
  isFavorite: (app: SuiteApp) => boolean;
  canLaunch: (app: SuiteApp) => boolean;
  onToggleFavorite: (app: SuiteApp) => void;
  onOpenDetails: (app: SuiteApp) => void;
  onLaunch: (app: SuiteApp) => void;
}

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
  const locked = !actions.canLaunch(app);
  return (
    <article className="group flex flex-col">
      <div className="relative">
        <button
          type="button"
          onClick={() => actions.onOpenDetails(app)}
          className="block w-full rounded-md text-left"
          aria-label={`Details for ${app.name}`}
        >
          <Viewport
            src={coverOf(app)}
            alt=""
            className="aspect-[16/10] rounded-md border border-ink-700 transition-colors group-hover:border-localizer/50"
            imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
            topLeft={
              <div className="annot">
                <p>{app.modality}</p>
                {app.status === 'Draft' && <p className="text-caliper-300">Draft</p>}
              </div>
            }
            bottomLeft={app.badge ? <p className="annot line-clamp-2">{app.badge}</p> : undefined}
            bottomRight={<TierAnnotation app={app} locked={locked} />}
          />
        </button>
        <FavoriteButton
          active={actions.isFavorite(app)}
          onToggle={() => actions.onToggleFavorite(app)}
          className="absolute right-1.5 top-1.5"
        />
      </div>

      <div className="mt-3 flex-1">
        {showRegion && <p className="text-[13px] text-film-500">{app.category}</p>}
        <h3 className="text-base font-semibold leading-snug text-film-50">
          <Highlight text={app.name} tokens={tokens} />
        </h3>
        {app.duplicateOf && (
          <p className="mt-0.5 text-[13px] text-caliper-300/80">{app.duplicateOf}</p>
        )}
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-film-400">
          {app.description}
        </p>
      </div>

      <div className="mt-3 flex gap-2">
        <LaunchButton
          app={app}
          locked={locked}
          onLaunch={() => actions.onLaunch(app)}
          onLocked={() => actions.onOpenDetails(app)}
          className="flex-1"
        />
        <button type="button" onClick={() => actions.onOpenDetails(app)} className="btn-ghost">
          Details
        </button>
      </div>
    </article>
  );
}
