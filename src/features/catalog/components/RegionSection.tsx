import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category, SuiteApp } from '@/types/domain';
import { AppTile, type AppActions } from './AppTile';

export function RegionSection({
  category,
  apps,
  tokens,
  collapsed,
  onToggle,
  actions,
}: {
  category: Category;
  apps: SuiteApp[];
  tokens: string[];
  collapsed: boolean;
  onToggle: () => void;
  actions: AppActions;
}) {
  const panelId = `region-${category.sortOrder}`;
  return (
    <section className="border-t border-ink-700 pt-4">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={panelId}
          className="group flex w-full items-start gap-3 text-left"
        >
          <span className="mt-0.5 text-xl leading-none" aria-hidden>
            {category.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2.5">
              <span className="type-condensed text-2xl font-semibold leading-tight text-film-50 group-hover:text-localizer-300">
                {category.name}
              </span>
              <span className="text-sm tabular-nums text-film-500">{apps.length}</span>
            </span>
            {category.subtitle && (
              <span className="mt-0.5 block text-sm font-normal text-film-400">
                {category.subtitle}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'mt-1.5 h-5 w-5 shrink-0 text-film-500 transition-transform',
              collapsed && '-rotate-90',
            )}
            aria-hidden
          />
        </button>
      </h2>
      {!collapsed && (
        <div
          id={panelId}
          className="mt-5 grid grid-cols-1 gap-x-5 gap-y-8 pb-6 sm:grid-cols-2 xl:grid-cols-3"
        >
          {apps.map((app) => (
            <AppTile key={app.id} app={app} tokens={tokens} showRegion={false} actions={actions} />
          ))}
        </div>
      )}
    </section>
  );
}
