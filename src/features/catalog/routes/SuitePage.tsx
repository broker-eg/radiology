import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, Plus, Rows3, SlidersHorizontal } from 'lucide-react';
import defaultHero from '@/assets/branding/hero.jpg';
import { SiteHeader } from '@/components/SiteHeader';
import { useProfile, useSetHeroApp } from '@/features/auth/hooks/useProfile';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { SuiteApp } from '@/types/domain';
import { AppDialog } from '../components/AppDialog';
import { AppForm } from '../components/AppForm';
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

const VIEW_KEY = 'radiology:view';
const VIEWS: { value: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'regions', label: 'By region', icon: Rows3 },
  { value: 'grid', label: 'Grid', icon: LayoutGrid },
  { value: 'worklist', label: 'Worklist', icon: List },
];

function readView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === 'grid' || v === 'worklist' ? v : 'regions';
  } catch {
    return 'regions';
  }
}

export function SuitePage() {
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [form, setForm] = useState<{ existing: SuiteApp | null } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
  };

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* per-device preference only */
    }
  }, [view]);

  // "/" jumps to search, as in the legacy suite.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement;
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

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

  const planLabel = isAdmin ? 'Admin access' : profile?.plan === 'pro' ? 'Pro plan' : 'Free plan';

  return (
    <div className="min-h-screen">
      <SiteHeader />

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

        <div className="mt-8 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10">
          {/* Desktop: a PACS-style series list of body regions + refinements. */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-8 overflow-y-auto pb-6 pr-1">
              <section aria-labelledby="regions-heading">
                <h2 id="regions-heading" className="mb-2 text-sm font-medium text-film-300">
                  Body regions
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
                <button type="button" className="btn-ghost -ml-3" onClick={resetFilters}>
                  Clear all filters
                </button>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            {/* Phones/tablets: regions scroll sideways; refinements fold away. */}
            <div className="lg:hidden">
              <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6">
                <button
                  type="button"
                  onClick={() => patch({ region: null })}
                  className={cn('chip shrink-0', !filters.region && 'chip-active')}
                >
                  All <span className="ml-1.5 tabular-nums text-film-500">{countAllRegions}</span>
                </button>
                {categories.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => patch({ region: filters.region === c.name ? null : c.name })}
                    className={cn('chip shrink-0', filters.region === c.name && 'chip-active')}
                  >
                    <span className="mr-1.5" aria-hidden>
                      {c.icon}
                    </span>
                    {c.name}
                    <span className="ml-1.5 tabular-nums text-film-500">
                      {regionCounts.get(c.name) ?? 0}
                    </span>
                  </button>
                ))}
              </div>
              {showMobileFilters && (
                <div className="mb-4 rounded-md border border-ink-700 bg-ink-850 p-4">
                  <RefineControls filters={filters} onChange={patch} showUnlockedToggle={!hasPro} />
                </div>
              )}
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-ink-700 pb-3">
              <p className="mr-auto text-sm text-film-400" aria-live="polite">
                <span className="font-semibold tabular-nums text-film-50">{filtered.length}</span>{' '}
                {filtered.length === 1 ? 'generator' : 'generators'}
                {filters.region && <> in {filters.region}</>}
                {isFiltered && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="ml-2 text-localizer hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </p>
              <button
                type="button"
                className="btn-quiet px-2.5 lg:hidden"
                onClick={() => setShowMobileFilters((v) => !v)}
                aria-expanded={showMobileFilters}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                Filters{activeRefinements > 0 && ` (${activeRefinements})`}
              </button>
              <label className="sr-only" htmlFor="sort">
                Sort
              </label>
              <select
                id="sort"
                value={filters.sort}
                onChange={(e) => patch({ sort: e.target.value as SortKey })}
                className="rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 text-sm text-film-100 focus:border-localizer focus:outline-none"
                disabled={tokens.length > 0}
                title={tokens.length > 0 ? 'Search results are sorted by relevance' : undefined}
              >
                <option value="recommended">Recommended order</option>
                <option value="az">Name A–Z</option>
                <option value="za">Name Z–A</option>
                <option value="integrated">In-suite first</option>
              </select>
              <div
                className="inline-flex rounded-md border border-ink-600 p-0.5"
                role="group"
                aria-label="View"
              >
                {VIEWS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={view === value}
                    onClick={() => setView(value)}
                    title={label}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded px-2 py-1 text-[13px] transition-colors',
                      view === value
                        ? 'bg-ink-700 text-film-50'
                        : 'text-film-400 hover:text-film-100',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    <span className="hidden xl:inline">{label}</span>
                    <span className="sr-only xl:hidden">{label}</span>
                  </button>
                ))}
              </div>
              {isAdmin && (
                <button
                  type="button"
                  className="btn-primary px-3"
                  onClick={() => setForm({ existing: null })}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Add generator</span>
                  <span className="sr-only sm:hidden">Add generator</span>
                </button>
              )}
            </div>

            {appsQ.isLoading || categoriesQ.isLoading ? (
              <div
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                aria-busy="true"
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[16/10] rounded-md bg-ink-800" />
                    <div className="mt-3 h-4 w-3/4 rounded bg-ink-800" />
                    <div className="mt-2 h-3 w-full rounded bg-ink-850" />
                  </div>
                ))}
              </div>
            ) : appsQ.isError ? (
              <div className="rounded-md border border-alert/40 p-6 text-center">
                <p className="text-film-100">
                  The catalog didn’t load. Check your connection and try again.
                </p>
                <button
                  type="button"
                  className="btn-quiet mt-3"
                  onClick={() => void appsQ.refetch()}
                >
                  Try again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-md border border-dashed border-ink-600 px-6 py-14 text-center">
                <p className="text-lg font-semibold text-film-50">
                  No generator matches these filters
                </p>
                <p className="mt-1 text-sm text-film-400">
                  Try a scoring system (LI-RADS), an organ (adrenal) or an exam (MRCP).
                </p>
                <button type="button" className="btn-primary mt-5" onClick={resetFilters}>
                  Show all generators
                </button>
              </div>
            ) : view === 'worklist' ? (
              <Worklist apps={filtered} tokens={tokens} actions={actions} />
            ) : view === 'grid' ? (
              <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
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
        Structured reporting suite{' '}
        <span className="font-serif italic text-caliper/80">edited by Dr. Yasser Shalaby, MD</span>
      </footer>

      {detailApp && (
        <AppDialog
          app={detailApp}
          locked={!canLaunch(detailApp)}
          isFavorite={favorites.has(detailApp.id)}
          isHero={profile?.heroAppId === detailApp.id}
          isAdmin={isAdmin}
          onClose={() => closeParam('app')}
          onLaunch={() => pushParam('run', detailApp.id)}
          onToggleFavorite={() => actions.onToggleFavorite(detailApp)}
          onSetHero={(id) =>
            setHero.mutate(id, {
              onSuccess: () => toast.info(id ? 'Home cover updated' : 'Default cover restored'),
            })
          }
          onEdit={() => setForm({ existing: detailApp })}
          onDelete={() => deleteApp.mutate(detailApp, { onSuccess: () => closeParam('app') })}
          deleting={deleteApp.isPending}
        />
      )}

      {runApp && runApp.kind === 'integrated' && (
        <Workspace app={runApp} onClose={() => closeParam('run')} />
      )}

      {form && (
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
      )}
    </div>
  );
}
