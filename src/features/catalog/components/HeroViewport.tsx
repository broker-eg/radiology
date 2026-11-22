import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { Signature } from '@/components/Signature';
import { Viewport } from '@/components/Viewport';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { QUICK_FINDS } from '../lib/search';

interface HeroViewportProps {
  image: string;
  query: string;
  onQuery: (q: string) => void;
  total: number;
  regions: number;
  showing: number;
  favorites: number;
  unlocked: number;
  planLabel: string;
  isPro: boolean;
}

/**
 * The hero is a reading-room viewport: the search sits where the image would be read,
 * and the suite's live numbers sit in the corners as DICOM-style annotations.
 */
export const HeroViewport = forwardRef<HTMLInputElement, HeroViewportProps>(function HeroViewport(
  { image, query, onQuery, total, regions, showing, favorites, unlocked, planLabel, isPro },
  inputRef,
) {
  const t = useT();
  const active = query.trim().toLowerCase();
  return (
    <Viewport
      src={image}
      alt=""
      loading="eager"
      className="rounded-lg border border-ink-700"
      imgClassName="animate-windowing [filter:brightness(0.5)_contrast(1.05)_grayscale(0.35)]"
    >
      <div className="flex flex-col justify-between gap-5 p-4 sm:min-h-[440px] sm:gap-6 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="type-condensed text-[1.875rem] font-semibold leading-none text-film-50 [text-shadow:0_2px_12px_rgb(0_0_0/0.6)] sm:text-5xl">
              {t.brand.name}
            </h1>
            <Signature className="mt-2 text-base [text-shadow:0_1px_6px_rgb(0_0_0/0.8)] sm:text-lg" />
          </div>
          <div className="annot hidden text-end sm:block">
            <p>{t.suite.annotGenerators(total)}</p>
            <p className="text-film-300">{t.suite.annotRegions(regions)}</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-2xl">
          <label htmlFor="suite-search" className="sr-only">
            {t.suite.searchLabel}
          </label>
          <div className="relative" data-tour="search">
            <Search
              className="pointer-events-none absolute start-3.5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-localizer"
              aria-hidden
            />
            <input
              ref={inputRef}
              id="suite-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query) {
                  e.stopPropagation();
                  onQuery('');
                }
              }}
              placeholder={t.suite.searchPlaceholder}
              enterKeyHint="search"
              className="w-full rounded-md border border-ink-600 bg-ink-950/85 py-3.5 pe-10 ps-11 text-base text-film-50 shadow-2xl shadow-black/50 backdrop-blur focus:border-localizer focus:outline-none sm:pe-20 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQuery('')}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-film-400 hover:text-film-50 touch:p-2.5"
                aria-label={t.suite.clearSearch}
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded border border-ink-600 px-1.5 text-xs text-film-500 sm:block">
                /
              </kbd>
            )}
          </div>
          {/* One swipeable row on phones, wrapped on larger screens. */}
          <div
            className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            aria-label={t.suite.quickFinds}
          >
            {QUICK_FINDS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onQuery(active === q.toLowerCase() ? '' : q)}
                aria-pressed={active === q.toLowerCase()}
                className={cn(
                  'chip shrink-0 bg-ink-950/60 backdrop-blur',
                  active === q.toLowerCase() && 'chip-active',
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="annot">
            <p className={cn('font-semibold', isPro ? 'text-caliper' : 'text-film-50')}>
              {planLabel}
            </p>
            <p className="text-film-300">
              {unlocked === total
                ? t.suite.allUnlocked(total)
                : t.suite.someUnlocked(unlocked, total)}
            </p>
          </div>
          <div className="annot text-end">
            <p>{t.suite.showing(showing)}</p>
            <p className="text-film-300">{t.suite.favorites(favorites)}</p>
          </div>
        </div>
      </div>
    </Viewport>
  );
});
