import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, Plus, Rows3, Search, SlidersHorizontal, X } from 'lucide-react';
import defaultHero from '@/assets/branding/hero.webp';
import { Dialog } from '@/components/Dialog';
import { SiteHeader } from '@/components/SiteHeader';
import { useProfile, useSetHeroApp } from '@/features/auth/hooks/useProfile';
import { useT } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { SuiteApp } from '@/types/domain';
import { AppDialog } from '../components/AppDialog';
import { AppTile, type AppActions } from '../components/AppTile';
import { RefineControls, RegionList } from '../components/FilterControls';
import { HeroViewport } from '../components/HeroViewport';
import { RegionSection } from '../components/RegionSection';
import { Workspace } from '../components/Workspace';
import { Worklist } from '../components/Worklist';
import {
  useApps,
  useCategories,
  useDeleteApp,
  useFavorites,
  usePrefetchAppHtml,
  useToggleFavorite,
} from '../hooks/useCatalog';
import { coverOf } from '../lib/cover';
import {
  countByRegion,
  DEFAULT_FILTERS,
  DUPLICATES_REGION,
  filterApps,
  tokenize,
  type Filters,
  type SortKey,
  type ViewMode,
} from '../lib/search';

// Admin-only: kept out of everyone else's first load.
const AppForm = lazy(() => import('../components/AppForm').then((m) => ({ default: m.AppForm })));

const VIEW_KEY = 'radiology:view';
const VIEW_ICONS: Record<ViewMode, typeof LayoutGrid> = {
  regions: Rows3,
  grid: LayoutGrid,
  worklist: List,
};

function readView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === 'grid' || v === 'worklist' ? v : 'regions';
  } catch {
    return 'regions';
  }
}

