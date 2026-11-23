import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/domain';
import { MODALITIES, type Filters, type ModalityFilter, type SourceFilter } from '../lib/search';
import { SeriesThumb } from './SeriesThumb';

type Patch = (patch: Partial<Filters>) => void;

/** The desktop series list: one row per body region, with its series thumbnail and count. */
export function RegionList({
  categories,
  covers,
  counts,
  total,
  filters,
  onChange,
}: {
  categories: Category[];
  /** Region name → its first generator's cover. */
  covers: Map<string, string>;
  counts: Map<string, number>;
  total: number;
  filters: Filters;
  onChange: Patch;
}) {
  const t = useT();
  const item = (label: string, category: Category | null, count: number) => {
    const value = category?.name ?? null;
    const active = filters.region === value;
    return (
      <li key={label}>
        <button
          type="button"
          onClick={() => onChange({ region: value })}
          aria-current={active ? 'true' : undefined}
          className={cn(
            'group flex w-full items-center gap-2.5 border-s-2 py-1.5 pe-2 ps-3 text-start text-sm transition-colors',
            active
              ? 'border-localizer bg-localizer/5 text-film-50'
              : 'border-transparent text-film-400 hover:border-ink-600 hover:text-film-100',
          )}
        >
          {category && (
            <SeriesThumb
              src={covers.get(category.name)}
              icon={category.icon}
              active={active}
              className="h-6 w-6 text-base"
            />
          )}
          <span className="flex-1 truncate">{label}</span>
          <span className={cn('tabular-nums', count === 0 ? 'text-film-500/60' : 'text-film-500')}>
            {count}
          </span>
        </button>
      </li>
    );
  };
  return (
    <ul className="space-y-0.5">
      {item(t.suite.allRegions, null, total)}
      {categories.map((c) => item(c.name, c, counts.get(c.name) ?? 0))}
    </ul>
  );
}

export function RefineControls({
  filters,
  onChange,
  showUnlockedToggle,
}: {
  filters: Filters;
  onChange: Patch;
  showUnlockedToggle: boolean;
}) {
  const t = useT();
  const sources: { value: SourceFilter; label: string }[] = [
    { value: 'all', label: t.filters.sourceAll },
    { value: 'integrated', label: t.filters.sourceIntegrated },
    { value: 'external', label: t.filters.sourceExternal },
  ];
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-film-300">{t.filters.modality}</legend>
        <div className="flex flex-wrap gap-1.5">
          {(['All', ...MODALITIES] as ModalityFilter[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={filters.modality === m}
              onClick={() => onChange({ modality: m })}
              className={cn('chip', filters.modality === m && 'chip-active')}
            >
              {m === 'All' ? t.suite.all : m}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-film-300">{t.filters.whereRuns}</legend>
        <div className="segmented">
          {sources.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={filters.source === s.value}
              onClick={() => onChange({ source: s.value })}
              className="segment"
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2.5">
        <Toggle
          label={t.filters.favoritesOnly}
          checked={filters.favoritesOnly}
          onChange={(v) => onChange({ favoritesOnly: v })}
        />
        {showUnlockedToggle && (
          <Toggle
            label={t.filters.unlockedOnly}
            checked={filters.unlockedOnly}
            onChange={(v) => onChange({ unlockedOnly: v })}
          />
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-film-300 hover:text-film-100 touch:min-h-9">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-ink-600 bg-ink-950 accent-localizer touch:h-5 touch:w-5"
      />
      {label}
    </label>
  );
}
