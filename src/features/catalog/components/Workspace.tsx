import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ExternalLink, Loader2, Lock, Maximize2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import type { SuiteApp } from '@/types/domain';
import { LockedGeneratorError } from '../api/catalogService';
import { useAppHtml } from '../hooks/useCatalog';
import { GENERATOR_ALLOW, GENERATOR_SANDBOX, openGeneratorTab } from '../lib/launch';
import { fetchAppHtmlForTab } from '../lib/tabLoader';

/** Full-screen live workspace: the generator runs sandboxed under a thin suite bar. */
export function Workspace({ app, onClose }: { app: SuiteApp; onClose: () => void }) {
  const html = useAppHtml(app, true);
  const frameWrap = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const openTab = () => {
    openGeneratorTab(app.name, () => fetchAppHtmlForTab(app)).catch((err: unknown) =>
      toast.error(err),
    );
  };

  const locked = html.error instanceof LockedGeneratorError;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-ink-950"
      role="dialog"
      aria-modal="true"
      aria-label={`${app.name} workspace`}
    >
      <header className="flex items-center gap-2 border-b border-ink-700 bg-ink-900 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-3">
        <button type="button" onClick={onClose} className="btn-ghost px-2.5">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to suite</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-film-50">{app.name}</p>
          <p className="hidden truncate text-[13px] text-film-500 sm:block">{app.category}</p>
        </div>
        <button
          type="button"
          onClick={() => void frameWrap.current?.requestFullscreen?.()}
          className="btn-ghost hidden px-2.5 sm:inline-flex"
          disabled={!html.data}
        >
          <Maximize2 className="h-4 w-4" />
          Full screen
        </button>
        <button type="button" onClick={openTab} className="btn-quiet px-2.5" disabled={!html.data}>
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">New tab</span>
        </button>
      </header>

      <div ref={frameWrap} className="relative flex-1 bg-white pb-[env(safe-area-inset-bottom)]">
        {html.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-ink-950 text-sm text-film-400">
            <Loader2 className="h-5 w-5 animate-spin text-localizer" />
            Loading generator
          </div>
        )}
        {html.isError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950 px-6 text-center">
            {locked && <Lock className="h-6 w-6 text-caliper" />}
            <p className="max-w-sm text-film-100">
              {locked
                ? 'This generator is part of the Pro plan. Ask your suite administrator to upgrade your account.'
                : 'The generator didn’t load. Check your connection and try again.'}
            </p>
            {!locked && (
              <button type="button" className="btn-quiet" onClick={() => void html.refetch()}>
                Try again
              </button>
            )}
          </div>
        )}
        {html.data && (
          <iframe
            title={app.name}
            srcDoc={html.data}
            sandbox={GENERATOR_SANDBOX}
            allow={GENERATOR_ALLOW}
            className="absolute inset-0 h-full w-full border-0"
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
