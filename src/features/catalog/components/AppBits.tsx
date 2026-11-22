import { ExternalLink, Lock, Play, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SuiteApp } from '@/types/domain';

/** Bottom-right corner annotation: which plan the generator belongs to. */
export function TierAnnotation({ app, locked }: { app: SuiteApp; locked: boolean }) {
  return app.tier === 'pro' ? (
    <p className="annot inline-flex items-center gap-1 font-semibold text-caliper">
      {locked && <Lock className="h-3 w-3" aria-hidden />}
      Pro
    </p>
  ) : (
    <p className="annot">Free</p>
  );
}

export function FavoriteButton({
  active,
  onToggle,
  className,
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      className={cn(
        'rounded-full p-1.5 transition-colors hover:bg-ink-950/60',
        active ? 'text-caliper' : 'text-film-100/80 hover:text-film-50',
        className,
      )}
    >
      <Star className={cn('h-4 w-4 drop-shadow', active && 'fill-caliper')} />
    </button>
  );
}

/** The primary action, named for what actually happens. */
export function LaunchButton({
  app,
  locked,
  onLaunch,
  onLocked,
  className,
}: {
  app: SuiteApp;
  locked: boolean;
  onLaunch: () => void;
  onLocked: () => void;
  className?: string;
}) {
  if (locked) {
    return (
      <button
        type="button"
        onClick={onLocked}
        className={cn('btn border border-caliper/40 text-caliper hover:bg-caliper/10', className)}
      >
        <Lock className="h-3.5 w-3.5" aria-hidden />
        Pro only
      </button>
    );
  }
  if (app.kind === 'external') {
    return (
      <a
        href={app.externalUrl ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('btn-quiet', className)}
      >
        Open in AWS Quick
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    );
  }
  return (
    <button type="button" onClick={onLaunch} className={cn('btn-primary', className)}>
      <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
      Launch
    </button>
  );
}
