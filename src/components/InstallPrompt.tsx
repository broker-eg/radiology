import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EllipsisVertical, Ellipsis, Share, SquarePlus, X, type LucideIcon } from 'lucide-react';
import { useT, type Messages } from '@/lib/i18n';
import {
  guideArrow,
  isHandheld,
  isInstallSnoozed,
  snoozeInstall,
  useInstallHelpRequests,
  useInstallState,
  type InstallGuide,
} from '@/lib/pwa';
import { toast } from '@/lib/toast';
import { tourShownThisSession, useTourActive } from '@/lib/tour';
import { cn } from '@/lib/utils';
import { AnnotationArrow, type Point } from './AnnotationArrow';

type Step = { icon?: LucideIcon; text: string };

function stepsFor(guide: InstallGuide, t: Messages['install']): Step[] | string {
  const add: Step = { icon: SquarePlus, text: t.stepAdd };
  const confirm: Step = { text: t.stepConfirm };
  switch (guide) {
    case 'ios-safari':
    case 'ipad-safari':
      return [{ icon: Share, text: t.stepShare }, add, confirm];
    case 'ios-safari-26':
      return [{ icon: Ellipsis, text: t.stepMoreShare }, add, confirm];
    case 'ios-chrome':
      return [{ icon: Share, text: t.stepChromeShare }, add, confirm];
    case 'ios-other':
      return [{ icon: Share, text: t.stepOtherShare }, add, confirm];
    case 'android':
      return [
        { icon: EllipsisVertical, text: t.stepAndroidMenu },
        { icon: SquarePlus, text: t.stepAndroidInstall },
      ];
    case 'mac-safari':
      return [{ icon: SquarePlus, text: t.stepMacSafari }];
    case 'in-app':
      return t.inApp;
  }
}

/** The app icon in gold viewport corners — the same frame as the installed icon. */
function IconFrame() {
  const corner = 'absolute h-3 w-3 border-caliper';
  return (
    <div className="relative grid h-14 w-14 shrink-0 place-items-center" aria-hidden>
      <span className={cn(corner, 'start-0 top-0 border-s-2 border-t-2')} />
      <span className={cn(corner, 'end-0 top-0 border-e-2 border-t-2')} />
      <span className={cn(corner, 'bottom-0 start-0 border-b-2 border-s-2')} />
      <span className={cn(corner, 'bottom-0 end-0 border-b-2 border-e-2')} />
      <img src="./icons/icon-192.png" alt="" className="h-10 w-10 rounded-[9px]" />
    </div>
  );
}

let autoShown = false;

/**
 * Suggests installing the suite — on the sign-in screen too, so people install before they
 * even have an account. Opens once per visit (unless "Not now" snoozed it), never over the
 * tour, and on request from any "Install app" button.
 */
