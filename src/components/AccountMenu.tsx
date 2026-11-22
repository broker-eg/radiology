import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useProfile, useSignOut } from '@/features/auth/hooks/useProfile';
import { useLang, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { InstallButton } from './InstallButton';
import { PreferenceControls } from './Preferences';

function initials(name: string | null | undefined, email: string): string {
  const source = name?.replace(/^dr\.?\s+/i, '').trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·';
}

/**
 * One home for the account and per-device settings: identity and plan, the Users portal
 * (phones), Install, language, theme, sign out. A bottom sheet on phones, a dropdown on
 * larger screens. Portalled: the header's backdrop blur would trap fixed children.
 */
export function AccountMenu() {
  const t = useT();
  const lang = useLang();
  const { profile, email, isAdmin, hasPro } = useProfile();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => setAnchor(triggerRef.current?.getBoundingClientRect() ?? null);
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target))
        setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const planLabel = isAdmin ? t.header.planAdmin : hasPro ? t.header.planPro : t.header.planFree;
  const desktopPos =
    anchor &&
    (lang === 'ar'
      ? { top: anchor.bottom + 8, left: Math.max(12, anchor.left) }
      : { top: anchor.bottom + 8, right: Math.max(12, window.innerWidth - anchor.right) });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-tour="menu"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={t.header.account}
        title={t.header.account}
        className={cn(
          'grid h-9 w-9 place-items-center rounded-md border text-[13px] font-semibold tracking-wide transition-colors touch:h-10 touch:w-10',
          open
            ? 'border-localizer text-localizer-300'
            : 'border-ink-600 text-film-100 hover:border-film-500',
        )}
      >
        {initials(profile?.fullName, email)}
      </button>

      {open &&
        createPortal(
          <>
            <div className="scrim fixed inset-0 z-[55] animate-fade sm:hidden" aria-hidden />
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label={t.header.account}
              tabIndex={-1}
              style={desktopPos ?? undefined}
              className={cn(
                'fixed z-[56] border-ink-600 bg-ink-850 shadow-2xl shadow-black/40 outline-none',
                // Phones: bottom sheet. sm+: dropdown under the trigger (inline style places it).
                'max-sm:!inset-x-0 max-sm:!bottom-0 max-sm:!left-0 max-sm:!right-0 max-sm:!top-auto max-sm:animate-rise-in max-sm:rounded-t-xl max-sm:border-t max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]',
                'sm:w-80 sm:animate-sheet-in sm:rounded-lg sm:border',
              )}
            >
              <span
                aria-hidden
                className="mx-auto mt-2 block h-1 w-10 rounded-full bg-ink-600 sm:hidden"
              />
              <div className="border-b border-ink-700 px-4 py-3.5">
                <p className="text-sm text-film-500">{t.header.signedInAs}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate font-semibold text-film-50">
                    {profile?.fullName || email}
                  </p>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-px text-[13px] font-medium',
                      hasPro ? 'border-caliper/50 text-caliper' : 'border-ink-600 text-film-300',
                    )}
                  >
                    {planLabel}
                  </span>
                </div>
                {profile?.fullName && (
                  <p className="truncate text-sm text-film-400" dir="ltr">
                    {email}
                  </p>
                )}
              </div>

              {/* Hidden when nothing in it shows (Users is phone-only; Install may be unavailable). */}
              <div className="space-y-1 border-b border-ink-700 p-2 [&:not(:has(a,button))]:hidden md:[&:not(:has(button))]:hidden">
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="btn-ghost w-full justify-start md:hidden"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    {t.header.users}
                  </Link>
                )}
                <div onClickCapture={() => setOpen(false)} className="empty:hidden">
                  <InstallButton className="w-full justify-start" />
                </div>
              </div>

              <PreferenceControls className="border-b border-ink-700 px-4 py-3.5" />

              <div className="p-2">
                <button
                  type="button"
                  className="btn-ghost w-full justify-start"
                  onClick={() => signOut.mutate()}
                  disabled={signOut.isPending}
                >
                  <LogOut className="flip-rtl h-4 w-4" aria-hidden />
                  {t.header.signOut}
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
