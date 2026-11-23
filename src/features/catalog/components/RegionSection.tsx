import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category, SuiteApp } from '@/types/domain';
import { AppTile, type AppActions } from './AppTile';
import { SeriesThumb } from './SeriesThumb';

export function RegionSection({
  category,
  cover,
  apps,
  tokens,
  collapsed,
  onToggle,
  actions,
}: {
  category: Category;
  /** The region's series thumbnail (its first generator's cover). */
  cover: string | undefined;
  apps: SuiteApp[];
  tokens: string[];
  collapsed: boolean;
  onToggle: () => void;
  actions: AppActions;
}) {
  const panelId = `region-${category.sortOrder}`;
  return (
    <section className="defer-render border-t border-ink-700 pt-4">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={panelId}
          className="group flex w-full items-start gap-3 text-start sm:gap-4"
        >
          <SeriesThumb
            src={cover}
            icon={category.icon}
            className="mt-1 h-10 w-10 text-xl sm:h-12 sm:w-12"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2.5">
              <span className="type-condensed text-2xl font-semibold leading-tight text-film-50 group-hover:text-localizer-300">
                {category.name}
              </span>
              <span className="text-sm tabular-nums text-film-500">{apps.length}</span>
            </span>
            {category.subtitle && (
              <span className="data-text mt-0.5 block text-sm font-normal text-film-400">
                {category.subtitle}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'mt-1.5 h-5 w-5 shrink-0 text-film-500 transition-transform',
              collapsed && '-rotate-90 rtl:rotate-90',
            )}
            aria-hidden
          />
        </button>
      </h2>
      {!collapsed && (
        <div
          id={panelId}
          className="mt-4 grid grid-cols-1 gap-x-5 gap-y-5 pb-6 sm:mt-5 sm:grid-cols-2 sm:gap-y-8 xl:grid-cols-3"
        >
          {apps.map((app) => (
            <AppTile key={app.id} app={app} tokens={tokens} showRegion={false} actions={actions} />
          ))}
        </div>
      )}
    </section>
  );
}
