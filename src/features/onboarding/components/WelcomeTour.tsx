import { useEffect, useState, type ReactNode } from 'react';
import { Download, FileText, KeyRound, Search, Star, type LucideIcon } from 'lucide-react';
import { Dialog } from '@/components/Dialog';
import { useMarkOnboarded, useProfile } from '@/features/auth/hooks/useProfile';
import { useApps } from '@/features/catalog/hooks/useCatalog';
import { useInstallState } from '@/lib/pwa';
import { useTourRequests } from '@/lib/tour';
import { cn } from '@/lib/utils';

interface Step {
  title: string;
  icon: LucideIcon;
  body: ReactNode;
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-ink-600 bg-ink-950 px-1.5 py-px font-sans text-[13px] text-film-50">
      {children}
    </kbd>
  );
}

/** The step icon, framed by gold viewport corners like the app icon. */
function IconFrame({ icon: Icon }: { icon: LucideIcon }) {
  const corner = 'absolute h-2.5 w-2.5 border-caliper';
  return (
    <div className="relative grid h-12 w-12 shrink-0 place-items-center text-localizer" aria-hidden>
      <span className={cn(corner, 'left-0 top-0 border-l-2 border-t-2')} />
      <span className={cn(corner, 'right-0 top-0 border-r-2 border-t-2')} />
      <span className={cn(corner, 'bottom-0 left-0 border-b-2 border-l-2')} />
      <span className={cn(corner, 'bottom-0 right-0 border-b-2 border-r-2')} />
      <Icon className="h-6 w-6" />
    </div>
  );
}

/**
 * Four-step welcome tour. Opens by itself the first time an account signs in (remembered in
 * profiles.onboarded_at, so it follows the user across devices) and from the header's "?".
 */
export function WelcomeTour() {
  const { profile, isAdmin, hasPro } = useProfile();
  const apps = useApps();
  const install = useInstallState();
  const markOnboarded = useMarkOnboarded();
  const requests = useTourRequests();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const firstVisit = !!profile && profile.onboardedAt === null;
  useEffect(() => {
    if (firstVisit) {
      setStep(0);
      setOpen(true);
    }
  }, [firstVisit]);
  useEffect(() => {
    if (requests > 0) {
      setStep(0);
      setOpen(true);
    }
  }, [requests]);

  const close = () => {
    setOpen(false);
    if (firstVisit) markOnboarded.mutate();
  };

  const total = apps.data?.length ?? 0;
  const unlocked = apps.data?.filter((a) => hasPro || a.tier === 'free').length ?? 0;
  const name = profile?.fullName?.trim();

  const steps: Step[] = [
    {
      title: 'Find a generator',
      icon: Search,
      body: (
        <>
          <p className="text-film-100">
            {name ? `Welcome, ${name}.` : 'Welcome.'} The suite holds {total || 'dozens of'}{' '}
            structured report generators. Here’s how it works.
          </p>
          <p>
            Search by exam, organ or scoring system — try <Kbd>LI-RADS</Kbd> or <Kbd>MRCP</Kbd>. On
            a computer, press <Kbd>/</Kbd> to jump to the search box.
          </p>
          <p>Narrow the list by body region, modality or where it runs.</p>
        </>
      ),
    },
    {
      title: 'Write the report',
      icon: FileText,
      body: (
        <>
          <p>
            <strong className="text-film-50">Launch</strong> opens the generator inside the suite.
            Choose the findings and the impression is written for you.
          </p>
          <p>
            Copy, print or export to Word from inside the generator.{' '}
            <strong className="text-film-50">New tab</strong> keeps it open next to your viewer.
          </p>
        </>
      ),
    },
    isAdmin
      ? {
          title: 'You’re the admin',
          icon: KeyRound,
          body: (
            <>
              <p>You can open all {total} generators.</p>
              <p>
                Add or edit generators with <strong className="text-film-50">Add generator</strong>,
                and move people between Free and Pro under{' '}
                <strong className="text-film-50">Users</strong>.
              </p>
            </>
          ),
        }
      : hasPro
        ? {
            title: 'Your plan: Pro',
            icon: KeyRound,
            body: <p>All {total} generators are open to you.</p>,
          }
        : {
            title: 'Your plan: Free',
            icon: KeyRound,
            body: (
              <>
                <p>
                  {unlocked} of {total} generators are open to you.
                </p>
                <p>
                  The ones marked <span className="font-semibold text-caliper">Pro</span> need a Pro
                  account. Ask the suite administrator to upgrade you.
                </p>
              </>
            ),
          },
    {
      title: 'Keep it close',
      icon: Star,
      body: (
        <>
          <p>
            Tap the star on a generator to save it to your favorites, then turn on{' '}
            <strong className="text-film-50">Favorites only</strong> to see just those.
          </p>
          {install.kind === 'prompt' && (
            <div>
              <p>Install the suite as an app for one-tap access:</p>
              <button
                type="button"
                className="btn-quiet mt-2"
                onClick={() => void install.install()}
              >
                <Download className="h-4 w-4" aria-hidden />
                Install app
              </button>
            </div>
          )}
          {install.kind === 'ios' && (
            <p>
              To install it on iPhone or iPad: in Safari, tap{' '}
              <strong className="text-film-50">Share</strong>, then{' '}
              <strong className="text-film-50">Add to Home Screen</strong>.
            </p>
          )}
          {install.kind === 'unavailable' && <p>Bookmark this page to get back quickly.</p>}
        </>
      ),
    },
  ];

  const current = steps[step] ?? steps[0];
  if (!current) return null;
  const last = step === steps.length - 1;

  return (
    <Dialog
      open={open}
      onClose={close}
      title={current.title}
      context={`Step ${step + 1} of ${steps.length}`}
      size="md"
      compact
    >
      <div className="flex gap-4">
        <IconFrame icon={current.icon} />
        <div className="min-w-0 space-y-3 leading-relaxed text-film-300">{current.body}</div>
      </div>

      <div className="mt-6 flex gap-1.5" aria-hidden>
        {steps.map((s, i) => (
          <span
            key={s.title}
            className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-localizer' : 'bg-ink-700')}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2">
        {!last && (
          <button type="button" className="btn-ghost -ml-3" onClick={close}>
            Skip
          </button>
        )}
        <div className="ml-auto flex gap-2">
          {step > 0 && (
            <button type="button" className="btn-quiet" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => (last ? close() : setStep(step + 1))}
          >
            {last ? 'Start reporting' : 'Next'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
