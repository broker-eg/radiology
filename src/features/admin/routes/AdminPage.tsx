import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useT } from '@/lib/i18n';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import type { AdminUser, Plan } from '@/types/domain';
import { useAdminUsers, useSetPlan, useSetRole } from '../hooks/useAdmin';

type PlanFilter = 'all' | Plan;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function AdminPage() {
  const t = useT();
  const { userId } = useProfile();
  const usersQ = useAdminUsers();
  const setPlan = useSetPlan();
  const setRole = useSetRole();
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');

  const users = useMemo(() => usersQ.data ?? [], [usersQ.data]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: users.length,
      pro: users.filter((u) => u.plan === 'pro').length,
      free: users.filter((u) => u.plan === 'free').length,
      admins: users.filter((u) => u.role === 'admin').length,
      newThisWeek: users.filter((u) => now - new Date(u.createdAt).getTime() < WEEK_MS).length,
      activeThisWeek: users.filter(
        (u) => u.lastSignInAt && now - new Date(u.lastSignInAt).getTime() < WEEK_MS,
      ).length,
    };
  }, [users]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (planFilter === 'all' || u.plan === planFilter) &&
        (!q || u.email.toLowerCase().includes(q) || (u.fullName ?? '').toLowerCase().includes(q)),
    );
  }, [users, query, planFilter]);

  const busyUser = (u: AdminUser) =>
    (setPlan.isPending && setPlan.variables?.user.id === u.id) ||
    (setRole.isPending && setRole.variables?.user.id === u.id);

  const figures: [string, number, boolean?][] = [
    [t.admin.accounts, stats.total],
    [t.common.pro, stats.pro, true],
    [t.common.free, stats.free],
    [t.admin.admins, stats.admins],
    [t.admin.joinedWeek, stats.newThisWeek],
    [t.admin.activeWeek, stats.activeThisWeek],
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-[1200px] px-4 pb-[max(4rem,env(safe-area-inset-bottom))] pt-8 sm:px-6">
        <h1 className="type-condensed text-4xl font-semibold text-film-50">{t.admin.title}</h1>
        <p className="mt-2 max-w-prose text-film-400">{t.admin.lead}</p>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-ink-700 bg-ink-700 sm:grid-cols-3 lg:grid-cols-6">
          {figures.map(([label, value, gold]) => (
            <div key={label} className="bg-ink-900 px-4 py-3">
              <dt className="text-sm text-film-500">{label}</dt>
              <dd
                className={cn(
                  'mt-0.5 text-3xl font-semibold tabular-nums',
                  gold ? 'text-caliper' : 'text-film-50',
                )}
              >
                {usersQ.isLoading ? '–' : value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-film-500"
              aria-hidden
            />
            <label htmlFor="user-search" className="sr-only">
              {t.admin.searchLabel}
            </label>
            <input
              id="user-search"
              type="search"
              className="field ps-9"
              placeholder={t.admin.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="segmented" role="group" aria-label={t.admin.planGroup}>
            {(['all', 'free', 'pro'] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={planFilter === p}
                onClick={() => setPlanFilter(p)}
                className="segment px-3 py-1.5 text-sm"
              >
                {p === 'all' ? t.admin.allPlans : p === 'pro' ? t.common.pro : t.common.free}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          {usersQ.isLoading ? (
            <p className="py-10 text-center text-film-400">{t.admin.loading}</p>
          ) : usersQ.isError ? (
            <div className="rounded-md border border-alert/40 p-6 text-center">
              <p className="text-film-100">{t.admin.loadError}</p>
              <button
                type="button"
                className="btn-quiet mt-3"
                onClick={() => void usersQ.refetch()}
              >
                {t.common.tryAgain}
              </button>
            </div>
          ) : visible.length === 0 ? (
            <p className="rounded-md border border-dashed border-ink-600 py-10 text-center text-film-400">
              {t.admin.noMatch(query)}
            </p>
          ) : (
            <ul className="divide-y divide-ink-700 rounded-md border border-ink-700">
              {visible.map((u) => {
                const isSelf = u.id === userId;
                const busy = busyUser(u);
                return (
                  <li
                    key={u.id}
                    className={cn(
                      'grid gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1.5fr)_11rem] md:items-center md:gap-5',
                      busy && 'opacity-60',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-film-50">
                        {u.fullName ?? u.email}
                        {isSelf && (
                          <span className="ms-2 text-sm font-normal text-film-500">
                            {t.admin.you}
                          </span>
                        )}
                      </p>
                      {u.fullName && (
                        <p className="truncate text-sm text-film-400" dir="ltr">
                          {u.email}
                        </p>
                      )}
                    </div>

                    <div
                      className="inline-flex w-fit rounded-md border border-ink-600 p-0.5"
                      role="group"
                      aria-label={t.admin.planFor(u.email)}
                    >
                      {(['free', 'pro'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          disabled={busy}
                          aria-pressed={u.plan === p}
                          onClick={() => u.plan !== p && setPlan.mutate({ user: u, plan: p })}
                          className={cn(
                            'rounded px-3 py-1 text-sm transition-colors',
                            u.plan === p
                              ? p === 'pro'
                                ? 'bg-caliper font-semibold text-ink-950'
                                : 'bg-ink-700 text-film-50'
                              : 'text-film-400 hover:text-film-100',
                          )}
                        >
                          {p === 'pro' ? t.common.pro : t.common.free}
                        </button>
                      ))}
                    </div>

                    <dl className="grid grid-cols-[1fr_1.7fr_0.8fr] gap-3 text-sm [&_dd]:whitespace-nowrap">
                      <div>
                        <dt className="text-film-500">{t.admin.joined}</dt>
                        <dd className="text-film-300">{formatDate(u.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-film-500">{t.admin.lastSignIn}</dt>
                        <dd className="text-film-300">{formatDateTime(u.lastSignInAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-film-500">{t.admin.favorites}</dt>
                        <dd className="tabular-nums text-film-300">{u.favoritesCount}</dd>
                      </div>
                    </dl>

                    <div className="flex items-center gap-2 md:justify-end">
                      {u.role === 'admin' && (
                        <span className="text-sm font-medium text-localizer">{t.common.admin}</span>
                      )}
                      <button
                        type="button"
                        className="btn-ghost px-2.5 text-sm"
                        disabled={isSelf || busy}
                        title={isSelf ? t.admin.cantChangeOwnRole : undefined}
                        onClick={() =>
                          setRole.mutate({ user: u, role: u.role === 'admin' ? 'user' : 'admin' })
                        }
                      >
                        {u.role === 'admin' ? t.admin.removeAdmin : t.admin.makeAdmin}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
