import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { CircleHelp, HardDriveDownload } from 'lucide-react';
import portraitUrl from '@/assets/branding/portrait.webp';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { OfflineBanner } from '@/features/offline/components/OfflineBits';
import { useOfflineMap } from '@/features/offline/hooks/useOffline';
import { useT } from '@/lib/i18n';
import { openTour } from '@/lib/tour';
import { cn } from '@/lib/utils';
import { AccountMenu } from './AccountMenu';
import { InstallButton } from './InstallButton';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-2.5 py-1.5 text-sm transition-colors',
    isActive ? 'text-film-50' : 'text-film-400 hover:text-film-100',
  );

interface SiteHeaderProps {
  /** A compact search field; shown once the page's own search has scrolled away. */
  search?: ReactNode;
  showSearch?: boolean;
}

export function SiteHeader({ search, showSearch = false }: SiteHeaderProps) {
  const t = useT();
  const { profile, isAdmin, hasPro } = useProfile();
  const { data: saved } = useOfflineMap();
  const savedCount = saved?.size ?? 0;
  const searching = !!search && showSearch;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <NavLink
          to="/"
          className={cn('flex min-w-0 items-center gap-2.5', searching && 'max-sm:hidden')}
        >
          <img
            src={portraitUrl}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-sm object-cover object-top ring-1 ring-caliper/40"
          />
          <span className="min-w-0 leading-tight">
            <span className="type-condensed block truncate text-lg font-semibold text-film-50">
              <span className="sm:hidden">{t.brand.short}</span>
              <span className="hidden sm:inline">{t.brand.name}</span>
            </span>
            <span
              className="hidden truncate font-serif text-sm italic text-caliper sm:block"
              dir="ltr"
            >
              Dr. Yasser Shalaby, MD
            </span>
          </span>
        </NavLink>

        <nav className="ms-4 hidden items-center gap-1 md:flex" aria-label="Main">
          <NavLink to="/" end className={navClass}>
            {t.header.generators}
          </NavLink>
          <NavLink to="/offline" className={navClass}>
            {t.header.offline}
            {savedCount > 0 && (
              <span className="ms-1.5 tabular-nums text-film-500">{savedCount}</span>
            )}
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navClass}>
              {t.header.users}
            </NavLink>
          )}
        </nav>

        {search && (
          <div
            className={cn(
              'min-w-0 flex-1 transition-opacity duration-200 md:mx-auto md:max-w-md',
              searching ? 'opacity-100' : 'pointer-events-none opacity-0 max-sm:hidden',
            )}
            aria-hidden={!searching}
          >
            {search}
          </div>
        )}

        <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <InstallButton className="hidden lg:inline-flex" />
          {/* Phones/tablets: the nav is hidden, so the offline library gets its own button. */}
          <NavLink
            to="/offline"
            className={({ isActive }) =>
              cn(
                'btn-ghost relative px-2.5 md:hidden',
                isActive && 'text-film-50',
                searching && 'max-sm:hidden',
              )
            }
            aria-label={t.header.offlineLibrary}
            title={t.header.offlineLibrary}
          >
            <HardDriveDownload className="h-[18px] w-[18px]" />
            {savedCount > 0 && (
              <span
                aria-hidden
                className="absolute end-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-localizer px-1 text-[11px] font-semibold tabular-nums leading-none text-ink-950"
              >
                {savedCount}
              </span>
            )}
          </NavLink>
          <button
            type="button"
            data-tour="help"
            className="btn-ghost px-2.5"
            onClick={openTour}
            aria-label={t.header.help}
            title={t.header.help}
          >
            <CircleHelp className="h-[18px] w-[18px]" />
          </button>
          {profile && (
            <span
              data-tour="plan"
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[13px] font-medium',
                hasPro ? 'border-caliper/50 text-caliper' : 'border-ink-600 text-film-300',
                searching && 'max-sm:hidden',
              )}
              title={isAdmin ? t.header.adminHint : undefined}
            >
              {isAdmin
                ? t.header.planAdmin
                : profile.plan === 'pro'
                  ? t.header.planPro
                  : t.header.planFree}
            </span>
          )}
          <AccountMenu />
        </div>
      </div>
      <OfflineBanner />
    </header>
  );
}
