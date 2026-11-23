import { Lock } from 'lucide-react';
import { OfflineMark } from '@/features/offline/components/OfflineBits';
import { useT } from '@/lib/i18n';
import type { SuiteApp } from '@/types/domain';
import { coverOf } from '../lib/cover';
import { FavoriteButton, LaunchButton, TierAnnotation } from './AppBits';
import type { AppActions } from './AppTile';
import { GeneratorName } from './GeneratorName';
import { Highlight } from './Highlight';

/** Dense, sortable-at-a-glance list — the radiologist's worklist. */
export function Worklist({
  apps,
  tokens,
  actions,
}: {
  apps: SuiteApp[];
  tokens: string[];
  actions: AppActions;
}) {
  const t = useT();
  return (
    <div className="overflow-hidden rounded-md border border-ink-700">
      <table className="w-full border-collapse text-start text-sm">
        <thead className="hidden bg-ink-850 text-film-400 md:table-header-group">
          <tr>
            <th scope="col" className="px-3 py-2.5 text-start font-medium">
              {t.app.columnGenerator}
            </th>
            <th scope="col" className="hidden px-3 py-2.5 text-start font-medium lg:table-cell">
              {t.app.factRegion}
            </th>
            <th scope="col" className="px-3 py-2.5 text-start font-medium">
              {t.app.factModality}
            </th>
            <th scope="col" className="hidden px-3 py-2.5 text-start font-medium xl:table-cell">
              {t.app.factScoring}
            </th>
            <th scope="col" className="px-3 py-2.5 text-start font-medium">
              {t.app.factPlan}
            </th>
            <th scope="col" className="px-3 py-2.5">
              <span className="sr-only">{t.app.columnActions}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-700">
          {apps.map((app) => {
            const locked = !actions.canLaunch(app);
            return (
              <tr
                key={app.id}
                data-tour="tile"
                className="group bg-ink-900 transition-colors hover:bg-ink-850"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <FavoriteButton
                      active={actions.isFavorite(app)}
                      onToggle={() => actions.onToggleFavorite(app)}
                      className="-ms-1 shrink-0"
                    />
                    <img
                      src={coverOf(app)}
                      alt=""
                      loading="lazy"
                      className="window-in hidden h-10 w-16 shrink-0 rounded-sm object-cover sm:block"
                    />
                    <button
                      type="button"
                      onClick={() => actions.onOpenDetails(app)}
                      className="min-w-0 text-start"
                    >
                      <span className="data-text block font-medium leading-snug text-film-50 hover:text-localizer-300">
                        <GeneratorName name={app.name} tokens={tokens} />
                      </span>
                      <span className="block text-[13px] text-film-500 md:hidden">
                        {app.modality}
                        <span
                          className={
                            app.tier === 'pro' ? 'ms-2 font-semibold text-caliper' : 'ms-2'
                          }
                        >
                          {app.tier === 'pro' ? t.common.pro : t.common.free}
                        </span>
                        {actions.isOffline(app) && (
                          <OfflineMark className="ms-2 inline-block align-[-2px] text-film-400" />
                        )}
                      </span>
                      {app.duplicateOf && (
                        <span className="data-text block text-[13px] text-caliper-300/80">
                          {app.duplicateOf}
                        </span>
                      )}
                    </button>
                  </div>
                </td>
                <td className="hidden px-3 py-2.5 text-film-400 lg:table-cell">{app.category}</td>
                <td className="hidden px-3 py-2.5 text-film-300 md:table-cell">{app.modality}</td>
                <td className="hidden px-3 py-2.5 text-film-400 xl:table-cell">
                  {app.badge ? <Highlight text={app.badge} tokens={tokens} /> : '—'}
                </td>
                <td className="hidden px-3 py-2.5 md:table-cell">
                  <div className="flex items-center gap-1.5">
                    <TierAnnotation app={app} locked={locked} />
                    {actions.isOffline(app) && <OfflineMark className="text-film-400" />}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-end">
                  {locked ? (
                    <button
                      type="button"
                      onClick={() => actions.onOpenDetails(app)}
                      className="btn-quiet min-w-[6.5rem] whitespace-nowrap px-3 py-1.5 text-film-300"
                    >
                      <Lock className="h-3.5 w-3.5 text-caliper" aria-hidden />
                      {t.app.details}
                    </button>
                  ) : (
                    <LaunchButton
                      app={app}
                      locked={false}
                      onLaunch={() => actions.onLaunch(app)}
                      onLocked={() => actions.onOpenDetails(app)}
                      onIntent={() => actions.onIntent(app)}
                      className="min-w-[6.5rem] whitespace-nowrap px-3 py-1.5"
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
