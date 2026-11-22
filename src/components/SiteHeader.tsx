import { NavLink } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import portraitUrl from '@/assets/branding/portrait.jpg';
import { useProfile, useSignOut } from '@/features/auth/hooks/useProfile';
import { cn } from '@/lib/utils';
import { InstallButton } from './InstallButton';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-2.5 py-1.5 text-sm transition-colors',
    isActive ? 'text-film-50' : 'text-film-400 hover:text-film-100',
  );

export function SiteHeader() {
  const { profile, email, isAdmin, hasPro } = useProfile();
  const signOut = useSignOut();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <NavLink to="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src={portraitUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-sm object-cover object-top ring-1 ring-caliper/40"
          />
          <span className="min-w-0 leading-tight">
            <span className="type-condensed block truncate text-lg font-semibold text-film-50">
              <span className="sm:hidden">Radiology Suite</span>
              <span className="hidden sm:inline">Radiology Reporting Suite</span>
            </span>
            <span className="hidden truncate font-serif text-sm italic text-caliper sm:block">
              Dr. Yasser Shalaby, MD
            </span>
          </span>
        </NavLink>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          <NavLink to="/" end className={navClass}>
            Generators
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navClass}>
              Users
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <InstallButton />
          {isAdmin && (
            <NavLink to="/admin" className="btn-ghost px-2.5 md:hidden" aria-label="Users">
              <ShieldCheck className="h-4 w-4" />
            </NavLink>
          )}
          {profile && (
            <span
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[13px] font-medium',
                hasPro ? 'border-caliper/50 text-caliper' : 'border-ink-600 text-film-300',
              )}
              title={isAdmin ? 'Admins can open every generator' : undefined}
            >
              {isAdmin ? 'Admin' : profile.plan === 'pro' ? 'Pro' : 'Free'}
            </span>
          )}
          <span className="hidden max-w-[180px] truncate text-sm text-film-400 lg:block">
            {email}
          </span>
          <button
            type="button"
            className="btn-ghost px-2.5"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
            <span className="sr-only sm:hidden">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