export function SuitePage() {
  const t = useT();
  const { profile, isAdmin, hasPro } = useProfile();
  const categoriesQ = useCategories();
  const appsQ = useApps();
  const favoritesQ = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const setHero = useSetHeroApp();
  const deleteApp = useDeleteApp();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [view, setView] = useState<ViewMode>(readView);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set([DUPLICATES_REGION]));
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState<{ existing: SuiteApp | null } | null>(null);
  const [heroSearchVisible, setHeroSearchVisible] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const headerSearchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Details (?app=) and the running workspace (?run=) live in the URL: links are
  // shareable and the phone's back button closes them.
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const apps = useMemo(() => appsQ.data ?? [], [appsQ.data]);
  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const favorites = useMemo(() => favoritesQ.data ?? new Set<string>(), [favoritesQ.data]);
  const byId = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);

  const canLaunch = useCallback((app: SuiteApp) => hasPro || app.tier === 'free', [hasPro]);
  const prefetch = usePrefetchAppHtml(canLaunch);
  const patch = useCallback((p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p })), []);
  const ctx = useMemo(() => ({ favorites, canLaunch }), [favorites, canLaunch]);
  const filtered = useMemo(() => filterApps(apps, filters, ctx), [apps, filters, ctx]);
  const regionCounts = useMemo(() => countByRegion(apps, filters, ctx), [apps, filters, ctx]);
  const tokens = useMemo(() => tokenize(filters.query), [filters.query]);
  const modalities = useMemo(() => [...new Set(apps.map((a) => a.modality))].sort(), [apps]);
  const unlocked = useMemo(() => apps.filter(canLaunch).length, [apps, canLaunch]);
  const countAllRegions = [...regionCounts.values()].reduce((a, b) => a + b, 0);

  const detailApp = byId.get(params.get('app') ?? '') ?? null;
  const runApp = byId.get(params.get('run') ?? '') ?? null;
  const heroApp = profile?.heroAppId ? byId.get(profile.heroAppId) : undefined;

  const pushParam = (key: 'app' | 'run', id: string) => {
    const next = new URLSearchParams(params);
    next.set(key, id);
    setParams(next);
  };
  const closeParam = (key: 'app' | 'run') => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      const next = new URLSearchParams(params);
      next.delete(key);
      setParams(next, { replace: true });
    }
  };

  const actions: AppActions = {
    isFavorite: (app) => favorites.has(app.id),
    canLaunch,
    onToggleFavorite: (app) =>
      toggleFavorite.mutate({ appId: app.id, favorite: !favorites.has(app.id) }),
    onOpenDetails: (app) => pushParam('app', app.id),
    onLaunch: (app) => pushParam('run', app.id),
    onIntent: prefetch,
  };

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* per-device preference only */
    }
  }, [view]);

  // Once the hero's search scrolls under the header, the header grows its own search field.
  useEffect(() => {
    const el = searchRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => setHeroSearchVisible(entry?.isIntersecting ?? true),
      { rootMargin: '-64px 0px 0px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // "/" jumps to whichever search is on screen, as in the legacy suite.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement;
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        (heroSearchVisible ? searchRef : headerSearchRef).current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [heroSearchVisible]);

  const activeRefinements =
    Number(filters.modality !== 'All') +
    Number(filters.source !== 'all') +
    Number(filters.favoritesOnly) +
    Number(filters.unlockedOnly);
  const isFiltered = activeRefinements > 0 || !!filters.region || tokens.length > 0;

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCollapsed(new Set([DUPLICATES_REGION]));
  };

  const toggleRegion = (name: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  // Typing in the header search while deep in the list: bring the top of the results up.
  const queryFromHeader = (query: string) => {
    patch({ query });
    const top = resultsRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) window.scrollBy({ top: top - 72 });
  };

  const planLabel = isAdmin
    ? t.suite.planAdmin
    : profile?.plan === 'pro'
      ? t.suite.planPro
      : t.suite.planFree;
  const views: { value: ViewMode; label: string }[] = [
    { value: 'regions', label: t.suite.viewRegions },
    { value: 'grid', label: t.suite.viewGrid },
    { value: 'worklist', label: t.suite.viewWorklist },
  ];

  const sortSelect = (id: string, className?: string) => (
    <select
      id={id}
      value={filters.sort}
      onChange={(e) => patch({ sort: e.target.value as SortKey })}
      className={cn(
        'rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 text-sm text-film-100 focus:border-localizer focus:outline-none',
        className,
      )}
      disabled={tokens.length > 0}
      title={tokens.length > 0 ? t.suite.sortedByRelevance : undefined}
    >
      <option value="recommended">{t.suite.sortRecommended}</option>
      <option value="az">{t.suite.sortAz}</option>
      <option value="za">{t.suite.sortZa}</option>
      <option value="integrated">{t.suite.sortIntegrated}</option>
    </select>
  );

  const headerSearch = (
    <div className="relative">
      <Search
        className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-localizer"
        aria-hidden
      />
      <input
        ref={headerSearchRef}
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        tabIndex={heroSearchVisible ? -1 : 0}
        value={filters.query}
        onChange={(e) => queryFromHeader(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && filters.query) {
            e.stopPropagation();
            patch({ query: '' });
          }
        }}
        placeholder={t.suite.searchLabel}
        aria-label={t.suite.searchLabel}
        className="w-full rounded-md border border-ink-600 bg-ink-950 py-1.5 pe-9 ps-9 text-base text-film-50 focus:border-localizer focus:outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {filters.query && (
        <button
          type="button"
          onClick={() => patch({ query: '' })}
          className="absolute end-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-film-400 hover:text-film-50"
          aria-label={t.suite.clearSearch}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <SiteHeader search={headerSearch} showSearch={!heroSearchVisible} />

      <main className="mx-auto max-w-[1440px] px-4 pb-[max(4rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="pt-4 sm:pt-6">
          <HeroViewport
            ref={searchRef}
            image={heroApp ? coverOf(heroApp) : defaultHero}
            query={filters.query}
            onQuery={(query) => patch({ query })}
            total={apps.length}
            regions={categories.length}
            showing={filtered.length}
            favorites={favorites.size}
            unlocked={unlocked}
            planLabel={planLabel}
            isPro={hasPro}
          />
        </div>

        <div className="mt-6 sm:mt-8 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10">
          {/* Desktop: a PACS-style series list of body regions + refinements. */}
          <aside className="hidden lg:block">
            <div
              className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-8 overflow-y-auto pb-6 pe-1"
              data-tour="browse"
            >
              <section aria-labelledby="regions-heading">
                <h2 id="regions-heading" className="mb-2 text-sm font-medium text-film-300">
                  {t.suite.regionsHeading}
                </h2>
                <RegionList
                  categories={categories}
                  counts={regionCounts}
                  total={countAllRegions}
                  filters={filters}
                  onChange={patch}
                />
              </section>
              <RefineControls filters={filters} onChange={patch} showUnlockedToggle={!hasPro} />
              {isFiltered && (
                <button type="button" className="btn-ghost -ms-3" onClick={resetFilters}>
                  {t.suite.clearAll}
                </button>
              )}
            </div>
          </aside>

          <div className="min-w-0" ref={resultsRef}>
            <div data-tour="browse">
              {/* Phones/tablets: regions scroll sideways; refinements open in a sheet. */}
              <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => patch({ region: null })}
                  className={cn('chip shrink-0', !filters.region && 'chip-active')}
                >
                  {t.suite.all}
                  <span className="ms-1.5 tabular-nums text-film-500">{countAllRegions}</span>
                </button>
                {categories.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => patch({ region: filters.region === c.name ? null : c.name })}
                    className={cn('chip shrink-0', filters.region === c.name && 'chip-active')}
                  >
                    <span className="me-1.5" aria-hidden>
                      {c.icon}
                    </span>
                    {c.name}
                    <span className="ms-1.5 tabular-nums text-film-500">
                      {regionCounts.get(c.name) ?? 0}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-ink-700 pb-3 sm:mb-6">
                <p className="me-auto text-sm text-film-400" aria-live="polite">
                  <span className="font-semibold tabular-nums text-film-50">
                    {t.suite.count(filtered.length)}
                  </span>
                  {filters.region && t.suite.inRegion(filters.region)}
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="ms-2 text-localizer hover:underline"
                    >
                      {t.suite.clearFilters}
                    </button>
                  )}
                </p>
                <button
                  type="button"
                  className={cn(
                    'btn-quiet px-2.5 lg:hidden',
                    activeRefinements > 0 && 'border-localizer/60 text-localizer-300',
                  )}
                  onClick={() => setShowFilters(true)}
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  {t.suite.filters}
                  {activeRefinements > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-localizer px-1 text-[12px] font-semibold tabular-nums text-ink-950">
                      {activeRefinements}
                    </span>
                  )}
                </button>
                <label className="sr-only" htmlFor="sort">
                  {t.suite.sort}
                </label>
                {sortSelect('sort', 'hidden lg:block')}
                <div className="segmented" role="group" aria-label={t.suite.view}>
                  {views.map(({ value, label }) => {
                    const Icon = VIEW_ICONS[value];
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={view === value}
                        onClick={() => setView(value)}
                        title={label}
                        className="segment px-2 touch:px-2.5"
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        <span className="hidden xl:inline">{label}</span>
                        <span className="sr-only xl:hidden">{label}</span>
                      </button>
                    );
                  })}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    data-tour="add"
                    className="btn-primary px-3"
                    onClick={() => setForm({ existing: null })}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">{t.suite.addGenerator}</span>
                    <span className="sr-only sm:hidden">{t.suite.addGenerator}</span>
                  </button>
                )}
              </div>
            </div>

            {(appsQ.isLoading || categoriesQ.isLoading) && !apps.length ? (
              <div
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                aria-busy="true"
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="grid animate-pulse grid-cols-[6.5rem_1fr] gap-3.5 sm:block"
                  >
                    <div className="h-[5.5rem] rounded-md bg-ink-800 sm:aspect-[16/10] sm:h-auto" />
                    <div>
                      <div className="h-4 w-3/4 rounded bg-ink-800 sm:mt-3" />
                      <div className="mt-2 h-3 w-full rounded bg-ink-850" />
                    </div>
                  </div>
                ))}
              </div>
            ) : appsQ.isError && !apps.length ? (
              <div className="rounded-md border border-alert/40 p-6 text-center">
                <p className="text-film-100">{t.suite.catalogError}</p>
                <button
                  type="button"
                  className="btn-quiet mt-3"
                  onClick={() => void appsQ.refetch()}
                >
                  {t.common.tryAgain}
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-md border border-dashed border-ink-600 px-6 py-14 text-center">
                <p className="text-lg font-semibold text-film-50">{t.suite.emptyTitle}</p>
                <p className="mt-1 text-sm text-film-400">{t.suite.emptyHint}</p>
                <button type="button" className="btn-primary mt-5" onClick={resetFilters}>
                  {t.suite.showAll}
                </button>
              </div>
            ) : view === 'worklist' ? (
              <Worklist apps={filtered} tokens={tokens} actions={actions} />
            ) : view === 'grid' ? (
              <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2 sm:gap-y-8 xl:grid-cols-3">
                {filtered.map((app) => (
                  <AppTile key={app.id} app={app} tokens={tokens} showRegion actions={actions} />
                ))}
              </div>
            ) : (
              <div className="space-y-6 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
                {categories.map((category) => {
                  const regionApps = filtered.filter((a) => a.category === category.name);
                  if (!regionApps.length) return null;
                  const forceOpen = tokens.length > 0 || filters.region === category.name;
                  return (
                    <RegionSection
                      key={category.name}
                      category={category}
                      apps={regionApps}
                      tokens={tokens}
                      collapsed={!forceOpen && collapsed.has(category.name)}
                      onToggle={() => toggleRegion(category.name)}
                      actions={actions}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-ink-700 px-4 py-6 text-center text-sm text-film-500">
        {t.brand.footer}{' '}
        <span className="font-serif italic text-caliper/80">
          <span className="rtl:font-sans rtl:not-italic">{t.brand.footerEditedBy}</span>
          <span dir="ltr">Dr. Yasser Shalaby, MD</span>
        </span>
      </footer>

      {/* Phones/tablets: refinements as a bottom sheet, with the result count on the button. */}
      <Dialog
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title={t.suite.filters}
        size="md"
        compact
        footer={
          <div className="flex items-center gap-2">
            {isFiltered && (
              <button type="button" className="btn-ghost -ms-3" onClick={resetFilters}>
                {t.suite.clearAll}
              </button>
            )}
            <button
              type="button"
              className="btn-primary ms-auto min-w-[55%] touch:min-h-11"
              onClick={() => setShowFilters(false)}
            >
              {t.suite.showResults(filtered.length)}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <RefineControls filters={filters} onChange={patch} showUnlockedToggle={!hasPro} />
          <div>
            <label htmlFor="sort-sheet" className="mb-2 block text-sm font-medium text-film-300">
              {t.suite.sort}
            </label>
            {sortSelect('sort-sheet', 'field')}
          </div>
        </div>
      </Dialog>

      {detailApp && (
        <AppDialog
          app={detailApp}
          locked={!canLaunch(detailApp)}
          isFavorite={favorites.has(detailApp.id)}
          isHero={profile?.heroAppId === detailApp.id}
          isAdmin={isAdmin}
          onClose={() => closeParam('app')}
          onLaunch={() => pushParam('run', detailApp.id)}
          onIntent={() => prefetch(detailApp)}
          onToggleFavorite={() => actions.onToggleFavorite(detailApp)}
          onSetHero={(id) =>
            setHero.mutate(id, {
              onSuccess: () => toast.info(id ? t.toast.coverUpdated : t.toast.coverRestored),
            })
          }
          onEdit={() => setForm({ existing: detailApp })}
          onDelete={() => deleteApp.mutate(detailApp, { onSuccess: () => closeParam('app') })}
          deleting={deleteApp.isPending}
        />
      )}

      {runApp && runApp.kind === 'integrated' && (
        <Workspace app={runApp} allowed={canLaunch(runApp)} onClose={() => closeParam('run')} />
      )}

      {form && (
        <Suspense fallback={null}>
          <AppForm
            existing={form.existing}
            categories={categories}
            modalities={modalities}
            onClose={() => setForm(null)}
            onSaved={(id) => {
              setForm(null);
              if (!form.existing) pushParam('app', id);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