export function InstallPrompt() {
  const t = useT();
  const state = useInstallState();
  const tourActive = useTourActive();
  const requests = useInstallHelpRequests();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const [arrow, setArrow] = useState<{ from: Point; to: Point; dir: 1 | -1 } | null>(null);

  const offerable = state.kind === 'prompt' || state.kind === 'manual';

  // Automatic suggestion: once per visit, after the page has settled. Android waits a little
  // longer for Chrome's one-tap prompt before falling back to the menu steps.
  useEffect(() => {
    if (autoShown || !offerable || isInstallSnoozed() || tourShownThisSession()) return;
    const delay = state.kind === 'manual' && state.guide === 'android' ? 3500 : 1400;
    const timer = setTimeout(() => {
      if (autoShown || isInstallSnoozed() || tourShownThisSession()) return;
      autoShown = true;
      setOpen(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [offerable, state]);

  const seenRequests = useRef(requests);
  useEffect(() => {
    if (requests === seenRequests.current) return;
    seenRequests.current = requests;
    autoShown = true;
    setOpen(true);
  }, [requests]);

  // Installed while open (native prompt accepted): close and say where it went.
  const wasOffered = useRef(offerable);
  useEffect(() => {
    if (state.kind === 'installed' && wasOffered.current) {
      setOpen(false);
      toast.info(t.install.installed);
    }
    wasOffered.current = offerable;
  }, [state.kind, offerable, t]);

  const close = useCallback(() => setOpen(false), []);
  const notNow = () => {
    snoozeInstall();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const guide = state.kind === 'manual' ? state.guide : null;
  const handheld = state.kind === 'manual' ? isHandheld(guide) : window.innerWidth < 640;
  const edge = guide ? guideArrow(guide) : null;
  const edgeY = edge?.edge;
  const edgeX = edge?.side;
  const visible = open && offerable && !tourActive;

  // The arrow runs from the card to the browser control at the screen edge.
  useLayoutEffect(() => {
    if (!visible || !edgeY || !edgeX) {
      setArrow(null);
      return;
    }
    const place = () => {
      const card = cardRef.current?.getBoundingClientRect();
      if (!card) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const x = edgeX === 'center' ? w / 2 : edgeX === 'right' ? w - 28 : 28;
      const fromX = Math.min(Math.max(x, card.left + 32), card.right - 32);
      setArrow(
        edgeY === 'bottom'
          ? { from: { x: fromX, y: card.bottom + 8 }, to: { x, y: h - 10 }, dir: 1 }
          : { from: { x: fromX, y: card.top - 8 }, to: { x, y: 10 }, dir: -1 },
      );
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [visible, edgeY, edgeX]);

  if (!visible) return null;

  const steps = guide ? stepsFor(guide, t.install) : null;

  return createPortal(
    <div className="fixed inset-0 z-[70]" style={{ pointerEvents: handheld ? 'auto' : 'none' }}>
      {handheld && (
        <div className="absolute inset-0 animate-fade bg-scrim/50" onClick={close} aria-hidden />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal={handheld}
        aria-labelledby={titleId}
        className={cn(
          'pointer-events-auto absolute border-ink-600 bg-ink-850 shadow-2xl shadow-black/50',
          handheld
            ? cn(
                'inset-x-3 mx-auto max-w-md rounded-xl border',
                edge?.edge === 'top'
                  ? 'top-[calc(env(safe-area-inset-top)+4.5rem)] animate-sheet-in'
                  : edge
                    ? 'bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] animate-sheet-in'
                    : 'bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] animate-rise-in',
              )
            : 'bottom-5 end-5 w-[22rem] animate-sheet-in rounded-lg border',
        )}
      >
        <div className="flex items-start gap-3.5 p-4 pb-0">
          <IconFrame />
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="font-semibold leading-snug text-film-50">
              {handheld ? t.install.titlePhone : t.install.titleDesktop}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-film-400">{t.install.reason}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="btn-ghost -me-2 -mt-1.5 px-2"
            aria-label={t.common.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {typeof steps === 'string' ? (
          <p className="mx-4 mt-4 rounded-md border border-caliper/40 bg-caliper/5 px-3 py-2.5 text-sm text-film-100">
            {steps}
          </p>
        ) : steps ? (
          <ol className="mx-4 mt-4 divide-y divide-ink-700 rounded-md border border-ink-700">
            {steps.map(({ icon: Icon, text }, i) => (
              <li key={text} className="flex items-center gap-3 px-3 py-2.5 text-sm text-film-100">
                <span className="w-4 shrink-0 text-center text-annot font-semibold tabular-nums text-localizer">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">{text}</span>
                {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-film-400" aria-hidden />}
              </li>
            ))}
          </ol>
        ) : null}

        <div className="flex items-center justify-end gap-2 p-4">
          <button type="button" className="btn-ghost" onClick={notNow}>
            {t.install.notNow}
          </button>
          {state.kind === 'prompt' && (
            <button
              type="button"
              className="btn-primary min-w-[6.5rem]"
              onClick={() => void state.install().then((ok) => ok || close())}
            >
              {t.install.install}
            </button>
          )}
        </div>
      </div>

      {arrow && (
        <svg
          className="scheme-dark pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <g className="animate-nudge" style={{ ['--nudge-y' as string]: `${arrow.dir * 7}px` }}>
            <AnnotationArrow from={arrow.from} to={arrow.to} />
          </g>
        </svg>
      )}
    </div>,
    document.body,
  );
}
