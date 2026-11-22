import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { AnnotationArrow, type Point } from '@/components/AnnotationArrow';
import { useMarkOnboarded, useProfile } from '@/features/auth/hooks/useProfile';
import { useApps } from '@/features/catalog/hooks/useCatalog';
import { useLang, useT } from '@/lib/i18n';
import { startInstall, useInstallState } from '@/lib/pwa';
import { setTourActive, useTourRequests } from '@/lib/tour';
import { cn } from '@/lib/utils';

interface StepDef {
  key: string;
  /** data-tour anchors, in order of preference; the first one visible on screen is used. */
  targets: string[];
  /** Lives in the header: scroll home first so the header shows its full set of controls. */
  top?: boolean;
  title: string;
  body: ReactNode;
  action?: { label: string; run: () => void };
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const PAD = 6; // ROI breathing room around the target
const GAP = 58; // room for the arrow between ROI and card
const MARGIN = 16;

function findTarget(targets: string[]): HTMLElement | null {
  for (const name of targets) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
  }
  return null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Card position + arrow for a target box, given the card's measured size. */
function layout(roi: Box, card: { w: number; h: number }, vw: number, vh: number) {
  const cx = (roi.left + roi.right) / 2;
  const cy = (roi.top + roi.bottom) / 2;
  const below = vh - roi.bottom;
  const above = roi.top;
  const fitsV = (space: number) => space >= card.h + GAP + MARGIN;
  const fitsH = (space: number) => vw >= 768 && space >= card.w + GAP + MARGIN;

  let left: number;
  let top: number;
  let from: Point | null = null;
  let to: Point | null = null;
  // Lean the arrow slightly toward the card's middle, as a hand-placed annotation would.
  const lean = (target: number, cardMid: number, lo: number, hi: number) =>
    clamp(target + (cardMid - target) * 0.35, lo + 28, hi - 28);

  if (fitsV(below) || fitsV(above)) {
    const isBelow = fitsV(below) && (below >= above || !fitsV(above));
    left = clamp(cx - card.w / 2, MARGIN, vw - MARGIN - card.w);
    top = isBelow ? roi.bottom + GAP : roi.top - GAP - card.h;
    const fx = lean(cx, left + card.w / 2, left, left + card.w);
    from = { x: fx, y: isBelow ? top - 4 : top + card.h + 4 };
    to = { x: clamp(fx, roi.left + 12, roi.right - 12), y: isBelow ? roi.bottom + 5 : roi.top - 5 };
  } else if (fitsH(vw - roi.right) || fitsH(roi.left)) {
    const isEnd = fitsH(vw - roi.right);
    left = isEnd ? roi.right + GAP : roi.left - GAP - card.w;
    top = clamp(cy - card.h / 2, MARGIN + 56, vh - MARGIN - card.h);
    const fy = lean(cy, top + card.h / 2, top, top + card.h);
    from = { x: isEnd ? left - 4 : left + card.w + 4, y: fy };
    to = { x: isEnd ? roi.right + 5 : roi.left - 5, y: clamp(fy, roi.top + 12, roi.bottom - 12) };
  } else {
    // No room beside the target (a tall target on a phone): pin the card to the far edge.
    left = clamp(cx - card.w / 2, MARGIN, vw - MARGIN - card.w);
    top = below >= above ? vh - MARGIN - card.h : MARGIN + 56;
  }
  return { left, top, from, to };
}

/**
 * The tour, drawn the way a radiologist marks a study: the thing to look at gets an ROI with
 * corner brackets and an arrow annotation from the note that explains it. Opens by itself on
 * an account's first visit (remembered in profiles.onboarded_at, so it follows the person
 * across devices) and from the header's "?".
 */
export function CoachTour() {
  const t = useT();
  const lang = useLang();
  const { profile, isAdmin, hasPro } = useProfile();
  const apps = useApps();
  const install = useInstallState();
  const markOnboarded = useMarkOnboarded();
  const requests = useTourRequests();
  const location = useLocation();
  const navigate = useNavigate();
  const titleId = useId();
  const bodyId = useId();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [keys, setKeys] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [roi, setRoi] = useState<Box | null>(null);
  const [cardSize, setCardSize] = useState({ w: 340, h: 220 });
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const directionRef = useRef<1 | -1>(1);

  const firstVisit = !!profile && profile.onboardedAt === null;
  const onHome = location.pathname === '/';
  const busyUrl = /[?&](run|app)=/.test(location.search);
  const ready = onHome && apps.isSuccess && !busyUrl;
  const total = apps.data?.length ?? 0;
  const unlocked = apps.data?.filter((a) => hasPro || a.tier === 'free').length ?? 0;
  const desktop = viewport.w >= 1024;
  const installable = install.kind === 'prompt' || install.kind === 'manual';

  // Stable callbacks: the mutation object and first-visit flag change identity per render.
  const markRef = useRef(markOnboarded.mutate);
  markRef.current = markOnboarded.mutate;
  const firstVisitRef = useRef(firstVisit);
  firstVisitRef.current = firstVisit;
  const close = useCallback(() => {
    setOpen(false);
    setRoi(null);
    if (firstVisitRef.current) markRef.current();
  }, []);

  const steps: StepDef[] = useMemo(() => {
    const name = profile?.fullName?.trim() || null;
    const list: (StepDef | false)[] = [
      {
        key: 'search',
        targets: ['search'],
        title: t.tour.searchTitle,
        body: (
          <>
            <p className="text-film-100">{t.tour.welcome(name)}</p>
            <p>{t.tour.searchBody}</p>
            {desktop && <p>{t.tour.searchKeyHint}</p>}
          </>
        ),
      },
      {
        key: 'browse',
        targets: ['browse'],
        title: t.tour.browseTitle,
        body: <p>{desktop ? t.tour.browseBodyDesktop : t.tour.browseBody}</p>,
      },
      { key: 'tile', targets: ['tile'], title: t.tour.tileTitle, body: <p>{t.tour.tileBody}</p> },
      isAdmin
        ? {
            key: 'plan',
            targets: ['plan', 'menu'],
            top: true,
            title: t.tour.planAdminTitle,
            body: <p>{t.tour.planAdminBody(total)}</p>,
          }
        : hasPro
          ? {
              key: 'plan',
              targets: ['plan', 'menu'],
              top: true,
              title: t.tour.planProTitle,
              body: <p>{t.tour.planProBody(total)}</p>,
            }
          : {
              key: 'plan',
              targets: ['plan', 'menu'],
              top: true,
              title: t.tour.planFreeTitle,
              body: <p>{t.tour.planFreeBody(unlocked, total)}</p>,
            },
      isAdmin && {
        key: 'add',
        targets: ['add'],
        title: t.tour.addTitle,
        body: <p>{t.tour.addBody}</p>,
      },
      installable && {
        key: 'install',
        targets: ['install', 'menu'],
        top: true,
        title: t.tour.installTitle,
        body: <p>{t.tour.installBody}</p>,
        action: {
          label: t.tour.installAction,
          run: () => {
            close();
            startInstall(install);
          },
        },
      },
      {
        key: 'help',
        targets: ['help'],
        top: true,
        title: t.tour.helpTitle,
        body: <p>{t.tour.helpBody}</p>,
      },
    ];
    return list.filter((s): s is StepDef => !!s);
  }, [
    t,
    profile?.fullName,
    desktop,
    isAdmin,
    hasPro,
    total,
    unlocked,
    installable,
    install,
    close,
  ]);

  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const start = useCallback(() => {
    // Only steps whose target is on this screen right now (e.g. no Install once installed).
    const available = stepsRef.current.filter((s) => findTarget(s.targets)).map((s) => s.key);
    if (!available.length) return;
    directionRef.current = 1;
    setKeys(available);
    setIndex(0);
    setOpen(true);
  }, []);

  // First visit: once the catalog is on screen. "?" from anywhere: go home, then start.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!firstVisit || !ready || autoStarted.current) return;
    autoStarted.current = true;
    const timer = setTimeout(start, 700);
    return () => clearTimeout(timer);
  }, [firstVisit, ready, start]);

  const seenRequests = useRef(requests);
  useEffect(() => {
    if (requests === seenRequests.current) return;
    seenRequests.current = requests;
    if (!onHome || busyUrl) navigate('/');
    setPending(true);
  }, [requests, onHome, busyUrl, navigate]);
  useEffect(() => {
    if (!pending || !ready) return;
    setPending(false);
    const timer = setTimeout(start, 120);
    return () => clearTimeout(timer);
  }, [pending, ready, start]);

  useEffect(() => {
    setTourActive(open);
  }, [open]);
  useEffect(() => () => setTourActive(false), []);

  const step = open ? steps.find((s) => s.key === keys[index]) : undefined;
  const stepKey = step?.key;
  const last = index === keys.length - 1;
  const go = useCallback(
    (delta: 1 | -1) => {
      directionRef.current = delta;
      if (delta === 1 && index >= keys.length - 1) close();
      else setIndex((i) => clamp(i + delta, 0, keys.length - 1));
    },
    [index, keys.length, close],
  );

  // Follow the target: scroll it into view, then track its box every frame while open
  // (sticky headers, smooth scrolling, rotation and late images all move things).
  useEffect(() => {
    const current = stepsRef.current.find((s) => s.key === stepKey);
    if (!open || !current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let timer = 0;
    let cancelled = false;
    let lastKey = '';

    const begin = () => {
      if (cancelled) return;
      const el = findTarget(current.targets);
      if (!el) {
        // Gone since the tour started (e.g. layout changed): skip in the direction of travel.
        const next = index + directionRef.current;
        if (next < 0 || next >= keys.length) close();
        else setIndex(next);
        return;
      }
      if (!el.closest('header')) {
        const r = el.getBoundingClientRect();
        el.scrollIntoView({
          block: r.height > window.innerHeight * 0.45 ? 'nearest' : 'center',
          inline: 'nearest',
          behavior: reduced ? 'auto' : 'smooth',
        });
      }
      track(el);
    };

    const track = (el: HTMLElement) => {
      const tick = () => {
        const r = el.getBoundingClientRect();
        const key = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)},${window.innerWidth},${window.innerHeight}`;
        if (key !== lastKey) {
          lastKey = key;
          // Kept inside the screen so the brackets stay visible on edge-hugging targets.
          setRoi({
            left: Math.max(2, r.left - PAD),
            top: Math.max(2, r.top - PAD),
            right: Math.min(window.innerWidth - 2, r.right + PAD),
            bottom: Math.min(window.innerHeight - 2, r.bottom + PAD),
          });
          setViewport({ w: window.innerWidth, h: window.innerHeight });
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    };

    if (current.top && window.scrollY > 0) {
      // Header targets: go home first, pick the target once the header has settled.
      setRoi(null);
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      timer = window.setTimeout(begin, reduced ? 80 : 520);
    } else begin();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [open, stepKey, index, keys.length, close]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setCardSize((s) =>
        Math.abs(s.w - width) > 1 || Math.abs(s.h - height) > 1 ? { w: width, h: height } : s,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, index, lang]);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus({ preventScroll: true });
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    const forward = lang === 'ar' ? 'ArrowLeft' : 'ArrowRight';
    const backward = lang === 'ar' ? 'ArrowRight' : 'ArrowLeft';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      } else if (e.key === forward) go(1);
      else if (e.key === backward && index > 0) go(-1);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, lang, go, index, close]);

  if (!open || !step) return null;

  const cardWidth = Math.min(352, viewport.w - MARGIN * 2);
  const placed = roi ? layout(roi, { w: cardWidth, h: cardSize.h }, viewport.w, viewport.h) : null;
  const roiStyle: CSSProperties | undefined = roi
    ? { left: roi.left, top: roi.top, width: roi.right - roi.left, height: roi.bottom - roi.top }
    : undefined;
  const bracket = 'absolute h-3.5 w-3.5 border-localizer';

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      {/* Blocks the page while the tour runs; the ROI's shadow is the dimming (plain scrim
          while moving between targets). */}
      <div className={cn('absolute inset-0', !roiStyle && 'scrim')} aria-hidden />

      {roiStyle && (
        <div
          aria-hidden
          className="scheme-dark pointer-events-none absolute rounded-[3px] shadow-[0_0_0_200vmax_rgb(var(--scrim)/var(--scrim-alpha))] outline outline-1 outline-localizer/30 transition-[left,top,width,height] duration-300 ease-out"
          style={roiStyle}
        >
          <span className={cn(bracket, '-start-px -top-px border-s-2 border-t-2')} />
          <span className={cn(bracket, '-end-px -top-px border-e-2 border-t-2')} />
          <span className={cn(bracket, '-bottom-px -start-px border-b-2 border-s-2')} />
          <span className={cn(bracket, '-bottom-px -end-px border-b-2 border-e-2')} />
        </div>
      )}

      {placed?.from && placed.to && (
        <svg
          key={`${step.key}-${index}`}
          aria-hidden
          className="scheme-dark pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <AnnotationArrow from={placed.from} to={placed.to} />
        </svg>
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="absolute rounded-lg border border-ink-600 bg-ink-850 p-4 shadow-2xl shadow-black/50 transition-[left,top] duration-300 ease-out"
        style={{
          width: cardWidth,
          left: placed?.left ?? (viewport.w - cardWidth) / 2,
          top: placed?.top ?? viewport.h - cardSize.h - MARGIN,
          visibility: placed ? 'visible' : 'hidden',
        }}
      >
        <div key={step.key} className="animate-fade">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={titleId} className="font-semibold leading-snug text-film-50">
              {step.title}
            </h2>
            <span
              className="shrink-0 text-annot tabular-nums text-film-500"
              aria-label={t.tour.label}
            >
              {t.tour.counter(index + 1, keys.length)}
            </span>
          </div>
          <div id={bodyId} className="mt-1.5 space-y-2 text-sm leading-relaxed text-film-300">
            {step.body}
          </div>
          {step.action && (
            <button type="button" className="btn-quiet mt-3" onClick={step.action.run}>
              <Download className="h-4 w-4" aria-hidden />
              {step.action.label}
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {!last && (
            <button type="button" className="btn-ghost -ms-3" onClick={close}>
              {t.tour.skip}
            </button>
          )}
          <div className="ms-auto flex gap-2">
            {index > 0 && (
              <button type="button" className="btn-quiet" onClick={() => go(-1)}>
                {t.common.back}
              </button>
            )}
            <button ref={primaryRef} type="button" className="btn-primary" onClick={() => go(1)}>
              {last ? t.tour.finish : t.common.next}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
