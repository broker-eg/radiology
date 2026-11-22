import { useToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export function Toaster() {
  const current = useToast();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-end"
    >
      {current && (
        <div
          key={current.id}
          role={current.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto max-w-sm animate-sheet-in rounded-md border bg-ink-850 px-4 py-2.5 text-sm shadow-2xl shadow-black/60',
            current.tone === 'error'
              ? 'border-alert/50 text-film-50'
              : 'border-localizer/40 text-film-50',
          )}
        >
          {current.message}
        </div>
      )}
    </div>
  );
}
