import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Short context shown next to the title (e.g. the body region). */
  context?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  /** Short content: a bottom sheet on phones instead of a full-screen page. */
  compact?: boolean;
  /** Actions pinned under the scrolling body — within thumb reach on phones. */
  footer?: ReactNode;
  children: ReactNode;
}

const SIZES = { md: 'sm:max-w-lg', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' } as const;

/**
 * Full-screen sheet on phones, centred panel from `sm` up. Escape and the backdrop close
 * it; focus moves in on open and returns to the trigger on close.
 */
export function Dialog({
  open,
  onClose,
  title,
  context,
  size = 'lg',
  compact = false,
  footer,
  children,
}: DialogProps) {
  const t = useT();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        'scrim fixed inset-0 z-50 flex animate-fade justify-center backdrop-blur-sm sm:items-center sm:p-6',
        compact ? 'items-end' : 'items-stretch',
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'flex w-full flex-col overflow-hidden border-ink-700 bg-ink-850 outline-none sm:max-h-[92vh] sm:animate-sheet-in sm:rounded-lg sm:border sm:shadow-2xl sm:shadow-black/40',
          SIZES[size],
          compact ? 'max-h-[88vh] animate-rise-in rounded-t-xl border-t' : 'animate-sheet-in',
        )}
      >
        {compact && (
          <span aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink-600 sm:hidden" />
        )}
        <header
          className={cn(
            'flex items-start justify-between gap-3 border-b border-ink-700 px-4 pb-3 sm:px-5 sm:pt-3',
            compact ? 'pt-2' : 'pt-[max(0.75rem,env(safe-area-inset-top))]',
          )}
        >
          <div className="min-w-0">
            {context && <p className="text-sm text-film-400">{context}</p>}
            <h2 id={titleId} className="text-lg font-semibold leading-snug text-film-50">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost -me-2 px-2"
            aria-label={t.common.close}
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div
          className={cn(
            'flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5',
            !footer && 'pb-[max(1rem,env(safe-area-inset-bottom))]',
          )}
        >
          {children}
        </div>
        {footer && (
          <div className="border-t border-ink-700 bg-ink-850 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
